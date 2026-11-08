//! Own rectangular surfaces. No personal geometry or original assets are used.
use fbones_format::minimal::{
    meshes::{Mesh, Vertex},
    scene::*,
};

/// Boundary vertices precede interior vertices; faces are authored directly,
/// independently of either triangulation implementation under test.
pub(crate) fn mesh(columns: usize, rows: usize, weighted: bool) -> Mesh {
    assert!(columns >= 2 && rows >= 2);
    let mut points = vec![];
    points.extend((0..columns).map(|x| (x, 0)));
    points.extend((1..rows).map(|y| (columns - 1, y)));
    points.extend((0..columns - 1).rev().map(|x| (x, rows - 1)));
    points.extend((1..rows - 1).rev().map(|y| (0, y)));
    let hull = points.len();
    for y in 1..rows - 1 {
        points.extend((1..columns - 1).map(|x| (x, y)));
    }
    let mut indices = vec![0u16; columns * rows];
    for (index, &(x, y)) in points.iter().enumerate() {
        indices[y * columns + x] = index as u16;
    }
    let mut triangles = vec![];
    for y in 0..rows - 1 {
        for x in 0..columns - 1 {
            let a = indices[y * columns + x];
            let b = indices[y * columns + x + 1];
            let c = indices[(y + 1) * columns + x + 1];
            let d = indices[(y + 1) * columns + x];
            triangles.extend([a, b, c, a, c, d]);
        }
    }
    let mut image = crate::scene_wire_fixture::project().slots[1].attachments[0]
        .mesh()
        .unwrap()
        .image
        .clone();
    image.width = 64.;
    image.height = 64.;
    Mesh {
        image,
        weighted,
        uvs: points
            .iter()
            .flat_map(|&(x, y)| {
                [
                    x as f32 / (columns - 1) as f32,
                    y as f32 / (rows - 1) as f32,
                ]
            })
            .collect(),
        triangles,
        edges: (0..hull)
            .flat_map(|i| [i as u32, ((i + 1) % hull) as u32])
            .collect(),
        hull,
        bones: if weighted { vec![1, 2] } else { vec![2] },
        vertices: points
            .iter()
            .map(|&(x, y)| {
                let x = 64. * (x as f32 / (columns - 1) as f32 - 0.5);
                let y = 64. * (y as f32 / (rows - 1) as f32 - 0.5);
                Vertex {
                    weights: if weighted { vec![0.25, 0.75] } else { vec![1.] },
                    positions: if weighted {
                        vec![x + 30., y, x - 30., y]
                    } else {
                        vec![x - 30., y]
                    },
                }
            })
            .collect(),
    }
}

pub(crate) fn project(columns: usize, rows: usize) -> SceneProject {
    let mut project = crate::scene_wire_fixture::project();
    project.rig.name = "Own large Mesh surface".into();
    project.wire = None;
    project.slots[1].attachments[0] = SceneAttachment::Mesh(Box::new(mesh(columns, rows, true)));
    let mut animation = Animation::new("surface".into());
    let count = columns * rows * 4;
    animation.deform_tracks.push(DeformTimeline {
        attachment: AttachmentAddress {
            slot: 1,
            attachment: 0,
        },
        keys: vec![
            DeformKey {
                frame: 0.,
                offsets: vec![0.; count],
                data_present: true,
                curve: DeformCurve::Linear,
            },
            DeformKey {
                frame: 12.,
                offsets: (0..count)
                    .map(|i| if i % 2 == 0 { 0.25 } else { -0.5 })
                    .collect(),
                data_present: true,
                curve: DeformCurve::Linear,
            },
        ],
    });
    project.animations = vec![animation, Animation::new("empty".into())];
    project
}
