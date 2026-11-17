//! Bounded flat PSDv1 RGB8 import. This is an FBones support policy, not a
//! Photoshop compositor. Unknown appearance data is rejected before mutation.
use crate::{
    images::{ImageAsset, MAX_IMAGE_SIDE, MAX_PNG_BYTES},
    project::AppError,
};
use std::{collections::BTreeSet, fs::File, io::Read, path::Path, sync::Arc};

pub const MAX_PSD_BYTES: usize = 64 * 1024 * 1024;
const MAX_LAYERS: usize = 128;
const MAX_RGBA_BYTES: usize = 128 * 1024 * 1024;
const MAX_NAME_UNITS: usize = 1024;

#[derive(Debug)]
pub struct PsdDocument {
    pub width: u32,
    pub height: u32,
    pub layers: Vec<PsdLayer>,
}
#[derive(Debug)]
pub struct PsdLayer {
    pub name: String,
    pub left: i32,
    pub top: i32,
    pub width: u32,
    pub height: u32,
    pub visible: bool,
    pub opacity: u8,
    pub image: Arc<ImageAsset>,
}
fn invalid(message: impl Into<String>) -> AppError {
    AppError::new("InvalidPsd", message)
}
fn unsupported(message: impl Into<String>) -> AppError {
    AppError::new(
        "UnsupportedPsd",
        format!(
            "{} Use a flat RGB 8-bit PSD with normal raster layers and RAW/PackBits compression.",
            message.into()
        ),
    )
}
type Result<T> = std::result::Result<T, AppError>;
struct Reader<'a> {
    bytes: &'a [u8],
    at: usize,
}
impl<'a> Reader<'a> {
    fn new(bytes: &'a [u8]) -> Self {
        Self { bytes, at: 0 }
    }
    fn remaining(&self) -> usize {
        self.bytes.len() - self.at
    }
    fn take(&mut self, n: usize) -> Result<&'a [u8]> {
        let end = self
            .at
            .checked_add(n)
            .ok_or_else(|| invalid("PSD section length overflow."))?;
        let out = self
            .bytes
            .get(self.at..end)
            .ok_or_else(|| invalid("Truncated PSD section."))?;
        self.at = end;
        Ok(out)
    }
    fn u8(&mut self) -> Result<u8> {
        Ok(self.take(1)?[0])
    }
    fn u16(&mut self) -> Result<u16> {
        let b = self.take(2)?;
        Ok(u16::from_be_bytes([b[0], b[1]]))
    }
    fn i16(&mut self) -> Result<i16> {
        Ok(self.u16()? as i16)
    }
    fn u32(&mut self) -> Result<u32> {
        let b = self.take(4)?;
        Ok(u32::from_be_bytes([b[0], b[1], b[2], b[3]]))
    }
    fn i32(&mut self) -> Result<i32> {
        Ok(self.u32()? as i32)
    }
    fn section(&mut self) -> Result<Self> {
        let n = self.u32()? as usize;
        Ok(Self::new(self.take(n)?))
    }
    fn empty(&self) -> Result<()> {
        if self.remaining() != 0 {
            Err(invalid("Unexpected PSD section trailing bytes."))
        } else {
            Ok(())
        }
    }
}
struct Channel<'a> {
    id: i16,
    data: &'a [u8],
}
struct Record<'a> {
    name: String,
    left: i32,
    top: i32,
    width: u32,
    height: u32,
    visible: bool,
    opacity: u8,
    descriptors: Vec<(i16, usize)>,
    channels: Vec<Channel<'a>>,
}

pub fn read(path: &Path) -> Result<PsdDocument> {
    let file = File::open(path)?;
    if !file.metadata()?.is_file() {
        return Err(invalid("Expected a regular PSD file."));
    }
    let mut bytes = Vec::new();
    file.take((MAX_PSD_BYTES + 1) as u64)
        .read_to_end(&mut bytes)?;
    parse(&bytes)
}
pub fn parse(bytes: &[u8]) -> Result<PsdDocument> {
    if bytes.len() > MAX_PSD_BYTES {
        return Err(invalid("PSD exceeds 64 MiB."));
    }
    let mut input = Reader::new(bytes);
    if input.take(4)? != b"8BPS" {
        return Err(invalid("Not a PSD file."));
    }
    if input.u16()? != 1 {
        return Err(unsupported("PSB/version2 is not supported."));
    }
    if input.take(6)?.iter().any(|&v| v != 0) {
        return Err(invalid("Invalid PSD reserved header."));
    }
    let channels = input.u16()?;
    let height = input.u32()?;
    let width = input.u32()?;
    if !(3..=4).contains(&channels) {
        return Err(unsupported(
            "Additional document channels are not supported.",
        ));
    }
    if width == 0 || height == 0 || width > MAX_IMAGE_SIDE || height > MAX_IMAGE_SIDE {
        return Err(invalid(
            "PSD canvas dimensions must be between 1 and 4096 pixels.",
        ));
    }
    if input.u16()? != 8 || input.u16()? != 3 {
        return Err(unsupported("Only RGB 8-bit PSD is supported."));
    }
    input.section()?.empty()?; // RGB has no color-mode data.
    resources(input.section()?)?;
    let mut mask = input.section()?;
    if mask.remaining() == 0 {
        return Err(unsupported("PSD must contain ordinary raster layers."));
    }
    let mut info = mask.section()?;
    let count = i32::from(info.i16()?).unsigned_abs() as usize;
    if count == 0 || count > MAX_LAYERS {
        return Err(invalid("PSD must contain between 1 and 128 raster layers."));
    }
    let mut records = Vec::with_capacity(count);
    let mut total = 0usize;
    for _ in 0..count {
        let top = info.i32()?;
        let left = info.i32()?;
        let bottom = info.i32()?;
        let right = info.i32()?;
        let w = i64::from(right) - i64::from(left);
        let h = i64::from(bottom) - i64::from(top);
        if w <= 0 || h <= 0 || w > i64::from(MAX_IMAGE_SIDE) || h > i64::from(MAX_IMAGE_SIDE) {
            return Err(unsupported(
                "Empty or oversized raster layer bounds are not supported.",
            ));
        }
        let pixels = (w as usize)
            .checked_mul(h as usize)
            .and_then(|n| n.checked_mul(4))
            .ok_or_else(|| invalid("Layer size overflow."))?;
        total = total
            .checked_add(pixels)
            .filter(|n| *n <= MAX_RGBA_BYTES)
            .ok_or_else(|| invalid("PSD aggregate layer pixels exceed 128 MiB."))?;
        let n = info.u16()?;
        if !(3..=4).contains(&n) {
            return Err(unsupported(
                "Layer masks or additional channels are not supported.",
            ));
        }
        let mut descriptors = Vec::with_capacity(n as usize);
        let mut ids = BTreeSet::new();
        for _ in 0..n {
            let id = info.i16()?;
            let len = info.u32()? as usize;
            if ![-1, 0, 1, 2].contains(&id) || !ids.insert(id) || len < 2 {
                return Err(unsupported(
                    "Duplicate, missing or unsupported layer channels.",
                ));
            }
            descriptors.push((id, len));
        }
        if ![0, 1, 2].iter().all(|id| ids.contains(id)) {
            return Err(invalid("RGB layer channels are incomplete."));
        }
        if info.take(4)? != b"8BIM" {
            return Err(invalid("Invalid PSD blend signature."));
        }
        if info.take(4)? != b"norm" {
            return Err(unsupported(
                "Only normal blend raster layers are supported.",
            ));
        }
        let opacity = info.u8()?;
        if info.u8()? != 0 {
            return Err(unsupported("Clipping layers are not supported."));
        }
        let flags = info.u8()?;
        if flags & !0x0b != 0 || info.u8()? != 0 {
            return Err(unsupported("Unsupported layer appearance flags."));
        }
        let name = layer_extra(info.section()?)?;
        records.push(Record {
            name,
            left,
            top,
            width: w as u32,
            height: h as u32,
            visible: flags & 2 == 0,
            opacity,
            descriptors,
            channels: Vec::new(),
        });
    }
    // Bind every declared channel before any decoded image allocation.
    for record in &mut records {
        for &(id, len) in &record.descriptors {
            record.channels.push(Channel {
                id,
                data: info.take(len)?,
            });
        }
    }
    if info.remaining() == 1 && info.u8()? != 0 {
        return Err(invalid("Invalid layer-info padding."));
    }
    info.empty()?;
    // A global mask/extra block must never silently affect the imported collage.
    if mask.remaining() != 0 {
        mask.section()?.empty()?;
        if mask.remaining() != 0 {
            return Err(unsupported(
                "Global layer metadata/masks are not supported.",
            ));
        }
    }
    validate_composite(input, width, height, channels)?;
    // Validate all compressed planes first, including exact per-row output sizes.
    for record in &records {
        for channel in &record.channels {
            plane(channel.data, record.width, record.height, None)?;
        }
    }
    let mut layers = Vec::with_capacity(count);
    let mut png_bytes = 0usize;
    for record in records {
        let mut rgba = vec![255u8; record.width as usize * record.height as usize * 4];
        for channel in &record.channels {
            let offset = match channel.id {
                0 => 0,
                1 => 1,
                2 => 2,
                -1 => 3,
                _ => unreachable!(),
            };
            plane(
                channel.data,
                record.width,
                record.height,
                Some((&mut rgba, offset)),
            )?;
        }
        let mut encoded = Vec::new();
        {
            let mut encoder = png::Encoder::new(&mut encoded, record.width, record.height);
            encoder.set_color(png::ColorType::Rgba);
            encoder.set_depth(png::BitDepth::Eight);
            let mut writer = encoder
                .write_header()
                .map_err(|e| invalid(format!("PSD PNG encoding: {e}")))?;
            writer
                .write_image_data(&rgba)
                .map_err(|e| invalid(format!("PSD PNG pixels: {e}")))?;
            writer
                .finish()
                .map_err(|e| invalid(format!("PSD PNG finish: {e}")))?;
        }
        if encoded.len() > MAX_PNG_BYTES {
            return Err(invalid("A PSD layer PNG exceeds 16 MiB."));
        }
        png_bytes = png_bytes
            .checked_add(encoded.len())
            .filter(|n| *n <= 128 * 1024 * 1024)
            .ok_or_else(|| invalid("PSD encoded images exceed 128 MiB."))?;
        let image = ImageAsset::from_bytes(encoded)?;
        layers.push(PsdLayer {
            name: record.name,
            left: record.left,
            top: record.top,
            width: record.width,
            height: record.height,
            visible: record.visible,
            opacity: record.opacity,
            image,
        });
    }
    // PSD wire records are bottom-to-top; no sorting or independent centering.
    Ok(PsdDocument {
        width,
        height,
        layers,
    })
}
fn resources(mut resources: Reader<'_>) -> Result<()> {
    let mut count = 0;
    while resources.remaining() != 0 {
        count += 1;
        if count > 4096 {
            return Err(invalid("PSD resource count exceeds limit."));
        }
        if resources.take(4)? != b"8BIM" {
            return Err(invalid("Invalid PSD resource signature."));
        }
        let id = resources.u16()?;
        let n = resources.u8()? as usize;
        resources.take(n)?;
        if !(n + 1).is_multiple_of(2) {
            resources.take(1)?;
        }
        let len = resources.u32()? as usize;
        let data = resources.take(len)?;
        if !len.is_multiple_of(2) {
            resources.take(1)?;
        }
        // ICC-managed display equivalence is outside the raw RGB8 v1 policy.
        if id == 1039 && !data.is_empty() {
            return Err(unsupported(
                "Embedded ICC color profiles are not supported.",
            ));
        }
        // These document-level settings can describe a visible Spot overlay.
        // Their channel-kind layout is outside this parser's supported profile.
        if matches!(id, 1007 | 1077) && !data.is_empty() {
            return Err(unsupported(
                "Extra-channel display settings are not supported. Remove extra/spot channels before exporting the PSD.",
            ));
        }
    }
    Ok(())
}
fn layer_extra(mut extra: Reader<'_>) -> Result<String> {
    if extra.u32()? != 0 {
        return Err(unsupported("Layer masks are not supported."));
    }
    let ranges = extra.section()?;
    if !ranges.bytes.is_empty()
        && (ranges.bytes.len() != 32
            || ranges
                .bytes
                .chunks_exact(8)
                .any(|v| v != [0, 0, 255, 255, 0, 0, 255, 255]))
    {
        return Err(unsupported(
            "Custom layer blending ranges are not supported.",
        ));
    }
    let len = extra.u8()? as usize;
    let legacy = extra.take(len)?;
    let pad = (4 - (len + 1) % 4) % 4;
    extra.take(pad)?;
    let mut unicode = None;
    let mut tags = BTreeSet::new();
    while extra.remaining() != 0 {
        if extra.take(4)? != b"8BIM" {
            return Err(invalid("Invalid additional layer signature."));
        }
        let key = extra.take(4)?;
        let n = extra.u32()? as usize;
        let data = extra.take(n)?;
        if !n.is_multiple_of(2) {
            extra.take(1)?;
        }
        if tags.len() >= 64 || !tags.insert(key.to_vec()) {
            return Err(invalid("Duplicate/excessive PSD layer tags."));
        }
        match key {
            b"luni" => {
                let mut value = Reader::new(data);
                let n = value.u32()? as usize;
                if n > MAX_NAME_UNITS || n.checked_mul(2) != Some(value.remaining()) {
                    return Err(invalid("Invalid bounded PSD Unicode name."));
                }
                let units = (0..n).map(|_| value.u16()).collect::<Result<Vec<_>>>()?;
                unicode = Some(
                    String::from_utf16(&units)
                        .map_err(|_| invalid("Invalid UTF-16 layer name."))?
                        .trim_end_matches('\0')
                        .to_owned(),
                );
            }
            b"lyid" if n == 4 => {}
            b"lspf"
                if n == 4
                    && u32::from_be_bytes(
                        data.try_into()
                            .map_err(|_| invalid("Invalid protection flags."))?,
                    ) & !7
                        == 0 => {}
            b"lclr" if n == 8 && data[2..].iter().all(|&v| v == 0) => {}
            b"fxrp"
                if n == 16
                    && data.chunks_exact(8).all(|v| {
                        f64::from_be_bytes(v.try_into().expect("fixed chunk")).is_finite()
                    }) => {}
            b"clbl" | b"infx" if data == [1, 0, 0, 0] => {}
            b"knko" if data == [0, 0, 0, 0] => {}
            b"iOpa" if data == [255, 0, 0, 0] => {}
            _ => {
                return Err(unsupported(format!(
                    "Layer tag '{}' is outside the supported raster profile.",
                    String::from_utf8_lossy(key)
                )))
            }
        }
    }
    let name = match unicode {
        Some(name) => name,
        None => {
            if !legacy.is_ascii() {
                return Err(unsupported(
                    "Non-ASCII legacy names require a Unicode luni name.",
                ));
            }
            String::from_utf8(legacy.to_vec()).map_err(|_| invalid("Invalid legacy layer name."))?
        }
    };
    if name.contains('\0') {
        return Err(invalid("Embedded NUL in PSD layer name."));
    }
    Ok(name)
}
// PackBits reads are row-framed, and a no-op always consumes one source byte.
fn unpack(row: &[u8], width: usize, mut emit: impl FnMut(usize, u8)) -> Result<()> {
    let mut input = Reader::new(row);
    let mut produced = 0usize;
    while input.remaining() != 0 {
        let header = input.u8()? as i8;
        if header == -128 {
            continue;
        }
        let n = if header >= 0 {
            header as usize + 1
        } else {
            (1 - i16::from(header)) as usize
        };
        if produced.checked_add(n).filter(|&n| n <= width).is_none() {
            return Err(invalid("PackBits row exceeds its declared width."));
        }
        if header >= 0 {
            for &v in input.take(n)? {
                emit(produced, v);
                produced += 1;
            }
        } else {
            let v = input.u8()?;
            for _ in 0..n {
                emit(produced, v);
                produced += 1;
            }
        }
    }
    if produced != width {
        return Err(invalid("PackBits row does not fill its declared width."));
    }
    Ok(())
}
fn plane(
    data: &[u8],
    width: u32,
    height: u32,
    mut output: Option<(&mut [u8], usize)>,
) -> Result<()> {
    let mut input = Reader::new(data);
    let w = width as usize;
    let h = height as usize;
    match input.u16()? {
        0 => {
            let raw = input.take(w * h)?;
            input.empty()?;
            if let Some((rgba, offset)) = output {
                for (i, &v) in raw.iter().enumerate() {
                    rgba[i * 4 + offset] = v;
                }
            }
        }
        1 => {
            let mut sizes = Vec::with_capacity(h);
            let mut total = 0usize;
            for _ in 0..h {
                let n = input.u16()? as usize;
                total = total
                    .checked_add(n)
                    .ok_or_else(|| invalid("RLE length overflow."))?;
                sizes.push(n);
            }
            if total != input.remaining() {
                return Err(invalid("RLE row lengths differ from channel length."));
            }
            for (y, n) in sizes.into_iter().enumerate() {
                unpack(input.take(n)?, w, |x, v| {
                    if let Some((rgba, offset)) = &mut output {
                        rgba[(y * w + x) * 4 + *offset] = v;
                    }
                })?;
            }
        }
        _ => {
            return Err(unsupported(
                "ZIP/unknown channel compression is not supported.",
            ))
        }
    }
    Ok(())
}
fn validate_composite(mut input: Reader<'_>, width: u32, height: u32, channels: u16) -> Result<()> {
    // A writer may omit the merged preview entirely. Never use it as a layer.
    if input.remaining() == 0 {
        return Ok(());
    }
    match input.u16()? {
        0 => {
            input.take(width as usize * height as usize * channels as usize)?;
            input.empty()?;
        }
        1 => {
            let rows = height as usize * channels as usize;
            let mut sizes = Vec::with_capacity(rows);
            let mut sum = 0usize;
            for _ in 0..rows {
                let n = input.u16()? as usize;
                sum = sum
                    .checked_add(n)
                    .ok_or_else(|| invalid("Composite row overflow."))?;
                sizes.push(n);
            }
            if sum != input.remaining() {
                return Err(invalid("Composite row lengths mismatch."));
            }
            for n in sizes {
                unpack(input.take(n)?, width as usize, |_, _| {})?;
            }
        }
        _ => {
            return Err(unsupported(
                "ZIP/unknown merged-image compression is not supported.",
            ))
        }
    }
    Ok(())
}

#[cfg(test)]
#[path = "psd_fixtures.rs"]
pub(crate) mod fixtures;
