use super::*;
use crate::minimal::{
    meshes::{Mesh, Vertex},
    regions::{Region, RegionProject},
    Bone, MinimalProject,
};
fn mesh(n: usize, columns: usize) -> Mesh {
    let (points, hull, triangles) = if n == 512 {
        let (w, h) = (32usize, 16usize);
        let mut points = vec![];
        points.extend((0..w).map(|x| (x, 0)));
        points.extend((1..h).map(|y| (w - 1, y)));
        points.extend((0..w - 1).rev().map(|x| (x, h - 1)));
        points.extend((1..h - 1).rev().map(|y| (0, y)));
        let hull = points.len();
        points.extend((1..h - 1).flat_map(|y| (1..w - 1).map(move |x| (x, y))));
        let indices: std::collections::HashMap<_, _> = points
            .iter()
            .enumerate()
            .map(|(i, p)| (*p, i as u16))
            .collect();
        let mut tris = vec![];
        for y in 0..h - 1 {
            for x in 0..w - 1 {
                let [a, b, c, d] =
                    [(x, y), (x + 1, y), (x + 1, y + 1), (x, y + 1)].map(|p| indices[&p]);
                tris.extend([a, b, c, a, c, d]);
            }
        }
        (
            points
                .iter()
                .map(|(x, y)| [*x as f32 / (w - 1) as f32, *y as f32 / (h - 1) as f32])
                .collect::<Vec<_>>(),
            hull,
            tris,
        )
    } else {
        let pts = (0..n)
            .map(|i| {
                let a = i as f64 * std::f64::consts::TAU / n as f64;
                [(0.5 + 0.45 * a.cos()) as f32, (0.5 + 0.45 * a.sin()) as f32]
            })
            .collect::<Vec<_>>();
        let tris = (1..n - 1)
            .flat_map(|i| [0, i as u16, (i + 1) as u16])
            .collect();
        (pts, n, tris)
    };
    let vertices = points
        .iter()
        .enumerate()
        .map(|(i, p)| {
            let mut weights = vec![0.; columns];
            if columns == 1 {
                weights[0] = 1.;
            } else {
                weights[0] = 0.25;
                weights[1] = 0.75;
            }
            let mut positions = (0..columns)
                .flat_map(|c| {
                    [
                        p[0] * 100. + c as f32 * 0.125,
                        p[1] * -80. - c as f32 * 0.25,
                    ]
                })
                .collect::<Vec<_>>();
            if i == 0 {
                positions[0] = -0.;
            }
            Vertex { weights, positions }
        })
        .collect();
    Mesh {
        image: Region {
            name: "own large surface".into(),
            path: String::new(),
            x: 0.,
            y: 0.,
            rotation: 0.,
            scale_x: 1.,
            scale_y: 1.,
            width: 32.,
            height: 24.,
        },
        weighted: columns > 1,
        uvs: points.into_iter().flatten().collect(),
        triangles,
        edges: (0..hull)
            .flat_map(|i| [i as u32, ((i + 1) % hull) as u32])
            .collect(),
        hull,
        bones: (0..columns).collect(),
        vertices,
    }
}
fn project(mesh: Mesh) -> SceneProject {
    let mut rig = MinimalProject::new("own Scene mesh capacity".into(), [83; 16]);
    for i in 1..mesh.bones.len() {
        rig.bones.push(Bone {
            name: format!("influence{i}"),
            parent: Some(0),
            ..Bone::root()
        });
    }
    let mut p = SceneProject::from(&RegionProject {
        rig,
        images_root: "./images".into(),
        slots: vec![],
        region_order: vec![],
    });
    p.slots.push(SceneSlot {
        name: "surface".into(),
        bone: 0,
        color: [255; 4],
        blend: BlendMode::Normal,
        attachments: vec![SceneAttachment::Mesh(Box::new(mesh))],
        active_attachment: Some(0),
    });
    p.attachment_order.push(AttachmentAddress {
        slot: 0,
        attachment: 0,
    });
    p
}
fn roundtrip(p: &SceneProject) -> Vec<u8> {
    let bytes = encode_scene_payload(p).unwrap();
    let decoded = decode_scene(&bytes).unwrap();
    assert_eq!(&decoded, p);
    assert_eq!(encode_scene_payload(&decoded).unwrap(), bytes);
    bytes
}
fn surface(p: &mut SceneProject) -> &mut Mesh {
    p.slots[0].attachments[0].mesh_mut().unwrap()
}
#[test]
fn scene_large_meshes_roundtrip_whole_shape_bits_and_legacy_stays_256() {
    for n in [256, 257, 301, 308, 512] {
        for columns in [1, 2] {
            let p = project(mesh(n, columns));
            let bytes = roundtrip(&p);
            let decoded = decode_scene(&bytes).unwrap();
            let m = decoded.slots[0].attachments[0].mesh().unwrap();
            assert_eq!(m.vertices.len(), n);
            assert_eq!(m.vertices[0].positions[0].to_bits(), (-0_f32).to_bits());
            assert_eq!(m.uvs.len(), n * 2);
            if n > 256 {
                assert!(p.to_regions().is_err());
                assert!(crate::minimal::regions::decode_regions(&bytes).is_err());
            } else {
                assert!(p.to_regions().is_ok());
            }
        }
    }
    let p = project(mesh(512, 128));
    roundtrip(&p);
    assert_eq!(p.rig.bones.len(), 128);
    assert_eq!(
        p.slots[0].attachments[0].mesh().unwrap().vertices[511]
            .positions
            .len(),
        256
    );
}
#[test]
fn scene_mesh_capacity_keeps_indices_columns_clip_and_aggregate_separate() {
    let p = project(mesh(512, 2));
    assert!(surface(&mut p.clone()).triangles.len() > 1536);
    let mut bad = project(mesh(513, 1));
    assert!(encode_scene_payload(&bad).is_err());
    bad = p.clone();
    surface(&mut bad).triangles = [0, 1, 2].repeat(MAX_SCENE_MESH_TRIANGLE_INDICES / 3 + 1);
    assert!(encode_scene_payload(&bad).is_err());
    bad = p.clone();
    surface(&mut bad).triangles[0] = 512;
    assert!(encode_scene_payload(&bad).is_err());
    bad = p.clone();
    surface(&mut bad).edges[0] = 512;
    assert!(encode_scene_payload(&bad).is_err());
    bad = p.clone();
    surface(&mut bad).uvs[0] = f32::NAN;
    assert!(encode_scene_payload(&bad).is_err());
    bad = p.clone();
    surface(&mut bad).uvs.pop();
    assert!(encode_scene_payload(&bad).is_err());
    bad = project(mesh(512, 129));
    assert!(encode_scene_payload(&bad).is_err());
    bad = p.clone();
    surface(&mut bad).vertices[511].weights[0] = 0.;
    assert!(encode_scene_payload(&bad).is_err());
    let mut total = p.clone();
    for i in 1..8 {
        let mut s = total.slots[0].clone();
        s.name = format!("surface{i}");
        total.slots.push(s);
        total.attachment_order.push(AttachmentAddress {
            slot: i,
            attachment: 0,
        });
    }
    roundtrip(&total);
    let mut extra = total.slots[0].clone();
    extra.name = "over total".into();
    extra.attachments[0] = SceneAttachment::Mesh(Box::new(mesh(3, 2)));
    total.slots.push(extra);
    total.attachment_order.push(AttachmentAddress {
        slot: 8,
        attachment: 0,
    });
    assert!(encode_scene_payload(&total).is_err());
    let mut clip = project(mesh(257, 1));
    let m = surface(&mut clip).clone();
    clip.slots[0].attachments[0] = SceneAttachment::Clipping(Clipping {
        name: "own clip".into(),
        end_slot: None,
        convex: true,
        inverse: false,
        color: [255; 4],
        weighted: false,
        bones: m.bones,
        vertices: m.vertices,
        edges: m.edges,
    });
    assert!(encode_scene_payload(&clip).is_err());
}
#[test]
fn large_zero_size_source_mesh_keeps_geometry_without_author_permission() {
    let mut p = project(mesh(308, 2));
    surface(&mut p).image.width = 0.;
    surface(&mut p).image.height = -0.;
    assert!(encode_scene_payload(&p).is_err());
    p.wire = Some(SceneWire {
        source_state: None,
        slot_references_8: vec![],
        editor_metadata: None,
        constraint_declarations: None,
        editor_scalar_46: FiniteF32::new(50.).unwrap(),
        skeleton_bounds_24: [FiniteF32::new(-0.).unwrap(); 4],
        strings: vec![],
        zero_size_meshes: vec![AttachmentAddress {
            slot: 0,
            attachment: 0,
        }],
        animation_layouts: vec![animation_layout(&p, 0).unwrap()],
    });
    normalize_wire_strings(&mut p).unwrap();
    roundtrip(&p);
    assert_eq!(surface(&mut p).image.height.to_bits(), (-0_f32).to_bits());
}
