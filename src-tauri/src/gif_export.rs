//! Native validation and atomic publication for a rendered GIF preview.
use crate::{
    images::valid_image_stem,
    project::{AppError, Session},
};
use base64::{engine::general_purpose::STANDARD, Engine};
use serde::{Deserialize, Serialize};
use std::{io::Write, path::Path};

const MAX_BYTES: usize = 16 * 1024 * 1024;
const MAX_AXIS: u32 = 1024;
const MAX_FRAMES: u64 = 600;
const MAX_PIXELS: u64 = 200_000_000;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct Request {
    pub expected_revision: u64,
    pub document_id: u64,
    pub bytes_base64: String,
    pub suggested_name: String,
}

pub(crate) struct Pending {
    revision: u64,
    document_id: u64,
    bytes: Vec<u8>,
    pub suggested_name: String,
}

#[derive(Debug, Serialize)]
pub(crate) struct ExportResult {
    pub path: String,
}

impl Request {
    pub(crate) fn prepare(self, session: &Session) -> Result<Pending, AppError> {
        session.with_gif_export(self.expected_revision, self.document_id, || Ok(()))?;
        let too_large = || AppError::new("InvalidGif", "The GIF exceeds the 16 MiB export limit.");
        if self.bytes_base64.len() > MAX_BYTES.div_ceil(3) * 4 {
            return Err(too_large());
        }
        let bytes = STANDARD
            .decode(self.bytes_base64)
            .map_err(|_| AppError::new("InvalidGif", "The GIF data could not be decoded."))?;
        if bytes.len() > MAX_BYTES {
            return Err(too_large());
        }
        inspect(&bytes).ok_or_else(|| {
            AppError::new(
                "InvalidGif",
                "The GIF is incomplete or exceeds the canvas or frame limits.",
            )
        })?;
        Ok(Pending {
            revision: self.expected_revision,
            document_id: self.document_id,
            bytes,
            suggested_name: safe_suggestion(&self.suggested_name),
        })
    }
}

impl Pending {
    pub(crate) fn write(self, session: &Session, chosen: &Path) -> Result<ExportResult, AppError> {
        let path = if chosen.extension().is_none() {
            chosen.with_extension("gif")
        } else {
            chosen.to_owned()
        };
        if !path
            .extension()
            .is_some_and(|ext| ext.eq_ignore_ascii_case("gif"))
            || !path
                .file_stem()
                .and_then(|stem| stem.to_str())
                .is_some_and(valid_image_stem)
        {
            return Err(AppError::new(
                "InvalidFile",
                "Use a portable filename with the .gif extension.",
            ));
        }
        let parent = path
            .parent()
            .filter(|p| !p.as_os_str().is_empty())
            .unwrap_or(Path::new("."));
        session.with_gif_export(self.revision, self.document_id, || {
            let mut temp = tempfile::NamedTempFile::new_in(parent)?;
            temp.write_all(&self.bytes)?;
            temp.as_file().sync_all()?;
            temp.persist_noclobber(&path).map_err(|error| {
                if error.error.kind() == std::io::ErrorKind::AlreadyExists {
                    AppError::new(
                        "ExportExists",
                        "A file already uses that name. Choose a different filename.",
                    )
                } else {
                    AppError::from(error.error)
                }
            })?;
            Ok(ExportResult {
                path: path.to_string_lossy().into_owned(),
            })
        })
    }
}

fn safe_suggestion(name: &str) -> String {
    let name = name.trim();
    let suffix = name.len().saturating_sub(4);
    let name = if name
        .get(suffix..)
        .is_some_and(|value| value.eq_ignore_ascii_case(".gif"))
    {
        &name[..suffix]
    } else {
        name
    };
    // Windows device aliases and path separators are invalid as suggested names.
    let name: String = name[..name.floor_char_boundary(name.len().min(120))]
        .chars()
        .map(|c| {
            if c.is_control() || "<>:\"/\\|?*".contains(c) {
                '-'
            } else {
                c
            }
        })
        .collect();
    let stem = name.trim_matches(|c: char| c.is_whitespace() || c == '.');
    if valid_image_stem(stem) {
        format!("{stem}.gif")
    } else {
        "FBones-preview.gif".into()
    }
}

// Check the envelope and block sizes before publishing bytes. The renderer
// produces the LZW payload; decoding frames is unnecessary in the save path.
fn inspect(bytes: &[u8]) -> Option<()> {
    let (header, mut rest) = bytes.split_at_checked(13)?;
    if &header[..6] != b"GIF87a" && &header[..6] != b"GIF89a" {
        return None;
    }
    let width = dimension(&header[6..8]);
    let height = dimension(&header[8..10]);
    if !(1..=MAX_AXIS).contains(&width) || !(1..=MAX_AXIS).contains(&height) {
        return None;
    }
    let global_palette = read_palette(&mut rest, header[10])?;
    let frame_pixels = u64::from(width) * u64::from(height);
    let mut frames = 0;
    loop {
        match take(&mut rest, 1)?[0] {
            0x21 => {
                take(&mut rest, 1)?;
                read_sub_blocks(&mut rest)?;
            }
            0x2c => {
                let frame = take(&mut rest, 9)?;
                let w = dimension(&frame[4..6]);
                let h = dimension(&frame[6..8]);
                frames += 1;
                if frames > MAX_FRAMES
                    || frame_pixels * frames > MAX_PIXELS
                    || w == 0
                    || h == 0
                    || dimension(&frame[..2]) + w > width
                    || dimension(&frame[2..4]) + h > height
                {
                    return None;
                }
                let local_palette = read_palette(&mut rest, frame[8])?;
                let lzw_size = take(&mut rest, 1)?[0];
                if !(global_palette || local_palette)
                    || !(2..=8).contains(&lzw_size)
                    || !read_sub_blocks(&mut rest)?
                {
                    return None;
                }
            }
            0x3b if frames > 0 && rest.is_empty() => return Some(()),
            _ => return None,
        }
    }
}

fn dimension(bytes: &[u8]) -> u32 {
    u32::from(u16::from_le_bytes([bytes[0], bytes[1]]))
}

fn take<'a>(rest: &mut &'a [u8], count: usize) -> Option<&'a [u8]> {
    let (head, tail) = rest.split_at_checked(count)?;
    *rest = tail;
    Some(head)
}

fn read_palette(rest: &mut &[u8], packed: u8) -> Option<bool> {
    let present = packed & 0x80 != 0;
    if present {
        take(rest, 3 * (2 << (packed & 7)))?;
    }
    Some(present)
}

fn read_sub_blocks(rest: &mut &[u8]) -> Option<bool> {
    let mut size = usize::from(take(rest, 1)?[0]);
    let has_data = size > 0;
    while size != 0 {
        take(rest, size)?;
        size = usize::from(take(rest, 1)?[0]);
    }
    Some(has_data)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::project::{new_document, ProjectSummary};

    const GIF: &[u8] = b"GIF89a\x01\x00\x01\x00\x80\x00\x00\x00\x00\x00\xff\xff\xff\
        \x2c\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02\x44\x01\x00\x3b";

    fn request(project: &ProjectSummary, bytes: &[u8]) -> Request {
        Request {
            expected_revision: project.revision,
            document_id: project.document_id,
            bytes_base64: STANDARD.encode(bytes),
            suggested_name: "Animation/walk.GIF".into(),
        }
    }

    #[test]
    fn writes_one_gif_without_clobber_and_rejects_a_replaced_document() {
        let session = Session::default();
        let first = session
            .replace(new_document("First GIF".into()).unwrap(), false)
            .unwrap();
        let dir = tempfile::tempdir().unwrap();
        let chosen = dir.path().join("out");
        let pending = request(&first, GIF).prepare(&session).unwrap();
        assert_eq!(pending.suggested_name, "Animation-walk.gif");
        let result = pending.write(&session, &chosen).unwrap();
        let file = chosen.with_extension("gif");
        assert_eq!(Path::new(&result.path), file);
        assert_eq!(std::fs::read(&file).unwrap(), GIF);
        assert_eq!(session.summary().unwrap().unwrap().revision, first.revision);
        assert_eq!(
            request(&first, GIF)
                .prepare(&session)
                .unwrap()
                .write(&session, &file)
                .unwrap_err()
                .code,
            "ExportExists"
        );
        let stale = request(&first, GIF).prepare(&session).unwrap();
        session
            .replace(new_document("Second GIF".into()).unwrap(), true)
            .unwrap();
        let rejected = dir.path().join("stale.gif");
        assert_eq!(
            stale.write(&session, &rejected).unwrap_err().code,
            "ProjectChanged"
        );
        assert!(!rejected.exists());
        assert_eq!(std::fs::read(&file).unwrap(), GIF);
        assert_eq!(std::fs::read_dir(dir.path()).unwrap().count(), 1);
    }

    #[test]
    fn validates_canvas_and_frame_envelope() {
        assert!(inspect(GIF).is_some());
        assert!(inspect(&GIF[..GIF.len() - 1]).is_none());
        let mut oversized = GIF.to_vec();
        oversized[6..8].copy_from_slice(&(MAX_AXIS as u16 + 1).to_le_bytes());
        assert!(inspect(&oversized).is_none());
        assert_eq!(safe_suggestion("CON.GIF"), "FBones-preview.gif");
    }
}
