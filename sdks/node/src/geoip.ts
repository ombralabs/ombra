/**
 * Optional GeoIP-based timezone and locale detection from egress/proxy IP.
 *
 * Uses optional peer dependency `mmdb-lib` (`npm install mmdb-lib`).
 */

import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import tls from "node:tls";
import { getGeoipDir, logger } from "./config.js";
import { ProxyError } from "./errors.js";
import { loadOptionalModule, optionalModuleAvailable } from "./optional-module.cjs";
import { LoopbackProxyRelay, type NormalizedProxy } from "./proxy.js";

const GEOIP_DB_URL = "https://github.com/P3TERX/GeoLite.mmdb/raw/download/GeoLite2-City.mmdb";
const GEOIP_DB_FILENAME = "GeoLite2-City.mmdb";
const ECHO_ENDPOINTS: Array<{ host: string; path: string }> = [
  { host: "api.ipify.org", path: "/" },
  { host: "checkip.amazonaws.com", path: "/" },
  { host: "icanhazip.com", path: "/" },
];

export const COUNTRY_LOCALE_MAP: Record<string, string> = {
  US: "en-US", GB: "en-GB", AU: "en-AU", CA: "en-CA", NZ: "en-NZ",
  IE: "en-IE", ZA: "en-ZA", SG: "en-SG",
  DE: "de-DE", AT: "de-AT", CH: "de-CH",
  FR: "fr-FR", BE: "fr-BE",
  ES: "es-ES", MX: "es-MX", AR: "es-AR", CO: "es-CO", CL: "es-CL",
  BR: "pt-BR", PT: "pt-PT",
  IT: "it-IT", NL: "nl-NL",
  JP: "ja-JP", KR: "ko-KR", CN: "zh-CN", TW: "zh-TW", HK: "zh-HK",
  RU: "ru-RU", UA: "uk-UA", PL: "pl-PL", CZ: "cs-CZ", RO: "ro-RO",
  IL: "he-IL", TR: "tr-TR", SA: "ar-SA", AE: "ar-AE", EG: "ar-EG",
  IN: "hi-IN", ID: "id-ID", PH: "en-PH", TH: "th-TH", VN: "vi-VN", MY: "ms-MY",
  SE: "sv-SE", NO: "nb-NO", DK: "da-DK", FI: "fi-FI", GR: "el-GR", HU: "hu-HU", BG: "bg-BG",
};

export { GEOIP_DB_FILENAME };

export function geoipAvailable(): Promise<boolean> {
  return optionalModuleAvailable("mmdb-lib");
}

async function ensureGeoipDb(): Promise<string | null> {
  const dbPath = path.join(getGeoipDir(), GEOIP_DB_FILENAME);
  if (fs.existsSync(dbPath)) return dbPath;
  try {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    const resp = await fetch(GEOIP_DB_URL, { redirect: "follow" });
    if (!resp.ok) return null;
    const buf = Buffer.from(await resp.arrayBuffer());
    const tmp = `${dbPath}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, buf);
    fs.renameSync(tmp, dbPath);
    return dbPath;
  } catch (err) {
    logger.warn(`Failed to download GeoIP database: ${String(err)}`);
    return null;
  }
}

function fetchHttpsOverSocks5(localSocksPort: number, targetHost: string, targetPath: string, timeoutMs: number): Promise<string | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      rawSock.destroy();
      resolve(null);
    }, timeoutMs);
    timer.unref?.();

    const rawSock = net.connect(localSocksPort, "127.0.0.1");
    rawSock.once("error", () => {
      clearTimeout(timer);
      resolve(null);
    });
    rawSock.once("connect", () => {
      rawSock.write(Buffer.from([0x05, 0x01, 0x00]));
      rawSock.once("data", (greet) => {
        if (greet[0] !== 0x05 || greet[1] !== 0x00) {
          clearTimeout(timer);
          rawSock.destroy();
          resolve(null);
          return;
        }
        const hostBuf = Buffer.from(targetHost, "utf8");
        const req = Buffer.concat([
          Buffer.from([0x05, 0x01, 0x00, 0x03, hostBuf.length]),
          hostBuf,
          Buffer.from([0x01, 0xbb]), // 443
        ]);
        rawSock.write(req);
        rawSock.once("data", (rep) => {
          if (rep[1] !== 0x00) {
            clearTimeout(timer);
            rawSock.destroy();
            resolve(null);
            return;
          }
          const tlsSock = tls.connect({ socket: rawSock, servername: targetHost }, () => {
            tlsSock.write(
              `GET ${targetPath} HTTP/1.1\r\nHost: ${targetHost}\r\nConnection: close\r\n\r\n`,
            );
          });
          const chunks: Buffer[] = [];
          tlsSock.on("data", (c: Buffer) => chunks.push(c));
          tlsSock.once("error", () => {
            clearTimeout(timer);
            resolve(null);
          });
          tlsSock.once("end", () => {
            clearTimeout(timer);
            const text = Buffer.concat(chunks).toString("utf8");
            const bodyIdx = text.indexOf("\r\n\r\n");
            if (bodyIdx === -1) {
              resolve(null);
              return;
            }
            const candidate = text.slice(bodyIdx + 4).trim().split(/\s+/)[0];
            resolve(net.isIP(candidate) ? candidate : null);
          });
        });
      });
    });
  });
}

async function resolveExitIp(proxy: NormalizedProxy | null): Promise<string | null> {
  if (!proxy) {
    for (const ep of ECHO_ENDPOINTS) {
      try {
        const resp = await fetch(`https://${ep.host}${ep.path}`, {
          signal: AbortSignal.timeout(8_000),
        });
        if (resp.ok) {
          const text = (await resp.text()).trim();
          if (net.isIP(text)) return text;
        }
      } catch {
        // try next endpoint
      }
    }
    return null;
  }

  // Tunnel through our own LoopbackProxyRelay so HTTP, HTTPS, and SOCKS5 proxies all work zero-dep!
  const relay = new LoopbackProxyRelay(proxy);
  try {
    const relayUrl = await relay.start();
    const port = Number.parseInt(relayUrl.split(":").pop()!, 10);
    for (const ep of ECHO_ENDPOINTS) {
      const ip = await fetchHttpsOverSocks5(port, ep.host, ep.path, 8_000);
      if (ip) return ip;
    }
  } catch {
    // Report failure without including upstream credentials or transport errors.
  } finally {
    await relay.stop();
  }

  throw new ProxyError("Failed to discover the proxy exit IP for automatic timezone/locale.");
}

export async function resolveAutoGeoHints(params: {
  timezone?: string;
  locale?: string;
  proxy: NormalizedProxy | null;
}): Promise<{ timezone?: string; locale?: string }> {
  const needTz = params.timezone === "auto";
  const needLoc = params.locale === "auto";
  if (!needTz && !needLoc) {
    return { timezone: params.timezone, locale: params.locale };
  }

  if (!(await geoipAvailable())) {
    logger.warn(
      "fingerprint 'auto' timezone/locale requires optional peer 'mmdb-lib' (npm install mmdb-lib); leaving engine defaults.",
    );
    return {
      timezone: needTz ? undefined : params.timezone,
      locale: needLoc ? undefined : params.locale,
    };
  }

  const dbPath = await ensureGeoipDb();
  const exitIp = await resolveExitIp(params.proxy);
  if (!dbPath || !exitIp) {
    return {
      timezone: needTz ? undefined : params.timezone,
      locale: needLoc ? undefined : params.locale,
    };
  }

  try {
    const mmdb = await loadOptionalModule("mmdb-lib");
    const Reader = mmdb.default?.Reader ?? mmdb.Reader;
    const reader = new Reader(fs.readFileSync(dbPath));
    const rec = reader.get(exitIp) as any;
    const geoTz: string | undefined = rec?.location?.time_zone ?? undefined;
    const country: string | undefined = rec?.country?.iso_code ?? undefined;
    const geoLoc: string | undefined = country ? COUNTRY_LOCALE_MAP[country] ?? "en-US" : undefined;
    return {
      timezone: needTz ? geoTz : params.timezone,
      locale: needLoc ? geoLoc : params.locale,
    };
  } catch (err) {
    logger.warn(`GeoIP lookup failed: ${String(err)}`);
    return {
      timezone: needTz ? undefined : params.timezone,
      locale: needLoc ? undefined : params.locale,
    };
  }
}
