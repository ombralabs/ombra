import fs from "node:fs";
import { constants, flockSync, lockFileExSync, unlockFileExSync } from "fs-ext-extra-prebuilt";

export class FileLockBusyError extends Error {
  readonly code = "ELOCKED";

  constructor(lockPath: string, cause: unknown) {
    super(`File lock is already held: ${lockPath}`, { cause });
    this.name = "FileLockBusyError";
  }
}

/** Nonblocking ownership of a stable inode; callers must never unlink the lock file. */
export function acquireFileLock(lockPath: string): { readonly fd: number; release(): void } {
  const fd = fs.openSync(lockPath, fs.constants.O_CREAT | fs.constants.O_RDWR, 0o600);
  try {
    if (process.platform === "win32") {
      lockFileExSync(fd, constants.LOCKFILE_EXCLUSIVE_LOCK | constants.LOCKFILE_FAIL_IMMEDIATELY, 0, 0, 1, 0);
    } else {
      flockSync(fd, "exnb");
    }
  } catch (error) {
    fs.closeSync(fd);
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "EAGAIN" || code === "EWOULDBLOCK") {
      throw new FileLockBusyError(lockPath, error);
    }
    throw error;
  }

  let released = false;
  return {
    fd,
    release() {
      if (released) return;
      released = true;
      try {
        if (process.platform === "win32") {
          unlockFileExSync(fd, 0, 0, 1, 0);
        } else {
          flockSync(fd, "un");
        }
      } finally {
        fs.closeSync(fd);
      }
    },
  };
}
