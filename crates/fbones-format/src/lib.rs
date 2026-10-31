//! Spine 4.3.26 envelope codec and the independently verified minimal profile.
//! Unsupported documents remain immutable and are retained byte-for-byte.
//! New projects are encoded from typed models, never copied from a template.

use flate2::{write::DeflateEncoder, Compression, Decompress, FlushDecompress, Status};
use std::io::{Read, Write};
use thiserror::Error;

pub mod minimal;

pub const TARGET_VERSION: &str = "4.3.26";
pub const MAX_FILE_BYTES: usize = 64 * 1024 * 1024;
pub const MAX_DECODED_BYTES: usize = 256 * 1024 * 1024;

#[derive(Debug, Error)]
pub enum FormatError {
    #[error("The file is too large to inspect safely.")]
    TooLarge,
    #[error("The project is damaged or is not a supported Spine project.")]
    InvalidFile,
    #[error("The project checksum does not match its contents. The file may be damaged.")]
    ChecksumMismatch,
    #[error("This project was saved with Spine {0}. Only 4.3.26 is supported.")]
    UnsupportedVersion(String),
    #[error("This project contains data outside the supported minimal profile. It can be inspected and copied without changes.")]
    UnsupportedProfile,
}

/// An inspected, immutable project. Its inner objects remain undecoded.
#[derive(Debug)]
pub struct ProjectEnvelope {
    original: Vec<u8>,
    decoded_bytes: usize,
    stream_bytes: usize,
}

const fn crc64_table() -> [u64; 256] {
    let mut table = [0; 256];
    let mut i = 0;
    while i < 256 {
        let mut value = (i as u64) << 56;
        let mut bit = 0;
        while bit < 8 {
            value = if value & (1 << 63) != 0 {
                (value << 1) ^ 0x42f0_e1eb_a9ea_3693
            } else {
                value << 1
            };
            bit += 1;
        }
        table[i] = value;
        i += 1;
    }
    table
}
const CRC64_TABLE: [u64; 256] = crc64_table();

/// CRC64/ECMA-182, initial value zero, no final XOR, non-reflected input.
pub fn crc64_ecma(bytes: &[u8]) -> u64 {
    bytes.iter().fold(0, |value, &byte| {
        CRC64_TABLE[((value >> 56) as u8 ^ byte) as usize] ^ (value << 8)
    })
}

impl ProjectEnvelope {
    pub fn inspect(original: Vec<u8>) -> Result<Self, FormatError> {
        if original.len() > MAX_FILE_BYTES {
            return Err(FormatError::TooLarge);
        }
        let mut decoder = Decompress::new(false);
        let mut prefix = Vec::new();
        let mut buffer = [0_u8; 16384];
        loop {
            let before_in = decoder.total_in();
            let before_out = decoder.total_out();
            let status = decoder
                .decompress(
                    &original[before_in as usize..],
                    &mut buffer,
                    FlushDecompress::None,
                )
                .map_err(|_| FormatError::InvalidFile)?;
            let written = (decoder.total_out() - before_out) as usize;
            if decoder.total_out() > MAX_DECODED_BYTES as u64 {
                return Err(FormatError::TooLarge);
            }
            let needed = 64_usize.saturating_sub(prefix.len());
            prefix.extend_from_slice(&buffer[..written.min(needed)]);
            if status == Status::StreamEnd {
                let trailer = &original[decoder.total_in() as usize..];
                if trailer.len() != 20
                    || trailer[16..] != [2, 11, 2, 11]
                    || u64::from_be_bytes(trailer[..8].try_into().unwrap()) != decoder.total_in()
                {
                    return Err(FormatError::InvalidFile);
                }
                if u64::from_be_bytes(trailer[8..16].try_into().unwrap())
                    != crc64_ecma(&original[..decoder.total_in() as usize])
                {
                    return Err(FormatError::ChecksumMismatch);
                }
                break;
            }
            if decoder.total_in() == before_in && written == 0 {
                return Err(FormatError::InvalidFile);
            }
        }
        // These bytes are observed across the local 4.3.26 corpus. Their
        // meanings have not been inferred or assigned invented field names.
        if !prefix.starts_with(&[0x48, 0xb0, 0x20, 0xb0, 0x20]) {
            return Err(FormatError::InvalidFile);
        }
        let mut version = String::new();
        let mut terminated = false;
        for &byte in prefix[5..].iter().take(32) {
            let c = byte & 0x7f;
            if !(c.is_ascii_digit() || c == b'.') {
                return Err(FormatError::InvalidFile);
            }
            version.push(c as char);
            if byte & 0x80 != 0 {
                terminated = true;
                break;
            }
        }
        if !terminated || version.is_empty() {
            return Err(FormatError::InvalidFile);
        }
        if version != TARGET_VERSION {
            return Err(FormatError::UnsupportedVersion(version));
        }
        // Only envelope recognition: even a valid header is not evidence of a
        // valid complete object graph. Callers must expose inspection-only mode.
        Ok(Self {
            original,
            decoded_bytes: decoder.total_out() as usize,
            stream_bytes: decoder.total_in() as usize,
        })
    }

    pub fn original_bytes(&self) -> &[u8] {
        &self.original
    }
    pub fn decoded_bytes(&self) -> usize {
        self.decoded_bytes
    }

    /// Research interface: exposes the still-undecoded object payload, not an
    /// editable project model. The original document is never mutated.
    pub fn decoded_payload(&self) -> Result<Vec<u8>, FormatError> {
        let decoder = flate2::read::DeflateDecoder::new(&self.original[..self.stream_bytes]);
        let mut payload = Vec::with_capacity(self.decoded_bytes);
        decoder
            .take(MAX_DECODED_BYTES as u64 + 1)
            .read_to_end(&mut payload)
            .map_err(|_| FormatError::InvalidFile)?;
        if payload.len() != self.decoded_bytes {
            return Err(FormatError::InvalidFile);
        }
        Ok(payload)
    }
}

/// Encode the now-recovered compression/checksum envelope around an existing
/// binary object payload. This does NOT implement new-project serialization.
pub fn encode_envelope(payload: &[u8]) -> Result<Vec<u8>, FormatError> {
    if payload.len() > MAX_DECODED_BYTES {
        return Err(FormatError::TooLarge);
    }
    let mut encoder = DeflateEncoder::new(Vec::new(), Compression::default());
    encoder
        .write_all(payload)
        .map_err(|_| FormatError::InvalidFile)?;
    let mut bytes = encoder.finish().map_err(|_| FormatError::InvalidFile)?;
    if bytes.len() + 20 > MAX_FILE_BYTES {
        return Err(FormatError::TooLarge);
    }
    let size = bytes.len() as u64;
    let checksum = crc64_ecma(&bytes);
    bytes.extend_from_slice(&size.to_be_bytes());
    bytes.extend_from_slice(&checksum.to_be_bytes());
    bytes.extend_from_slice(&[2, 11, 2, 11]);
    // Version/header validation also bounds the decoder and excludes an
    // accidentally supplied JSON/custom-format payload.
    ProjectEnvelope::inspect(bytes.clone())?;
    Ok(bytes)
}

#[cfg(test)]
mod tests {
    use super::*;
    use flate2::{write::DeflateEncoder, Compression};
    use std::io::Write;

    fn envelope(version: &str) -> Vec<u8> {
        // Synthetic header fixture: deliberately not presented as a Spine file.
        let mut data = vec![0x48, 0xb0, 0x20, 0xb0, 0x20];
        let mut version = version.as_bytes().to_vec();
        *version.last_mut().unwrap() |= 0x80;
        data.extend(version);
        data.extend([1, 2, 3, 4]);
        let mut encoder = DeflateEncoder::new(Vec::new(), Compression::default());
        encoder.write_all(&data).unwrap();
        let mut output = encoder.finish().unwrap();
        let length = output.len() as u64;
        let checksum = crc64_ecma(&output);
        output.extend_from_slice(&length.to_be_bytes());
        output.extend_from_slice(&checksum.to_be_bytes());
        output.extend_from_slice(&[2, 11, 2, 11]);
        output
    }

    #[test]
    fn preserves_original_bytes_for_inspection() {
        let original = envelope(TARGET_VERSION);
        let project = ProjectEnvelope::inspect(original.clone()).unwrap();
        assert_eq!(project.original_bytes(), original);
        assert!(project.decoded_bytes() > 11);
    }

    #[test]
    fn rejects_different_versions() {
        assert!(matches!(
            ProjectEnvelope::inspect(envelope("4.3.23")),
            Err(FormatError::UnsupportedVersion(_))
        ));
    }

    #[test]
    fn rejects_corruption_truncation_and_trailing_data() {
        assert!(ProjectEnvelope::inspect(b"not a project".to_vec()).is_err());
        let mut data = envelope(TARGET_VERSION);
        data.pop();
        assert!(ProjectEnvelope::inspect(data).is_err());
        let mut data = envelope(TARGET_VERSION);
        data.push(0);
        assert!(ProjectEnvelope::inspect(data).is_err());
    }

    #[test]
    fn verifies_crc64_and_detects_modified_checksum() {
        assert_eq!(crc64_ecma(b"123456789"), 0x6c40_df5f_0b49_7347);
        let mut bytes = envelope(TARGET_VERSION);
        let checksum_offset = bytes.len() - 12;
        bytes[checksum_offset] ^= 1;
        assert!(matches!(
            ProjectEnvelope::inspect(bytes),
            Err(FormatError::ChecksumMismatch)
        ));
    }

    #[test]
    fn envelope_repacking_preserves_the_binary_object_payload() {
        let original = ProjectEnvelope::inspect(envelope(TARGET_VERSION)).unwrap();
        let payload = original.decoded_payload().unwrap();
        let repacked = ProjectEnvelope::inspect(encode_envelope(&payload).unwrap()).unwrap();
        assert_eq!(repacked.decoded_payload().unwrap(), payload);
        assert!(encode_envelope(b"{\"not\":\"a native project\"}").is_err());
    }
}
