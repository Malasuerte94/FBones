//! Controlled mesh/binding profile. Kept inspection-only by the desktop until
//! its persistence, geometry tools and weighted skinning are integrated.
use super::*;
use regions::Region;

#[derive(Clone, Debug, PartialEq)]
pub struct Vertex {
    /// Dense weights/positions over Mesh::bones. Zero influences use [0,0].
    pub weights: Vec<f32>,
    pub positions: Vec<f32>,
}
#[derive(Clone, Debug, PartialEq)]
pub struct Mesh {
    /// Image identity/dimensions; transforms are baked into vertex positions.
    pub image: Region,
    pub weighted: bool,
    pub uvs: Vec<f32>,
    pub triangles: Vec<u16>,
    pub edges: Vec<u32>,
    pub hull: usize,
    pub bones: Vec<usize>,
    pub vertices: Vec<Vertex>,
}

pub(super) fn validate_mesh(
    mesh: &Mesh,
    owner: usize,
    bone_count: usize,
) -> Result<(), FormatError> {
    let unsupported = || FormatError::UnsupportedProfile;
    let n = mesh.vertices.len();
    if !(3..=256).contains(&n)
        || mesh.uvs.len() != n * 2
        || mesh.hull < 3
        || mesh.hull > n
        || mesh.bones.is_empty()
        || mesh.bones.len() > 128
        || mesh.triangles.is_empty()
        || !mesh.triangles.len().is_multiple_of(3)
        || mesh.triangles.len() > 1536
        || !mesh.edges.len().is_multiple_of(2)
        || mesh.edges.len() > 4096
        || mesh
            .uvs
            .iter()
            .any(|v| !v.is_finite() || !(0.0..=1.0).contains(v))
        || mesh.image.x != 0.0
        || mesh.image.y != 0.0
        || mesh.image.rotation != 0.0
        || mesh.image.scale_x != 1.0
        || mesh.image.scale_y != 1.0
    {
        return Err(unsupported());
    }
    let mut bones = std::collections::HashSet::new();
    if mesh
        .bones
        .iter()
        .any(|b| *b >= bone_count || !bones.insert(*b))
    {
        return Err(unsupported());
    }
    if !mesh.weighted && mesh.bones != [owner] {
        return Err(unsupported());
    }
    for triangle in mesh.triangles.chunks_exact(3) {
        if triangle.iter().any(|i| *i as usize >= n)
            || triangle[0] == triangle[1]
            || triangle[1] == triangle[2]
            || triangle[2] == triangle[0]
        {
            return Err(unsupported());
        }
    }
    for edge in mesh.edges.chunks_exact(2) {
        if edge.iter().any(|i| *i as usize >= n) || edge[0] == edge[1] {
            return Err(unsupported());
        }
    }
    for vertex in &mesh.vertices {
        if vertex.weights.len() != mesh.bones.len()
            || vertex.positions.len() != mesh.bones.len() * 2
            || vertex
                .weights
                .iter()
                .any(|w| !w.is_finite() || *w < 0.0 || *w > 1.0)
            || vertex.positions.iter().any(|p| !p.is_finite())
            || (vertex.weights.iter().sum::<f32>() - 1.0).abs() > 0.0001
            || (!mesh.weighted && vertex.weights != [1.0])
        {
            return Err(unsupported());
        }
    }
    Ok(())
}

pub(super) fn record(mesh: &Mesh, index: usize) -> Object {
    record_named(mesh, index, format!("region-{index}"))
}

pub(super) fn record_named(mesh: &Mesh, index: usize, label: String) -> Object {
    use Field::*;
    let vertices = mesh
        .vertices
        .iter()
        .map(|vertex| {
            Object::Record(Record {
                class: 54,
                label: None,
                fields: vec![
                    (0, object(Object::FloatList(vertex.weights.clone()))),
                    (1, object(Object::FloatList(vertex.positions.clone()))),
                ],
            })
        })
        .collect();
    let binding = Object::Record(Record {
        class: 71,
        label: None,
        fields: vec![
            (0, object(Object::Link(46, label.clone()))),
            (2, object(Object::Array(vertices))),
            (
                1,
                object(Object::Array(
                    mesh.bones
                        .iter()
                        .map(|i| Object::Link(12, format!("bone-{i}")))
                        .collect(),
                )),
            ),
        ],
    });
    Object::Record(Record {
        class: 46,
        label: Some(label),
        fields: vec![
            (16, Float(mesh.image.width)),
            (12, object(Object::FloatList(mesh.uvs.clone()))),
            (13, object(Object::ShortList(mesh.triangles.clone()))),
            (27, object(Object::Null)),
            (26, object(Object::Null)),
            (36, Bool(false)),
            (17, Float(mesh.image.height)),
            (34, Bool(false)),
            (14, text(&mesh.image.path)),
            (30, Bool(mesh.weighted)),
            (20, Float(1.0)),
            (21, Float(1.0)),
            (8, object(Object::IntList(mesh.edges.clone()))),
            (31, object(Object::Color([255; 4]))),
            (28, object(binding)),
            (7, UInt(mesh.hull as u32 * 4)),
            (19, Float(0.0)),
            (37, UInt(8)),
            (1, text(&mesh.image.name)),
            (32, Bool(false)),
            (5, Bool(true)),
            (0, DomainLink(13, format!("slot-{index}"))),
            (4, UInt(0)),
            (33, Bool(true)),
            (35, Bool(false)),
        ],
    })
}

pub fn quad(image: Region, bone: usize) -> Mesh {
    let (w, h) = (image.width / 2.0, image.height / 2.0);
    Mesh {
        image,
        weighted: false,
        uvs: vec![0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0],
        triangles: vec![0, 1, 2, 2, 3, 0],
        edges: vec![0, 3, 0, 1, 1, 2, 2, 3],
        hull: 4,
        bones: vec![bone],
        vertices: [[-w, h], [w, h], [w, -h], [-w, -h]]
            .into_iter()
            .map(|p| Vertex {
                weights: vec![1.0],
                positions: p.to_vec(),
            })
            .collect(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use regions::{decode_regions, encode_region_payload, Attachment, RegionProject, Slot};
    fn project() -> RegionProject {
        let image = Region {
            name: "image".into(),
            path: String::new(),
            x: 0.0,
            y: 0.0,
            rotation: 0.0,
            scale_x: 1.0,
            scale_y: 1.0,
            width: 32.0,
            height: 24.0,
        };
        RegionProject {
            images_root: "./images/".into(),
            rig: MinimalProject::new("rig".into(), [2; 16]),
            region_order: vec![0],
            slots: vec![Slot {
                blend: crate::minimal::regions::BlendMode::Normal,
                color: [255; 4],
                name: "slot".into(),
                bone: 0,
                visible: true,
                attachment: Some(Attachment::Mesh(Box::new(quad(image, 0)))),
            }],
        }
    }
    #[test]
    fn mesh_recognizer_is_bounded_and_never_drops_unmodeled_or_truncated_data() {
        let project = project();
        let payload = encode_region_payload(&project).unwrap();
        assert_eq!(decode_regions(&payload).unwrap(), project);
        for end in 0..payload.len() {
            assert!(decode_regions(&payload[..end]).is_err());
        }
        for index in 28..payload.len() {
            let mut changed = payload.clone();
            changed[index] = 255;
            if let Ok(model) = decode_regions(&changed) {
                assert_eq!(encode_region_payload(&model).unwrap(), changed);
            }
        }
    }
    #[test]
    fn invalid_mesh_topology_and_weights_are_rejected_before_encoding() {
        let source = project();
        for kind in 0..5 {
            let mut project = source.clone();
            let mesh = project.slots[0]
                .attachment
                .as_mut()
                .unwrap()
                .mesh_mut()
                .unwrap();
            match kind {
                0 => mesh.triangles[0] = 200,
                1 => mesh.vertices[0].weights[0] = 0.5,
                2 => mesh.uvs[0] = f32::NAN,
                3 => mesh.bones[0] = 127,
                _ => mesh.edges[0] = 200,
            }
            assert!(encode_region_payload(&project).is_err());
        }
    }
}
