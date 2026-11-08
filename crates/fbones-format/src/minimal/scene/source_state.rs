//! Closed source-only state for measured known fields. Never solver inputs or
//! a cache of opaque records. Native owners reconcile every indexed identity.
use super::{AttachmentAddress, Constraint, FiniteF32, SceneProject};
use crate::{
    minimal::{Field, Object, Record},
    FormatError,
};

pub const SOURCE_GROUP_TAGS: [u32; 5] = [37, 45, 40, 44, 38];
pub const SOURCE_TOGGLE_TAGS: [u32; 7] = [29, 32, 31, 26, 27, 30, 28];
pub const SOURCE_TRANSFORM_TAGS: [u32; 6] = [11, 24, 13, 26, 9, 5];
pub const SOURCE_PHYSICS_TAGS: [u32; 7] = [21, 13, 24, 15, 11, 17, 19];

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct WireIkSourceState {
    pub constraint: usize,
    pub mix_6: FiniteF32,
    pub uint_17: u32,
}
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct WireTransformSourceState {
    pub constraint: usize,
    pub values: [FiniteF32; 6],
}
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct WirePhysicsSourceState {
    pub constraint: usize,
    pub values: [FiniteF32; 7],
}
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct WireSourceState {
    pub skeleton_126: bool,
    pub bone_126: Vec<usize>,
    pub slot_126: Vec<usize>,
    pub bone_labels_28: Vec<(usize, String)>,
    pub animation_3: Vec<usize>,
    pub group_2: [u32; 5],
    pub skeleton_toggles: [bool; 7],
    pub mesh_19: Vec<(AttachmentAddress, FiniteF32)>,
    pub ik: Vec<WireIkSourceState>,
    pub transform: Vec<WireTransformSourceState>,
    pub physics: Vec<WirePhysicsSourceState>,
}
impl Default for WireSourceState {
    fn default() -> Self {
        Self {
            skeleton_126: false,
            bone_126: vec![],
            slot_126: vec![],
            bone_labels_28: vec![],
            animation_3: vec![],
            group_2: [3; 5],
            skeleton_toggles: [false; 7],
            mesh_19: vec![],
            ik: vec![],
            transform: vec![],
            physics: vec![],
        }
    }
}
fn ordered(values: impl IntoIterator<Item = usize>, bound: usize) -> bool {
    let mut previous = None;
    values.into_iter().all(|value| {
        let valid = value < bound && previous.is_none_or(|old| old < value);
        previous = Some(value);
        valid
    })
}
impl WireSourceState {
    pub(crate) fn normalize(&mut self) {
        self.bone_126.sort_unstable();
        self.slot_126.sort_unstable();
        self.animation_3.sort_unstable();
        self.bone_labels_28.retain(|(_, label)| label != "bone");
        self.bone_labels_28.sort_by_key(|(index, _)| *index);
        self.mesh_19.retain(|(_, value)| value.to_bits() != 0);
        self.mesh_19.sort_by_key(|(a, _)| (a.slot, a.attachment));
        self.ik.retain(|s| s.mix_6.to_bits() != 0 || s.uint_17 != 0);
        self.ik.sort_by_key(|s| s.constraint);
        self.transform
            .retain(|s| s.values.iter().any(|v| v.to_bits() != 0));
        self.transform.sort_by_key(|s| s.constraint);
        self.physics
            .retain(|s| s.values.iter().any(|v| v.to_bits() != 0));
        self.physics.sort_by_key(|s| s.constraint);
    }
    pub(crate) fn validate(&self, p: &SceneProject) -> Result<(), FormatError> {
        let fail = || FormatError::UnsupportedProfile;
        if !ordered(self.bone_126.iter().copied(), p.rig.bones.len())
            || !ordered(self.slot_126.iter().copied(), p.slots.len())
            || !ordered(self.animation_3.iter().copied(), p.animations.len())
            || !ordered(
                self.bone_labels_28.iter().map(|(i, _)| *i),
                p.rig.bones.len(),
            )
            || self.bone_labels_28.iter().any(|(_, s)| s != "ik")
            || self.group_2.iter().any(|v| !matches!(v, 3 | 9))
        {
            return Err(fail());
        }
        let mut previous = None;
        for (address, value) in &self.mesh_19 {
            let key = (address.slot, address.attachment);
            if previous.is_some_and(|old| old >= key)
                || value.to_bits() == 0
                || p.slots
                    .get(address.slot)
                    .and_then(|s| s.attachments.get(address.attachment))
                    .and_then(|a| a.mesh())
                    .is_none()
            {
                return Err(fail());
            }
            previous = Some(key);
        }
        if !ordered(self.ik.iter().map(|s| s.constraint), p.constraints.len())
            || !ordered(
                self.transform.iter().map(|s| s.constraint),
                p.constraints.len(),
            )
            || !ordered(
                self.physics.iter().map(|s| s.constraint),
                p.constraints.len(),
            )
        {
            return Err(fail());
        }
        for state in &self.ik {
            if !matches!(p.constraints.get(state.constraint), Some(Constraint::Ik(_)))
                || state.uint_17 > 1
                || state.mix_6.to_bits() == 0 && state.uint_17 == 0
            {
                return Err(fail());
            }
        }
        for state in &self.transform {
            if !matches!(
                p.constraints.get(state.constraint),
                Some(Constraint::Transform(_))
            ) || state.values.iter().all(|v| v.to_bits() == 0)
            {
                return Err(fail());
            }
        }
        for state in &self.physics {
            if !matches!(
                p.constraints.get(state.constraint),
                Some(Constraint::Physics(_))
            ) || state.values.iter().all(|v| v.to_bits() == 0)
            {
                return Err(fail());
            }
        }
        Ok(())
    }
    pub(crate) fn bone_label(&self, index: usize) -> Option<&str> {
        self.bone_labels_28
            .iter()
            .find(|(i, _)| *i == index)
            .map(|(_, label)| label.as_str())
    }
    pub(in crate::minimal) fn apply(&self, root: &mut Record) {
        fn set(record: &mut Record, tag: u32, value: Field) {
            record
                .fields
                .iter_mut()
                .find(|(t, _)| *t == tag)
                .expect("known source field")
                .1 = value;
        }
        fn index(label: Option<&str>, prefix: &str) -> Option<usize> {
            label?.strip_prefix(prefix)?.parse().ok()
        }
        fn visit(record: &mut Record, state: &WireSourceState) {
            let label = record.label.clone();
            match record.class {
                11 if label.as_deref() == Some("skeleton") => {
                    set(record, 126, Field::UInt(u32::from(state.skeleton_126)));
                    for (tag, value) in SOURCE_TOGGLE_TAGS.into_iter().zip(state.skeleton_toggles) {
                        if let Field::Value(Object::Record(toggle)) = &mut record
                            .fields
                            .iter_mut()
                            .find(|(t, _)| *t == tag)
                            .expect("known toggle")
                            .1
                        {
                            set(toggle, 0, Field::Bool(value));
                        }
                    }
                    for (tag, value) in SOURCE_GROUP_TAGS.into_iter().zip(state.group_2) {
                        if let Field::Value(Object::Record(group)) = &mut record
                            .fields
                            .iter_mut()
                            .find(|(t, _)| *t == tag)
                            .expect("known group")
                            .1
                        {
                            set(group, 2, Field::UInt(value));
                        }
                    }
                }
                12 => {
                    if let Some(i) = index(label.as_deref(), "bone-") {
                        set(
                            record,
                            126,
                            Field::UInt(u32::from(state.bone_126.contains(&i))),
                        );
                        if let Some(text) = state.bone_label(i) {
                            set(record, 28, Field::String(text.to_owned(), None));
                        }
                    }
                }
                13 => {
                    if let Some(i) = index(label.as_deref(), "slot-") {
                        set(
                            record,
                            126,
                            Field::UInt(u32::from(state.slot_126.contains(&i))),
                        );
                    }
                }
                18 => {
                    if let Some(i) = if label.as_deref() == Some("animation") {
                        Some(0)
                    } else {
                        index(label.as_deref(), "animation-")
                    } {
                        set(record, 3, Field::Bool(state.animation_3.contains(&i)));
                    }
                }
                46 => {
                    if let Some(label) =
                        label.as_deref().and_then(|s| s.strip_prefix("attachment-"))
                    {
                        let mut parts = label.split('-');
                        if let (Some(slot), Some(attachment), None) =
                            (parts.next(), parts.next(), parts.next())
                        {
                            if let (Ok(slot), Ok(attachment)) = (slot.parse(), attachment.parse()) {
                                if let Some((_, value)) = state
                                    .mesh_19
                                    .iter()
                                    .find(|(a, _)| *a == AttachmentAddress { slot, attachment })
                                {
                                    set(record, 19, Field::Float(value.get()));
                                }
                            }
                        }
                    }
                }
                56 => {
                    if let Some(i) = index(label.as_deref(), "constraint-") {
                        if let Some(s) = state.ik.iter().find(|s| s.constraint == i) {
                            set(record, 6, Field::Float(s.mix_6.get()));
                            set(record, 17, Field::UInt(s.uint_17));
                        }
                    }
                }
                65 => {
                    if let Some(i) = index(label.as_deref(), "constraint-") {
                        if let Some(s) = state.transform.iter().find(|s| s.constraint == i) {
                            for (tag, value) in SOURCE_TRANSFORM_TAGS.into_iter().zip(s.values) {
                                set(record, tag, Field::Float(value.get()));
                            }
                        }
                    }
                }
                121 => {
                    if let Some(i) = index(label.as_deref(), "constraint-") {
                        if let Some(s) = state.physics.iter().find(|s| s.constraint == i) {
                            for (tag, value) in SOURCE_PHYSICS_TAGS.into_iter().zip(s.values) {
                                set(record, tag, Field::Float(value.get()));
                            }
                        }
                    }
                }
                108 => {
                    if let Some(i) = match label.as_deref() {
                        Some("animation-group") => Some(0),
                        Some("slot-group") => Some(1),
                        Some("event-group") => Some(2),
                        Some("constraint-group") => Some(3),
                        _ => None,
                    } {
                        set(record, 2, Field::UInt(state.group_2[i]));
                    }
                }
                _ => (),
            }
            for (_, field) in &mut record.fields {
                if let Field::Value(object) = field {
                    object_visit(object, state);
                }
            }
        }
        fn object_visit(object: &mut Object, state: &WireSourceState) {
            match object {
                Object::Record(record) => visit(record, state),
                Object::Array(values) => {
                    for value in values {
                        object_visit(value, state)
                    }
                }
                Object::Map(values) => {
                    for (key, value) in values {
                        object_visit(key, state);
                        object_visit(value, state)
                    }
                }
                Object::DrawOrderAnimationTrack { rows, .. } => {
                    for row in rows {
                        for value in row {
                            object_visit(value, state)
                        }
                    }
                }
                _ => (),
            }
        }
        visit(root, self);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::minimal::scene::{
        decode_scene, encode_scene_payload, materialize_wire, normalize_wire_strings, Animation,
        IkConstraint, PhysicsConstraint, TransformConstraint,
    };
    use crate::minimal::{regions::RegionProject, Bone, MinimalProject};
    fn f(value: f32) -> FiniteF32 {
        FiniteF32::new(value).unwrap()
    }
    fn project() -> SceneProject {
        let mut rig = MinimalProject::new("Own source state".into(), [71; 16]);
        for name in ["arm", "spare"] {
            let mut bone = Bone::root();
            bone.name = name.into();
            bone.parent = Some(0);
            bone.x = 25.;
            rig.bones.push(bone);
        }
        let mut p = SceneProject::from(&RegionProject {
            rig,
            images_root: "./images/".into(),
            slots: vec![],
            region_order: vec![],
        });
        p.animations.push(Animation::new("second".into()));
        p.constraints = vec![
            Constraint::Ik(IkConstraint {
                name: "Own IK".into(),
                bones: vec![1],
                target: 2,
                mix: 0.75,
                softness: 0.,
                bend_positive: true,
                compress: false,
                stretch: false,
            }),
            Constraint::Transform(TransformConstraint::new("Own follow".into(), vec![1], 2)),
            Constraint::Physics(PhysicsConstraint::new("Own physics".into(), 1)),
        ];
        p.wire = Some(materialize_wire(&p).unwrap());
        p
    }
    #[test]
    fn exact_known_state_roundtrip_keeps_snapshot_bits_without_changing_authoring() {
        let mut p = project();
        let authored = (p.rig.clone(), p.constraints.clone(), p.animations.clone());
        p.wire.as_mut().unwrap().source_state = Some(WireSourceState {
            skeleton_126: true,
            bone_126: vec![1],
            bone_labels_28: vec![(1, "ik".into())],
            animation_3: vec![1],
            group_2: [9; 5],
            skeleton_toggles: [true, false, true, false, false, false, true],
            ik: vec![WireIkSourceState {
                constraint: 0,
                mix_6: f(-0.),
                uint_17: 1,
            }],
            transform: vec![WireTransformSourceState {
                constraint: 1,
                values: [f(1.), f(-1.), f(-0.), f(1.), f(1.), f(-1.)],
            }],
            physics: vec![WirePhysicsSourceState {
                constraint: 2,
                values: [f(0.), f(100.), f(1.), f(0.85), f(0.5), f(1.), f(-0.)],
            }],
            ..WireSourceState::default()
        });
        normalize_wire_strings(&mut p).unwrap();
        let bytes = encode_scene_payload(&p).unwrap();
        let decoded = decode_scene(&bytes).unwrap();
        assert_eq!(decoded, p);
        assert_eq!(encode_scene_payload(&decoded).unwrap(), bytes);
        assert_eq!(
            (decoded.rig, decoded.constraints, decoded.animations),
            authored
        );
    }
    #[test]
    fn invalid_owner_kind_duplicate_identity_and_unmeasured_labels_are_rejected() {
        let p = project();
        let mut state = WireSourceState {
            bone_126: vec![1, 1],
            ..WireSourceState::default()
        };
        assert!(state.validate(&p).is_err());
        state.bone_126 = vec![1];
        state.bone_labels_28 = vec![(1, "unmeasured".into())];
        assert!(state.validate(&p).is_err());
        state.bone_labels_28.clear();
        state.physics = vec![WirePhysicsSourceState {
            constraint: 0,
            values: [f(1.); 7],
        }];
        assert!(state.validate(&p).is_err());
        state.physics.clear();
        state.ik = vec![WireIkSourceState {
            constraint: 0,
            mix_6: f(1.),
            uint_17: 2,
        }];
        assert!(state.validate(&p).is_err());
    }
}
