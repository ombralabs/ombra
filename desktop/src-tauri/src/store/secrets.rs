use super::StoreError;
use chacha20poly1305::aead::{Aead, KeyInit};
use chacha20poly1305::{Key, XChaCha20Poly1305, XNonce};
use std::fmt;

const NONCE_LEN: usize = 24;

/// Пароль, ключ 2FA или пароль прокси. В `Debug` не раскрывается, `Display` нет.
#[derive(Clone, PartialEq, Eq)]
pub struct Secret(String);

impl Secret {
    pub fn new(value: impl Into<String>) -> Self {
        Self(value.into())
    }

    pub fn expose(&self) -> &str {
        &self.0
    }
}

impl fmt::Debug for Secret {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str("Secret(***)")
    }
}

/// Как менять секрет при сохранении записи.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum SecretField {
    Keep,
    Clear,
    Set(Secret),
}

/// Шифрование XChaCha20-Poly1305; результат — nonce (24 байта) и шифртекст.
pub struct SecretBox {
    cipher: XChaCha20Poly1305,
}

impl SecretBox {
    pub fn from_key(key: &[u8; 32]) -> Self {
        Self { cipher: XChaCha20Poly1305::new(Key::from_slice(key)) }
    }

    pub fn encrypt(&self, secret: &Secret) -> Result<Vec<u8>, StoreError> {
        let mut nonce = [0u8; NONCE_LEN];
        getrandom::fill(&mut nonce).map_err(|_| StoreError::Crypto)?;
        let ciphertext = self
            .cipher
            .encrypt(XNonce::from_slice(&nonce), secret.expose().as_bytes())
            .map_err(|_| StoreError::Crypto)?;
        let mut blob = nonce.to_vec();
        blob.extend_from_slice(&ciphertext);
        Ok(blob)
    }

    pub fn decrypt(&self, blob: &[u8]) -> Result<Secret, StoreError> {
        if blob.len() <= NONCE_LEN {
            return Err(StoreError::Crypto);
        }
        let (nonce, ciphertext) = blob.split_at(NONCE_LEN);
        let plain = self
            .cipher
            .decrypt(XNonce::from_slice(nonce), ciphertext)
            .map_err(|_| StoreError::Crypto)?;
        String::from_utf8(plain).map(Secret).map_err(|_| StoreError::Crypto)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn boxed(byte: u8) -> SecretBox {
        SecretBox::from_key(&[byte; 32])
    }

    #[test]
    fn roundtrip() {
        let b = boxed(1);
        let blob = b.encrypt(&Secret::new("hunter2")).unwrap();
        assert_eq!(b.decrypt(&blob).unwrap().expose(), "hunter2");
    }

    #[test]
    fn same_secret_gives_different_blobs() {
        let b = boxed(1);
        let s = Secret::new("hunter2");
        assert_ne!(b.encrypt(&s).unwrap(), b.encrypt(&s).unwrap());
    }

    #[test]
    fn wrong_key_and_truncated_blob_fail() {
        let blob = boxed(1).encrypt(&Secret::new("hunter2")).unwrap();
        assert!(boxed(2).decrypt(&blob).is_err());
        assert!(boxed(1).decrypt(&blob[..20]).is_err());
    }

    #[test]
    fn debug_hides_value() {
        let text = format!("{:?}", Secret::new("hunter2"));
        assert!(!text.contains("hunter2"), "{text}");
        let field = format!("{:?}", SecretField::Set(Secret::new("hunter2")));
        assert!(!field.contains("hunter2"), "{field}");
    }
}
