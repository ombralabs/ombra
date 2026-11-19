//! Исключительная блокировка папки: `flock` на файле `.ombra.lock` внутри неё.
//! Профиль блокирует свою папку на время работы, приложение — папку данных (второй экземпляр не стартует).
use std::fs::{File, TryLockError};
use std::io;
use std::path::Path;

pub const LOCK_FILE: &str = ".ombra.lock";

/// Блокировка снимается, когда значение освобождается или процесс завершается.
#[derive(Debug)]
pub struct DirLock {
    _file: File,
}

#[derive(Debug, thiserror::Error)]
pub enum LockError {
    #[error("папка занята другим процессом")]
    Busy,
    #[error("блокировка папки: {0}")]
    Io(#[from] io::Error),
}

impl DirLock {
    pub fn acquire(dir: &Path) -> Result<Self, LockError> {
        std::fs::create_dir_all(dir)?;
        let file = crate::sys::private_options()
            .read(true)
            .write(true)
            .create(true)
            .truncate(false)
            .open(dir.join(LOCK_FILE))?;
        // Занятость может быть кратковременной: пока в другом потоке порождается дочерний процесс, его копия
        // дескриптора живёт до `exec` и держит блокировку, уже снятую владельцем. Поэтому `Busy` — после коротких повторов.
        for attempt in 1..=BUSY_RETRIES {
            match file.try_lock() {
                Ok(()) => return Ok(Self { _file: file }),
                Err(TryLockError::Error(error)) => return Err(LockError::Io(error)),
                Err(TryLockError::WouldBlock) if attempt == BUSY_RETRIES => return Err(LockError::Busy),
                Err(TryLockError::WouldBlock) => std::thread::sleep(BUSY_PAUSE),
            }
        }
        unreachable!("BUSY_RETRIES > 0")
    }
}

const BUSY_RETRIES: u32 = 25;
const BUSY_PAUSE: std::time::Duration = std::time::Duration::from_millis(2);

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn second_lock_is_busy_until_first_is_released() {
        let dir = tempfile::tempdir().unwrap();
        let profile = dir.path().join("profiles/k7f2q9");
        let first = DirLock::acquire(&profile).unwrap();
        assert!(profile.join(LOCK_FILE).is_file());
        assert!(matches!(DirLock::acquire(&profile), Err(LockError::Busy)));
        drop(first);
        DirLock::acquire(&profile).unwrap();
    }

    #[test]
    fn io_failure_is_not_busy() {
        let dir = tempfile::tempdir().unwrap();
        let file = dir.path().join("plain");
        std::fs::write(&file, "").unwrap();
        assert!(matches!(DirLock::acquire(&file.join("Ombra")), Err(LockError::Io(_))));
    }
}
