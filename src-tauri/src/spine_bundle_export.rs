//! Spine game textures and their atlas. The JSON serializer owns the region keys.
use crate::{
    audio::AudioCache,
    images::{valid_image_stem, ImageAsset, ImageCache, MAX_IMAGE_SIDE},
    project::AppError,
    runtime_export::write_resource,
    spine_json_export::SpineJson,
};
use serde::Serialize;
use std::{fmt::Write, fs, io::Cursor, path::Path, sync::Arc};

const PAGE_SIDE: u32 = MAX_IMAGE_SIDE;
const BORDER: u32 = 1;

fn invalid(message: impl Into<String>) -> AppError {
    AppError::new("SpineBundleExport", message)
}

pub struct Snapshot {
    pub revision: u64,
    pub document_id: u64,
    json: Vec<u8>,
    images: Vec<Image>,
    audio: AudioCache,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ResultBundle {
    path: String,
    page_count: usize,
}

struct Image {
    key: String,
    asset: Arc<ImageAsset>,
}

impl Snapshot {
    pub fn new(
        revision: u64,
        document_id: u64,
        json: SpineJson,
        images: &ImageCache,
        audio: &AudioCache,
    ) -> Result<Self, AppError> {
        let mut textures = Vec::new();
        for key in json.image_keys {
            if !valid_image_stem(&key) || key.trim() != key {
                return Err(invalid(format!(
                    "This image key cannot be written to an atlas: {key}"
                )));
            }
            let asset = images.get(&key).ok_or_else(|| {
                AppError::new(
                    "MissingImage",
                    format!("Spine export needs this PNG: {key}"),
                )
            })?;
            textures.push(Image {
                key,
                asset: asset.clone(),
            });
        }
        textures.sort_by_key(|image| std::cmp::Reverse((image.asset.height, image.asset.width)));
        let mut sounds = AudioCache::default();
        for key in json.audio_keys {
            if !crate::audio::valid_key(&key) {
                return Err(invalid(format!("This audio key is not portable: {key}")));
            }
            let asset = audio.get(&key).ok_or_else(|| {
                AppError::new(
                    "MissingAudio",
                    format!("Spine export needs this WAV: {key}"),
                )
            })?;
            sounds.insert(key, asset.clone())?;
        }
        Ok(Self {
            revision,
            document_id,
            json: json.bytes,
            images: textures,
            audio: sounds,
        })
    }

    pub fn write(self, parent: &Path) -> Result<ResultBundle, AppError> {
        let output = tempfile::Builder::new()
            .prefix("FBones-spine-")
            .tempdir_in(parent)?;
        let pages = pack(&self.images);
        let mut atlas = String::new();
        for (index, page) in pages.iter().enumerate() {
            let name = if index == 0 {
                "skeleton.png".to_owned()
            } else {
                format!("skeleton_{}.png", index + 1)
            };
            if index > 0 {
                atlas.push('\n');
            }
            let (width, height) = (page.width, page.height);
            writeln!(
                atlas,
                "{name}\nsize:{width},{height}\nfilter:Linear,Linear\npma:false"
            )
            .unwrap();
            for region in &page.regions {
                let (w, h) = (region.image.asset.width, region.image.asset.height);
                writeln!(
                    atlas,
                    "{}\nbounds:{},{},{w},{h}",
                    region.image.key, region.x, region.y
                )
                .unwrap();
            }
            let path = output.path().join(name);
            if let Some(image) = page.dedicated {
                write_resource(&path, image.asset.bytes())?;
            } else {
                page.write_png(&path)?;
            }
        }
        for (key, asset) in self.audio.entries() {
            write_resource(&output.path().join("audio").join(key), asset.bytes())?;
        }
        write_resource(&output.path().join("skeleton.atlas"), atlas.as_bytes())?;
        write_resource(&output.path().join("skeleton.json"), &self.json)?;
        Ok(ResultBundle {
            path: output.keep().to_string_lossy().into_owned(),
            page_count: pages.len(),
        })
    }
}

struct Region<'a> {
    image: &'a Image,
    x: u32,
    y: u32,
}

struct Page<'a> {
    width: u32,
    height: u32,
    regions: Vec<Region<'a>>,
    dedicated: Option<&'a Image>,
}

impl<'a> Page<'a> {
    fn new() -> Self {
        Self {
            width: 1,
            height: 1,
            regions: Vec::new(),
            dedicated: None,
        }
    }

    fn write_png(&self, path: &Path) -> Result<(), AppError> {
        let mut pixels = vec![0; (self.width * self.height * 4) as usize];
        for region in &self.regions {
            let asset = &region.image.asset;
            let image = decode_rgba(asset)?;
            let (width, height) = (asset.width as usize, asset.height as usize);
            let stride = self.width as usize * 4;
            let (base_x, base_y) = (region.x as usize - 1, region.y as usize - 1);
            for dy in 0..height + 2 {
                let sy = dy.saturating_sub(1).min(height - 1);
                let row_start = (base_y + dy) * stride + base_x * 4;
                let src_start = sy * width * 4;
                let row = &image[src_start..src_start + width * 4];
                pixels[row_start..row_start + 4].copy_from_slice(&row[..4]);
                pixels[row_start + 4..row_start + (width + 1) * 4].copy_from_slice(row);
                pixels[row_start + (width + 1) * 4..row_start + (width + 2) * 4]
                    .copy_from_slice(&row[(width - 1) * 4..]);
            }
        }
        let mut file = fs::OpenOptions::new()
            .create_new(true)
            .write(true)
            .open(path)?;
        let mut encoder = png::Encoder::new(&mut file, self.width, self.height);
        encoder.set_color(png::ColorType::Rgba);
        encoder.set_depth(png::BitDepth::Eight);
        let mut writer = encoder
            .write_header()
            .map_err(|error| invalid(error.to_string()))?;
        writer
            .write_image_data(&pixels)
            .map_err(|error| invalid(error.to_string()))?;
        writer
            .finish()
            .map_err(|error| invalid(error.to_string()))?;
        file.sync_all()?;
        Ok(())
    }
}

fn pack(images: &[Image]) -> Vec<Page<'_>> {
    let mut pages = Vec::new();
    let mut page = Page::new();
    let (mut x, mut y, mut row_height) = (0, 0, 0);
    for image in images {
        let (width, height) = (image.asset.width, image.asset.height);
        let (padded_w, padded_h) = (width + 2 * BORDER, height + 2 * BORDER);
        if padded_w > PAGE_SIDE || padded_h > PAGE_SIDE {
            pages.push(Page {
                width,
                height,
                regions: vec![Region { image, x: 0, y: 0 }],
                dedicated: Some(image),
            });
            continue;
        }
        if x + padded_w > PAGE_SIDE {
            x = 0;
            y += row_height;
            row_height = 0;
        }
        if y + padded_h > PAGE_SIDE {
            pages.push(page);
            page = Page::new();
            (x, y, row_height) = (0, 0, 0);
        }
        page.regions.push(Region {
            image,
            x: x + BORDER,
            y: y + BORDER,
        });
        page.width = page.width.max(x + padded_w);
        page.height = page.height.max(y + padded_h);
        x += padded_w;
        row_height = row_height.max(padded_h);
    }
    if !page.regions.is_empty() || pages.is_empty() {
        pages.push(page);
    }
    pages
}

fn decode_rgba(asset: &ImageAsset) -> Result<Vec<u8>, AppError> {
    let mut decoder = png::Decoder::new_with_limits(
        Cursor::new(asset.bytes()),
        png::Limits {
            bytes: (PAGE_SIDE * PAGE_SIDE * 4) as usize,
        },
    );
    decoder.set_transformations(png::Transformations::EXPAND | png::Transformations::STRIP_16);
    let mut reader = decoder
        .read_info()
        .map_err(|error| invalid(error.to_string()))?;
    let mut decoded = vec![
        0;
        reader
            .output_buffer_size()
            .ok_or_else(|| invalid("PNG exceeds the atlas decode budget."))?
    ];
    let info = reader
        .next_frame(&mut decoded)
        .map_err(|error| invalid(error.to_string()))?;
    decoded.truncate(info.buffer_size());
    let depth = info.color_type.samples();
    if depth == 4 {
        return Ok(decoded);
    }
    let mut rgba = Vec::with_capacity((asset.width * asset.height * 4) as usize);
    for pixel in decoded.chunks_exact(depth) {
        let color = match info.color_type {
            png::ColorType::Grayscale => [pixel[0], pixel[0], pixel[0], 255],
            png::ColorType::GrayscaleAlpha => [pixel[0], pixel[0], pixel[0], pixel[1]],
            png::ColorType::Rgb => [pixel[0], pixel[1], pixel[2], 255],
            _ => return Err(invalid("Unexpected transformed PNG color format.")),
        };
        rgba.extend_from_slice(&color);
    }
    Ok(rgba)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn full_width_images_use_dedicated_pages_and_packed_pixels_are_extruded() {
        let mut png = Vec::new();
        {
            let mut encoder = png::Encoder::new(&mut png, MAX_IMAGE_SIDE, 1);
            encoder.set_color(png::ColorType::GrayscaleAlpha);
            encoder.set_depth(png::BitDepth::Eight);
            let mut writer = encoder.write_header().unwrap();
            writer
                .write_image_data(&vec![49; MAX_IMAGE_SIDE as usize * 2])
                .unwrap();
            writer.finish().unwrap();
        }
        let mut images = ImageCache::default();
        images
            .insert("wide".into(), ImageAsset::from_bytes(png.clone()).unwrap())
            .unwrap();
        let color = [13, 71, 118, 203];
        images
            .insert(
                "small".into(),
                ImageAsset::from_bytes(crate::images::tests::png(color)).unwrap(),
            )
            .unwrap();
        let snapshot = Snapshot::new(
            1,
            1,
            SpineJson {
                bytes: b"{}".to_vec(),
                image_keys: vec!["wide".into(), "small".into()],
                audio_keys: vec![],
            },
            &images,
            &AudioCache::default(),
        )
        .unwrap();
        let tmp = tempfile::tempdir().unwrap();
        let output = snapshot.write(tmp.path()).unwrap();
        assert_eq!(output.page_count, 2);
        let root = Path::new(&output.path);
        assert_eq!(fs::read(root.join("skeleton.png")).unwrap(), png);
        let atlas = fs::read_to_string(root.join("skeleton.atlas")).unwrap();
        assert!(atlas.contains("wide\nbounds:0,0,4096,1\n\nskeleton_2.png"));
        let packed = ImageAsset::read(&root.join("skeleton_2.png")).unwrap();
        assert_eq!(
            decode_rgba(&packed).unwrap(),
            color.repeat((packed.width * packed.height) as usize)
        );
    }
}
