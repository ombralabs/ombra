/**
 * Zip-Slip / Tar-Slip safe tar and zip extractors; tar.xz requires xz on PATH.
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import type { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import zlib from "node:zlib";
import { ChecksumMismatchError, DownloadFailedError } from "./errors.js";

function isWithinRoot(targetPath: string, rootPath: string): boolean {
  const rel = path.relative(rootPath, targetPath);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

function assertSafeRelativeEntry(entryName: string, destDir: string): string {
  const normalized = entryName.replace(/\\/g, "/");
  if (!normalized || normalized.startsWith("/")) {
    throw new ChecksumMismatchError(`Archive entry has unsafe absolute path: '${entryName}'.`);
  }
  const parts = normalized.split("/").filter((p) => p.length > 0 && p !== ".");
  if (parts.includes("..")) {
    throw new ChecksumMismatchError(`Archive entry escapes destination directory: '${entryName}'.`);
  }
  const resolvedRoot = fs.realpathSync(destDir);
  const candidate = path.resolve(resolvedRoot, ...parts);
  if (!isWithinRoot(candidate, resolvedRoot)) {
    throw new ChecksumMismatchError(`Archive entry escapes destination directory: '${entryName}'.`);
  }
  return candidate;
}

function readNullTerminated(buf: Buffer, offset: number, length: number): string {
  const end = offset + length;
  let nul = offset;
  while (nul < end && buf[nul] !== 0) nul++;
  return buf.subarray(offset, nul).toString("utf8");
}

function parseTarOctal(buf: Buffer, offset: number, length: number): number {
  if ((buf[offset] & 0x80) !== 0) {
    // Base-256 GNU binary size encoding for files > 8 GiB
    let val = 0n;
    for (let i = 1; i < length; i++) {
      val = (val << 8n) | BigInt(buf[offset + i]);
    }
    return Number(val);
  }
  const str = readNullTerminated(buf, offset, length).trim();
  return str ? Number.parseInt(str, 8) : 0;
}

function parsePaxRecords(data: Buffer): Record<string, string> {
  const out: Record<string, string> = {};
  let idx = 0;
  const text = data.toString("utf8");
  while (idx < text.length) {
    const spaceIdx = text.indexOf(" ", idx);
    if (spaceIdx === -1) break;
    const len = Number.parseInt(text.slice(idx, spaceIdx), 10);
    if (!Number.isFinite(len) || len <= 0) break;
    const record = text.slice(spaceIdx + 1, idx + len - 1);
    const eq = record.indexOf("=");
    if (eq !== -1) {
      out[record.slice(0, eq)] = record.slice(eq + 1);
    }
    idx += len;
  }
  return out;
}

/** Safely extract a `.tar.gz` archive using streaming gunzip. */
export async function safeExtractTarGz(archivePath: string, destDir: string): Promise<void> {
  const src = fs.createReadStream(archivePath);
  const gunzip = zlib.createGunzip();
  const decoding = pipeline(src, gunzip);
  try {
    await Promise.all([decoding, extractTar(gunzip, destDir)]);
  } catch (err) {
    if (err instanceof ChecksumMismatchError || err instanceof DownloadFailedError) throw err;
    throw new DownloadFailedError(`Failed to extract tar.gz archive: ${String(err)}`, { cause: err });
  } finally {
    src.destroy();
    gunzip.destroy();
    await decoding.catch(() => {});
  }
}

/** Safely extract a `.tar.xz` archive using XZ Utils, without a shell. */
export async function safeExtractTarXz(archivePath: string, destDir: string): Promise<void> {
  const decoder = spawn("xz", ["-dc", "--", archivePath], { stdio: ["ignore", "pipe", "pipe"] });
  let stderr = "";
  let spawnError: Error | undefined;
  decoder.stderr.on("data", (chunk: Buffer) => { stderr = (stderr + chunk.toString("utf8")).slice(0, 8192); });
  decoder.on("error", (err) => { spawnError = err; });
  const decoding = new Promise<void>((resolve, reject) => {
    decoder.once("close", (code) => {
      if (spawnError) {
        reject(new DownloadFailedError("XZ extraction requires xz on PATH (install XZ Utils / xz-utils).", { cause: spawnError }));
      } else if (code !== 0) {
        reject(new DownloadFailedError(`xz failed to decode tar.xz archive (exit ${code}): ${stderr.trim()}`));
      } else {
        resolve();
      }
    });
  });
  try {
    await Promise.all([decoding, extractTar(decoder.stdout, destDir)]);
  } finally {
    decoder.stdout.destroy();
    decoder.stderr.destroy();
    if (decoder.exitCode === null && decoder.signalCode === null) decoder.kill();
    await decoding.catch(() => {});
  }
}

async function extractTar(stream: Readable, destDir: string): Promise<void> {
  fs.mkdirSync(destDir, { recursive: true });
  const resolvedRoot = fs.realpathSync(destDir);

  let pendingPax: Record<string, string> = {};
  let gnuLongName: string | null = null;
  let gnuLongLink: string | null = null;

  type State =
    | { kind: "header" }
    | {
        kind: "payload";
        typeFlag: string;
        entryName: string;
        linkName: string;
        mode: number;
        remaining: number;
        pad: number;
        fd: number | null;
        chunks: Buffer[];
      }
    | { kind: "padding"; pad: number };

  let state: State = { kind: "header" };
  let stash: Buffer = Buffer.alloc(0);
  const deferredSymlinks: Array<{ targetPath: string; linkTarget: string }> = [];

  function processStash(): void {
    while (true) {
      if (state.kind === "header") {
        if (stash.length < 512) return;
        const header = stash.subarray(0, 512);
        stash = stash.subarray(512);

        let allZero = true;
        for (let i = 0; i < 512; i++) {
          if (header[i] !== 0) {
            allZero = false;
            break;
          }
        }
        if (allZero) continue;

        const namePart = readNullTerminated(header, 0, 100);
        const mode = parseTarOctal(header, 100, 8);
        const sizeRaw = parseTarOctal(header, 124, 12);
        const typeByte = header[156];
        const typeFlag = typeByte === 0 ? "0" : String.fromCharCode(typeByte);
        const linkPart = readNullTerminated(header, 157, 100);
        const magic = readNullTerminated(header, 257, 6);
        const prefix = magic.startsWith("ustar") ? readNullTerminated(header, 345, 155) : "";

        let entryName = prefix ? `${prefix}/${namePart}` : namePart;
        let linkName = linkPart;
        let size = sizeRaw;

        if (gnuLongName !== null) {
          entryName = gnuLongName;
          gnuLongName = null;
        }
        if (gnuLongLink !== null) {
          linkName = gnuLongLink;
          gnuLongLink = null;
        }
        if (pendingPax.path) entryName = pendingPax.path;
        if (pendingPax.linkpath) linkName = pendingPax.linkpath;
        if (pendingPax.size) size = Number.parseInt(pendingPax.size, 10);

        if (typeFlag !== "x" && typeFlag !== "g" && typeFlag !== "L" && typeFlag !== "K") {
          pendingPax = {};
        }

        const pad = (512 - (size % 512)) % 512;

        // Reject character/block devices and FIFOs ('3', '4', '6')
        if (typeFlag === "3" || typeFlag === "4" || typeFlag === "6") {
          throw new ChecksumMismatchError(`Archive contains unsupported device node: '${entryName}'.`);
        }

        if (typeFlag === "x" || typeFlag === "g" || typeFlag === "L" || typeFlag === "K") {
          state = {
            kind: "payload",
            typeFlag,
            entryName,
            linkName,
            mode,
            remaining: size,
            pad,
            fd: null,
            chunks: [],
          };
          continue;
        }

        const cleanedEntry = entryName.replace(/\/+$/, "");
        if (!cleanedEntry || cleanedEntry === ".") {
          state = size > 0 ? { kind: "payload", typeFlag: "ignore", entryName, linkName, mode, remaining: size, pad, fd: null, chunks: [] } : pad > 0 ? { kind: "padding", pad } : { kind: "header" };
          continue;
        }

        const targetPath = assertSafeRelativeEntry(cleanedEntry, resolvedRoot);

        if (typeFlag === "5" || entryName.endsWith("/")) {
          fs.mkdirSync(targetPath, { recursive: true });
          state = pad > 0 ? { kind: "padding", pad } : { kind: "header" };
          continue;
        }

        if (typeFlag === "2" || typeFlag === "1") {
          if (!linkName || path.isAbsolute(linkName) || linkName.startsWith("/")) {
            throw new ChecksumMismatchError(
              `Archive contains unsafe absolute link target: '${entryName}' -> '${linkName}'.`,
            );
          }
          const baseForLink = typeFlag === "2" ? path.dirname(targetPath) : resolvedRoot;
          const resolvedLink = path.resolve(baseForLink, linkName);
          if (!isWithinRoot(resolvedLink, resolvedRoot)) {
            throw new ChecksumMismatchError(
              `Archive link escapes destination directory: '${entryName}' -> '${linkName}'.`,
            );
          }
          if (typeFlag === "2") {
            deferredSymlinks.push({ targetPath, linkTarget: linkName });
          } else {
            fs.mkdirSync(path.dirname(targetPath), { recursive: true });
            if (fs.existsSync(targetPath)) fs.unlinkSync(targetPath);
            fs.linkSync(resolvedLink, targetPath);
          }
          state = pad > 0 ? { kind: "padding", pad } : { kind: "header" };
          continue;
        }

        // Regular file ('0')
        fs.mkdirSync(path.dirname(targetPath), { recursive: true });
        const fileMode = mode ? mode & 0o777 : 0o644;
        const fd = fs.openSync(targetPath, "w", fileMode);
        if (size === 0) {
          fs.closeSync(fd);
          if (process.platform !== "win32" && mode) {
            fs.chmodSync(targetPath, fileMode);
          }
          state = pad > 0 ? { kind: "padding", pad } : { kind: "header" };
        } else {
          state = {
            kind: "payload",
            typeFlag: "0",
            entryName: targetPath,
            linkName,
            mode: fileMode,
            remaining: size,
            pad,
            fd,
            chunks: [],
          };
        }
      } else if (state.kind === "payload") {
        if (stash.length === 0) return;
        const take = Math.min(state.remaining, stash.length);
        const slice = stash.subarray(0, take);
        stash = stash.subarray(take);
        state.remaining -= take;

        if (state.fd !== null) {
          fs.writeSync(state.fd, slice);
        } else if (state.typeFlag !== "ignore") {
          state.chunks.push(Buffer.from(slice));
        }

        if (state.remaining === 0) {
          if (state.fd !== null) {
            fs.closeSync(state.fd);
            if (process.platform !== "win32" && state.mode) {
              fs.chmodSync(state.entryName, state.mode);
            }
          } else if (state.typeFlag === "x") {
            pendingPax = { ...pendingPax, ...parsePaxRecords(Buffer.concat(state.chunks)) };
          } else if (state.typeFlag === "L") {
            gnuLongName = readNullTerminated(Buffer.concat(state.chunks), 0, Buffer.concat(state.chunks).length);
          } else if (state.typeFlag === "K") {
            gnuLongLink = readNullTerminated(Buffer.concat(state.chunks), 0, Buffer.concat(state.chunks).length);
          }
          state = state.pad > 0 ? { kind: "padding", pad: state.pad } : { kind: "header" };
        }
      } else if (state.kind === "padding") {
        if (stash.length < state.pad) return;
        stash = stash.subarray(state.pad);
        state = { kind: "header" };
      }
    }
  }

  try {
    for await (const chunk of stream) {
      stash = stash.length === 0 ? chunk : Buffer.concat([stash, chunk]);
      processStash();
    }
    for (const sym of deferredSymlinks) {
      fs.mkdirSync(path.dirname(sym.targetPath), { recursive: true });
      if (fs.existsSync(sym.targetPath)) fs.unlinkSync(sym.targetPath);
      fs.symlinkSync(sym.linkTarget, sym.targetPath);
    }
  } catch (err) {
    if (err instanceof ChecksumMismatchError) throw err;
    throw new DownloadFailedError(`Failed to extract tar archive: ${String(err)}`, { cause: err });
  } finally {
    // A decoder or filesystem error may leave the current output file open.
    const finalState = state as State;
    if (finalState.kind === "payload" && finalState.fd !== null) {
      try { fs.closeSync(finalState.fd); } catch { /* already closed */ }
    }
  }
}

const EOCD_SIG = 0x06054b50;
const CEN_SIG = 0x02014b50;
const LOC_SIG = 0x04034b50;
const ZIP64_EOCD_LOCATOR_SIG = 0x07064b50;
const ZIP64_EOCD_SIG = 0x06064b50;

/**
 * Safely extract a `.zip` archive into `destDir` (Store + Deflate, Zip64-aware,
 * rejecting symlinks and Zip-Slip path traversal).
 */
export function safeExtractZip(archivePath: string, destDir: string): void {
  fs.mkdirSync(destDir, { recursive: true });
  const resolvedRoot = fs.realpathSync(destDir);
  const fd = fs.openSync(archivePath, "r");

  try {
    const stat = fs.fstatSync(fd);
    const fileSize = stat.size;
    const tailLen = Math.min(fileSize, 65_557);
    const tailBuf = Buffer.alloc(tailLen);
    fs.readSync(fd, tailBuf, 0, tailLen, fileSize - tailLen);

    let eocdPos = -1;
    for (let i = tailLen - 22; i >= 0; i--) {
      if (tailBuf.readUInt32LE(i) === EOCD_SIG) {
        eocdPos = i;
        break;
      }
    }
    if (eocdPos === -1) {
      throw new DownloadFailedError("Invalid ZIP archive: End of Central Directory not found.");
    }

    let totalEntries = tailBuf.readUInt16LE(eocdPos + 10);
    let cdSize = tailBuf.readUInt32LE(eocdPos + 12);
    let cdOffset = tailBuf.readUInt32LE(eocdPos + 16);

    // Handle Zip64 EOCD if present
    if (eocdPos >= 20 && tailBuf.readUInt32LE(eocdPos - 20) === ZIP64_EOCD_LOCATOR_SIG) {
      const z64Offset = Number(tailBuf.readBigUInt64LE(eocdPos - 12));
      const z64Buf = Buffer.alloc(56);
      fs.readSync(fd, z64Buf, 0, 56, z64Offset);
      if (z64Buf.readUInt32LE(0) === ZIP64_EOCD_SIG) {
        totalEntries = Number(z64Buf.readBigUInt64LE(32));
        cdSize = Number(z64Buf.readBigUInt64LE(40));
        cdOffset = Number(z64Buf.readBigUInt64LE(48));
      }
    }

    const cdBuf = Buffer.alloc(cdSize);
    fs.readSync(fd, cdBuf, 0, cdSize, cdOffset);

    let ptr = 0;
    for (let idx = 0; idx < totalEntries && ptr + 46 <= cdBuf.length; idx++) {
      if (cdBuf.readUInt32LE(ptr) !== CEN_SIG) {
        throw new DownloadFailedError("Corrupted ZIP Central Directory entry.");
      }
      const method = cdBuf.readUInt16LE(ptr + 10);
      let compSize = cdBuf.readUInt32LE(ptr + 20);
      let uncompSize = cdBuf.readUInt32LE(ptr + 24);
      const nameLen = cdBuf.readUInt16LE(ptr + 28);
      const extraLen = cdBuf.readUInt16LE(ptr + 30);
      const commentLen = cdBuf.readUInt16LE(ptr + 32);
      const extAttr = cdBuf.readUInt32LE(ptr + 38);
      let localHeaderOffset = cdBuf.readUInt32LE(ptr + 42);

      const entryName = cdBuf.subarray(ptr + 46, ptr + 46 + nameLen).toString("utf8");
      const extraBuf = cdBuf.subarray(ptr + 46 + nameLen, ptr + 46 + nameLen + extraLen);
      ptr += 46 + nameLen + extraLen + commentLen;

      // Parse Zip64 extra field (0x0001) if needed
      if (uncompSize === 0xffffffff || compSize === 0xffffffff || localHeaderOffset === 0xffffffff) {
        let ep = 0;
        while (ep + 4 <= extraBuf.length) {
          const headerId = extraBuf.readUInt16LE(ep);
          const dataSize = extraBuf.readUInt16LE(ep + 2);
          if (headerId === 0x0001) {
            let zp = ep + 4;
            if (uncompSize === 0xffffffff && zp + 8 <= ep + 4 + dataSize) {
              uncompSize = Number(extraBuf.readBigUInt64LE(zp));
              zp += 8;
            }
            if (compSize === 0xffffffff && zp + 8 <= ep + 4 + dataSize) {
              compSize = Number(extraBuf.readBigUInt64LE(zp));
              zp += 8;
            }
            if (localHeaderOffset === 0xffffffff && zp + 8 <= ep + 4 + dataSize) {
              localHeaderOffset = Number(extraBuf.readBigUInt64LE(zp));
            }
            break;
          }
          ep += 4 + dataSize;
        }
      }

      const unixMode = (extAttr >>> 16) & 0o170000;
      if (unixMode === 0o120000) {
        throw new ChecksumMismatchError(`Archive contains unsupported symlink entry: '${entryName}'.`);
      }

      const cleaned = entryName.replace(/\/+$/, "");
      if (!cleaned) continue;
      const targetPath = assertSafeRelativeEntry(cleaned, resolvedRoot);

      if (entryName.endsWith("/")) {
        fs.mkdirSync(targetPath, { recursive: true });
        continue;
      }

      const locHdr = Buffer.alloc(30);
      fs.readSync(fd, locHdr, 0, 30, localHeaderOffset);
      if (locHdr.readUInt32LE(0) !== LOC_SIG) {
        throw new DownloadFailedError(`Invalid ZIP local header for '${entryName}'.`);
      }
      const locNameLen = locHdr.readUInt16LE(26);
      const locExtraLen = locHdr.readUInt16LE(28);
      const dataOffset = localHeaderOffset + 30 + locNameLen + locExtraLen;

      const compBuf = Buffer.alloc(compSize);
      fs.readSync(fd, compBuf, 0, compSize, dataOffset);

      let outBuf: Buffer;
      if (method === 0) {
        outBuf = compBuf;
      } else if (method === 8) {
        outBuf = zlib.inflateRawSync(compBuf);
      } else {
        throw new DownloadFailedError(`Unsupported ZIP compression method ${method} for '${entryName}'.`);
      }

      if (outBuf.length !== uncompSize) {
        throw new ChecksumMismatchError(
          `ZIP entry size mismatch for '${entryName}': expected ${uncompSize}, got ${outBuf.length}.`,
        );
      }

      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      const modePerms = (extAttr >>> 16) & 0o777;
      fs.writeFileSync(targetPath, outBuf, modePerms ? { mode: modePerms } : undefined);
    }
  } finally {
    fs.closeSync(fd);
  }
}
