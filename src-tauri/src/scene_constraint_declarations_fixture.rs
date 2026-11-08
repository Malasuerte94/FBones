//! Own interleaved execution order and independent same-kind declarations.
use fbones_format::minimal::scene::*;

pub(crate) fn project() -> SceneProject {
    let mut p = crate::scene_string_form_fixture::project();
    p.rig.name = "Own constraint declaration inventories".into();
    let Constraint::Transform(mut first) = p.constraints[0].clone() else {
        unreachable!()
    };
    first.name = "Own transform zero".into();
    p.constraints = vec![
        Constraint::Transform(first),
        Constraint::Physics(PhysicsConstraint::new("Own physics zero".into(), 1)),
        Constraint::Ik(IkConstraint::new("Own IK zero".into(), vec![1], 2)),
        Constraint::Transform(TransformConstraint::new(
            "Own transform one".into(),
            vec![1],
            2,
        )),
        Constraint::Physics(PhysicsConstraint::new("Own physics one".into(), 2)),
        Constraint::Ik(IkConstraint::new("Own IK one".into(), vec![2], 1)),
    ];
    p.animations[0].constraint_tracks.extend([
        ConstraintTimeline::Physics {
            constraint: 1,
            property: PhysicsProperty::Wind,
            keys: vec![PhysicsKeyframe {
                frame: -0.,
                value: -0.,
                curve: PhysicsCurve::Linear,
            }],
        },
        ConstraintTimeline::Ik {
            constraint: 2,
            keys: vec![IkKeyframe {
                frame: 4.,
                mix: 0.25,
                softness: 0.,
                stretch: false,
                compress: false,
                bend_positive: true,
                curve: IkKeyCurve::Linear,
            }],
        },
    ]);
    let mut layouts = (0..p.animations.len())
        .map(|a| animation_layout(&p, a).unwrap())
        .collect::<Vec<_>>();
    layouts[0].groups.reverse();
    for group in &mut layouts[0].groups {
        group.tracks.reverse();
    }
    let wire = p.wire.as_mut().unwrap();
    wire.animation_layouts = layouts;
    wire.constraint_declarations = Some(WireConstraintDeclarations {
        ik: vec![5, 2],
        transform: vec![3, 0],
        physics: vec![4, 1],
    });
    normalize_wire_track_order(&mut p).unwrap();
    normalize_wire_strings(&mut p).unwrap();
    p
}

/// Old-canonical file: no custom scalar/form/layout metadata. Materializing its
/// first noncanonical declaration order must preserve Bone28 and Event labels.
#[cfg(test)]
pub(crate) fn canonical_project() -> SceneProject {
    let mut p = project();
    p.rig.name = "Own canonical constraint declarations".into();
    for slot in &mut p.slots {
        for attachment in &mut slot.attachments {
            if let Some(mesh) = attachment.mesh_mut() {
                mesh.image.width = 32.;
                mesh.image.height = 24.;
            }
        }
    }
    p.events[0].string = "Own shared Event default".into();
    p.animations[0].event_tracks[0].keys[0].string = p.events[0].string.clone();
    let layouts = (0..p.animations.len())
        .map(|a| animation_layout(&p, a).unwrap())
        .collect();
    p.wire.as_mut().unwrap().animation_layouts = layouts;
    normalize_wire_track_order(&mut p).unwrap();
    p.wire = None;
    // This also verifies canonical family ordering, without relying on native edits.
    encode_scene_payload(&p).unwrap();
    p
}
