//! Typed serialization provenance for known records, never opaque project bytes.
use super::super::{Field, Object, Record};
use super::*;
use std::collections::{HashMap, HashSet};

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct SceneWire {
    pub source_state: Option<WireSourceState>,
    pub slot_references_8: Vec<AttachmentAddress>,
    pub editor_metadata: Option<WireEditorMetadata>,
    pub constraint_declarations: Option<WireConstraintDeclarations>,
    /// Skeleton11/tag46; retained finite bits, broader editor meaning unknown.
    pub editor_scalar_46: FiniteF32,
    /// Known Skeleton11/tag24 finite source metadata; never geometry/fit authority.
    pub skeleton_bounds_24: [FiniteF32; 4],
    pub strings: Vec<WireStringAlias>,
    /// Source-only permission to retain zero image dimensions with independent geometry.
    pub zero_size_meshes: Vec<AttachmentAddress>,
    pub animation_layouts: Vec<WireAnimationLayout>,
}
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct WireConstraintDeclarations {
    pub ik: Vec<usize>,
    pub transform: Vec<usize>,
    pub physics: Vec<usize>,
}
/// Canonical declaration order, independent of the reverse execution group.
pub fn canonical_constraint_declarations(p: &SceneProject) -> WireConstraintDeclarations {
    let family = |class| {
        p.constraints
            .iter()
            .enumerate()
            .filter_map(|(i, c)| (c.class() == class).then_some(i))
            .collect()
    };
    WireConstraintDeclarations {
        ik: family(56),
        transform: family(65),
        physics: family(121),
    }
}
fn normalized_declarations(
    p: &SceneProject,
) -> Result<Option<WireConstraintDeclarations>, FormatError> {
    let Some(declarations) = p
        .wire
        .as_ref()
        .and_then(|w| w.constraint_declarations.as_ref())
    else {
        return Ok(None);
    };
    let canonical = canonical_constraint_declarations(p);
    for (actual, expected) in [
        (&declarations.ik, &canonical.ik),
        (&declarations.transform, &canonical.transform),
        (&declarations.physics, &canonical.physics),
    ] {
        if actual.len() > 128
            || actual.len() != expected.len()
            || actual.iter().copied().collect::<HashSet<_>>() != expected.iter().copied().collect()
        {
            return Err(FormatError::UnsupportedProfile);
        }
    }
    Ok((declarations != &canonical).then(|| declarations.clone()))
}
/// Capture every known provenance relation before a canonical project is edited.
/// This validates the project and whole payload; no opaque graph is retained.
pub fn materialize_wire(p: &SceneProject) -> Result<SceneWire, FormatError> {
    let payload = encode_scene_payload(p)?;
    if let Some(w) = &p.wire {
        return Ok(w.clone());
    }
    super::super::reader::materialize_scene_wire(&payload)
}
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct WireStringAlias {
    pub owner: WireStringOwner,
    pub tag: u32,
    /// Abstract identity, independent of serialized generic-arena positions.
    pub group: u32,
    pub encoding: Option<WireStringEncoding>,
}
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct WireStringEncoding {
    pub form: WireStringForm,
    /// Known semantic source value; a changed value uses canonical encoding.
    pub source_text: String,
}
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum WireStringForm {
    Utf8Length,
}
#[derive(Clone, Debug, PartialEq, Eq, Hash)]
pub enum WireStringOwner {
    Project,
    Skeleton,
    Bone(usize),
    Slot(usize),
    Attachment(AttachmentAddress),
    Animation(usize),
    Constraint(usize),
    Event(usize),
}
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct WireAnimationLayout {
    pub animation: usize,
    pub groups: Vec<WireAnimationGroup>,
}
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct WireAnimationGroup {
    pub owner: WireAnimationOwner,
    pub tracks: Vec<WireTrack>,
}
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum WireAnimationOwner {
    Bone(usize),
    Events,
    DrawOrder,
}
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum WireSlotChannel {
    Attachment,
    Rgba,
}
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum WireConstraintChannel {
    Ik,
    TransformMix,
    Physics(PhysicsProperty),
    PhysicsReset,
}
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum WireTrack {
    Bone {
        bone: usize,
        channel: BoneChannel,
    },
    Slot {
        slot: usize,
        channel: WireSlotChannel,
    },
    Sequence {
        attachment: AttachmentAddress,
    },
    Deform {
        attachment: AttachmentAddress,
    },
    Constraint {
        constraint: usize,
        channel: WireConstraintChannel,
    },
    Event {
        event: usize,
    },
    DrawOrder,
}
impl WireStringOwner {
    pub(super) fn label(&self) -> String {
        match self {
            Self::Project => "project".into(),
            Self::Skeleton => "skeleton".into(),
            Self::Bone(i) => format!("bone-{i}"),
            Self::Slot(i) => format!("slot-{i}"),
            Self::Attachment(a) => format!("attachment-{}-{}", a.slot, a.attachment),
            Self::Animation(0) => "animation".into(),
            Self::Animation(i) => format!("animation-{i}"),
            Self::Constraint(i) => format!("constraint-{i}"),
            Self::Event(i) => format!("event-{i}"),
        }
    }
    fn accepts(&self, tag: u32, p: &SceneProject) -> bool {
        match self {
            Self::Project => tag == 20,
            Self::Skeleton => matches!(tag, 1 | 3 | 34),
            Self::Bone(i) => *i < p.rig.bones.len() && matches!(tag, 1 | 28),
            Self::Slot(i) => *i < p.slots.len() && tag == 1,
            Self::Attachment(a) => p
                .slots
                .get(a.slot)
                .and_then(|s| s.attachments.get(a.attachment))
                .is_some_and(|a| match a {
                    SceneAttachment::Region(_) => matches!(tag, 1 | 13),
                    SceneAttachment::Mesh(_) => matches!(tag, 1 | 14),
                    SceneAttachment::Clipping(_) => tag == 1,
                }),
            Self::Animation(i) => *i < p.animations.len() && tag == 1,
            Self::Constraint(i) => *i < p.constraints.len() && tag == 1,
            Self::Event(i) => *i < p.events.len() && matches!(tag, 2 | 5 | 6),
        }
    }
}
impl WireTrack {
    pub fn owner(self, p: &SceneProject) -> Result<WireAnimationOwner, FormatError> {
        let bone = match self {
            Self::Bone { bone, .. } => Some(bone),
            Self::Slot { slot, .. } => Some(
                p.slots
                    .get(slot)
                    .ok_or(FormatError::UnsupportedProfile)?
                    .bone,
            ),
            Self::Sequence { attachment } | Self::Deform { attachment } => Some(
                p.slots
                    .get(attachment.slot)
                    .ok_or(FormatError::UnsupportedProfile)?
                    .bone,
            ),
            Self::Constraint { constraint, .. } => Some(
                match p
                    .constraints
                    .get(constraint)
                    .ok_or(FormatError::UnsupportedProfile)?
                {
                    Constraint::Ik(c) => c.target,
                    Constraint::Transform(c) => c.source,
                    Constraint::Physics(c) => c.bone,
                },
            ),
            Self::Event { .. } => return Ok(WireAnimationOwner::Events),
            Self::DrawOrder => return Ok(WireAnimationOwner::DrawOrder),
        };
        Ok(WireAnimationOwner::Bone(bone.unwrap()))
    }
    fn family(self) -> u8 {
        match self {
            Self::Bone { .. } => 0,
            Self::Slot { .. } => 1,
            Self::Deform { .. } => 2,
            Self::Constraint { .. } => 3,
            Self::Event { .. } => 4,
            Self::DrawOrder => 5,
            Self::Sequence { .. } => 6,
        }
    }
    fn constraint(t: &ConstraintTimeline) -> Self {
        let channel = match t {
            ConstraintTimeline::Ik { .. } => WireConstraintChannel::Ik,
            ConstraintTimeline::TransformMix { .. } => WireConstraintChannel::TransformMix,
            ConstraintTimeline::Physics { property, .. } => {
                WireConstraintChannel::Physics(*property)
            }
            ConstraintTimeline::PhysicsReset { .. } => WireConstraintChannel::PhysicsReset,
        };
        Self::Constraint {
            constraint: t.constraint(),
            channel,
        }
    }
    fn slot(t: &SlotTimeline) -> Self {
        Self::Slot {
            slot: t.slot(),
            channel: match t {
                SlotTimeline::Attachment { .. } => WireSlotChannel::Attachment,
                SlotTimeline::Rgba { .. } => WireSlotChannel::Rgba,
            },
        }
    }
    fn object(o: &Object) -> Option<Self> {
        Some(match o {
            Object::AnimationTrack(t) => Self::Bone {
                bone: t.bone,
                channel: t.channel,
            },
            Object::SlotAnimationTrack { track, .. } => Self::slot(track),
            Object::SequenceAnimationTrack { track, .. } => Self::Sequence {
                attachment: track.attachment,
            },
            Object::DeformAnimationTrack { track, .. } => Self::Deform {
                attachment: track.attachment,
            },
            Object::ConstraintAnimationTrack { track, .. } => Self::constraint(track),
            Object::EventAnimationTrack { track, .. } => Self::Event { event: track.event },
            Object::DrawOrderAnimationTrack { .. } => Self::DrawOrder,
            _ => return None,
        })
    }
}
fn track_selectors(a: &Animation) -> Vec<WireTrack> {
    a.tracks
        .iter()
        .map(|t| WireTrack::Bone {
            bone: t.bone,
            channel: t.channel,
        })
        .chain(a.slot_tracks.iter().map(WireTrack::slot))
        .chain(a.sequence_tracks.iter().map(|t| WireTrack::Sequence {
            attachment: t.attachment,
        }))
        .chain(a.deform_tracks.iter().map(|t| WireTrack::Deform {
            attachment: t.attachment,
        }))
        .chain(a.constraint_tracks.iter().map(WireTrack::constraint))
        .chain(
            a.event_tracks
                .iter()
                .map(|t| WireTrack::Event { event: t.event }),
        )
        .chain((!a.draw_order.is_empty()).then_some(WireTrack::DrawOrder))
        .collect()
}
/// Canonical current selectors; native edits may reconcile retained ordering by identity.
pub fn animation_layout(
    p: &SceneProject,
    animation: usize,
) -> Result<WireAnimationLayout, FormatError> {
    let a = p
        .animations
        .get(animation)
        .ok_or(FormatError::UnsupportedProfile)?;
    let tracks = a
        .tracks
        .iter()
        .map(|t| WireTrack::Bone {
            bone: t.bone,
            channel: t.channel,
        })
        .chain(a.slot_tracks.iter().map(WireTrack::slot))
        .chain(a.sequence_tracks.iter().map(|t| WireTrack::Sequence {
            attachment: t.attachment,
        }))
        .chain(a.deform_tracks.iter().map(|t| WireTrack::Deform {
            attachment: t.attachment,
        }))
        .chain(a.constraint_tracks.iter().map(WireTrack::constraint))
        .chain(
            a.event_tracks
                .iter()
                .map(|t| WireTrack::Event { event: t.event }),
        )
        .chain((!a.draw_order.is_empty()).then_some(WireTrack::DrawOrder));
    let mut groups: Vec<WireAnimationGroup> = vec![];
    for track in tracks {
        let owner = track.owner(p)?;
        if let Some(g) = groups.iter_mut().find(|g| g.owner == owner) {
            g.tracks.push(track)
        } else {
            groups.push(WireAnimationGroup {
                owner,
                tracks: vec![track],
            })
        }
    }
    Ok(WireAnimationLayout { animation, groups })
}
pub(super) fn validate(p: &SceneProject) -> Result<(), FormatError> {
    let Some(w) = &p.wire else { return Ok(()) };
    if let Some(state) = &w.source_state {
        state.validate(p)?;
    }
    if w.strings.len() > 16384 || w.animation_layouts.len() != p.animations.len() {
        return Err(FormatError::UnsupportedProfile);
    }
    let mut previous_slot = None;
    for address in &w.slot_references_8 {
        if previous_slot.is_some_and(|s| s >= address.slot)
            || p.slots
                .get(address.slot)
                .and_then(|s| s.attachments.get(address.attachment))
                .and_then(SceneAttachment::image)
                .is_none()
        {
            return Err(FormatError::UnsupportedProfile);
        }
        previous_slot = Some(address.slot);
    }
    if normalized_declarations(p)? != w.constraint_declarations {
        return Err(FormatError::UnsupportedProfile);
    }
    let expected: HashSet<_> = p
        .slots
        .iter()
        .enumerate()
        .flat_map(|(slot, s)| {
            s.attachments
                .iter()
                .enumerate()
                .filter_map(move |(attachment, a)| match a {
                    SceneAttachment::Mesh(m) if m.image.width == 0. || m.image.height == 0. => {
                        Some(AttachmentAddress { slot, attachment })
                    }
                    _ => None,
                })
        })
        .collect();
    let actual: HashSet<_> = w.zero_size_meshes.iter().copied().collect();
    if actual.len() != w.zero_size_meshes.len() || actual != expected {
        return Err(FormatError::UnsupportedProfile);
    }
    let mut fields = HashSet::new();
    for s in &w.strings {
        if !s.owner.accepts(s.tag, p) || !fields.insert((&s.owner, s.tag)) {
            return Err(FormatError::UnsupportedProfile);
        }
    }
    let (strings, editor) = normalized_strings(p)?;
    if strings != w.strings || editor != w.editor_metadata {
        return Err(FormatError::UnsupportedProfile);
    }
    let mut clips = HashSet::new();
    for layout in &w.animation_layouts {
        if !clips.insert(layout.animation) || layout.groups.len() > 512 {
            return Err(FormatError::UnsupportedProfile);
        }
        let expected: HashSet<_> = animation_layout(p, layout.animation)?
            .groups
            .into_iter()
            .flat_map(|g| g.tracks)
            .collect();
        let mut seen = HashSet::new();
        let mut owners = HashSet::new();
        for g in &layout.groups {
            if g.tracks.is_empty() || !owners.insert(g.owner) {
                return Err(FormatError::UnsupportedProfile);
            }
            for t in &g.tracks {
                if !expected.contains(t) || !seen.insert(*t) || t.owner(p)? != g.owner {
                    return Err(FormatError::UnsupportedProfile);
                }
            }
        }
        if expected != seen {
            return Err(FormatError::UnsupportedProfile);
        }
        let current = track_selectors(&p.animations[layout.animation]);
        let ordered: Vec<_> = layout
            .groups
            .iter()
            .flat_map(|g| g.tracks.iter().copied())
            .collect();
        for family in 0..7 {
            if current
                .iter()
                .filter(|t| t.family() == family)
                .ne(ordered.iter().filter(|t| t.family() == family))
            {
                return Err(FormatError::UnsupportedProfile);
            }
        }
    }
    Ok(())
}
pub(super) fn ordered_groups(
    p: &SceneProject,
    animation: usize,
    canonical: Vec<Object>,
) -> Vec<Object> {
    let Some(layout) = p.wire.as_ref().and_then(|w| {
        w.animation_layouts
            .iter()
            .find(|l| l.animation == animation)
    }) else {
        return canonical;
    };
    let mut objects = HashMap::new();
    for object in canonical {
        let Object::Record(record) = object else {
            unreachable!()
        };
        for (tag, field) in record.fields {
            if tag == 2 {
                let Field::Value(Object::Array(items)) = field else {
                    unreachable!()
                };
                for item in items {
                    objects.insert(WireTrack::object(&item).expect("known timeline"), item);
                }
            }
        }
    }
    layout
        .groups
        .iter()
        .map(|g| {
            let (kind, owner, label) = match g.owner {
                WireAnimationOwner::Bone(b) => (
                    2,
                    Field::DomainLink(12, format!("bone-{b}")),
                    "animation-translate-kind",
                ),
                WireAnimationOwner::Events => {
                    (3, Field::NullDomainLink(12), "animation-event-kind")
                }
                WireAnimationOwner::DrawOrder => {
                    (4, Field::NullDomainLink(12), "animation-draw-order-kind")
                }
            };
            Object::Record(Record {
                class: 19,
                label: None,
                fields: vec![
                    (4, Field::Bool(true)),
                    (
                        2,
                        Field::Value(Object::Array(
                            g.tracks
                                .iter()
                                .map(|t| objects.remove(t).expect("validated layout"))
                                .collect(),
                        )),
                    ),
                    (7, Field::Enum(kind, label)),
                    (1, owner),
                ],
            })
        })
        .collect()
}
pub(super) fn apply_strings(p: &SceneProject, record: &mut Record) {
    let Some(w) = &p.wire else { return };
    let aliases: HashMap<_, _> = w
        .strings
        .iter()
        .map(|s| {
            (
                (s.owner.label(), s.tag),
                (s.group, s.encoding.as_ref().map(|e| e.form)),
            )
        })
        .collect();
    type Aliases = HashMap<(String, u32), (u32, Option<WireStringForm>)>;
    fn visit(record: &mut Record, aliases: &Aliases) {
        for (tag, field) in &mut record.fields {
            if record.label.is_some() {
                let alias = record
                    .label
                    .as_ref()
                    .and_then(|l| aliases.get(&(l.clone(), *tag)))
                    .copied();
                let group = alias.map(|a| a.0);
                let encoding = alias.and_then(|a| a.1);
                match field {
                    Field::String(value, label) => {
                        *field = Field::WireString {
                            value: value.clone(),
                            group,
                            encoding,
                            label: label.map(str::to_owned),
                        }
                    }
                    Field::EventString(value, label) => {
                        *field = Field::WireString {
                            value: value.clone(),
                            group,
                            encoding,
                            label: Some(label.clone()),
                        }
                    }
                    _ => (),
                }
            }
            if let Field::Value(object) = field {
                object_visit(object, aliases)
            }
        }
    }
    fn object_visit(o: &mut Object, aliases: &Aliases) {
        match o {
            Object::Record(r) => visit(r, aliases),
            Object::Array(a) => {
                for o in a {
                    object_visit(o, aliases)
                }
            }
            Object::DrawOrderAnimationTrack { rows, .. } => {
                for row in rows {
                    for o in row {
                        object_visit(o, aliases)
                    }
                }
            }
            _ => (),
        }
    }
    visit(record, &aliases);
}

/// Current semantic text for a known string field; unknown metadata stays rejected.
pub fn string_field_value<'a>(
    p: &'a SceneProject,
    owner: &WireStringOwner,
    tag: u32,
) -> Option<&'a str> {
    Some(match (owner, tag) {
        (WireStringOwner::Project, 20) => crate::TARGET_VERSION,
        (WireStringOwner::Skeleton, 1) => &p.rig.name,
        (WireStringOwner::Skeleton, 3) => &p.images_root,
        (WireStringOwner::Skeleton, 34) => &p.audio_root,
        (WireStringOwner::Bone(i), 1) => &p.rig.bones.get(*i)?.name,
        (WireStringOwner::Bone(i), 28) => {
            p.rig.bones.get(*i)?;
            p.wire
                .as_ref()
                .and_then(|w| w.source_state.as_ref())
                .and_then(|s| s.bone_label(*i))
                .unwrap_or("bone")
        }
        (WireStringOwner::Slot(i), 1) => &p.slots.get(*i)?.name,
        (WireStringOwner::Attachment(a), 1) => {
            p.slots.get(a.slot)?.attachments.get(a.attachment)?.name()
        }
        (WireStringOwner::Attachment(a), tag) => {
            let a = p.slots.get(a.slot)?.attachments.get(a.attachment)?;
            match (a, tag) {
                (SceneAttachment::Region(r), 13) => &r.path,
                (SceneAttachment::Mesh(m), 14) => &m.image.path,
                _ => return None,
            }
        }
        (WireStringOwner::Animation(i), 1) => &p.animations.get(*i)?.name,
        (WireStringOwner::Constraint(i), 1) => match p.constraints.get(*i)? {
            Constraint::Ik(c) => &c.name,
            Constraint::Transform(c) => &c.name,
            Constraint::Physics(c) => &c.name,
        },
        (WireStringOwner::Event(i), 2) => &p.events.get(*i)?.name,
        (WireStringOwner::Event(i), 5) => &p.events.get(*i)?.string,
        (WireStringOwner::Event(i), 6) => &p.events.get(*i)?.audio,
        _ => return None,
    })
}
/// Canonicalize identity relations after edits, safely detaching changed text.
fn normalized_strings(
    p: &SceneProject,
) -> Result<(Vec<WireStringAlias>, Option<WireEditorMetadata>), FormatError> {
    use std::collections::BTreeMap;
    let Some(w) = &p.wire else {
        return Ok((vec![], None));
    };
    #[derive(Clone)]
    struct Site {
        alias: Option<WireStringAlias>,
        metadata: Option<usize>,
        key: (String, u32),
        encoding: Option<WireStringEncoding>,
    }
    let mut editor = w.editor_metadata.clone();
    let mut texts = Vec::new();
    if let Some(editor) = &editor {
        editor.visit_strings(|value| texts.push(value.clone()));
    }
    if w.strings.len().saturating_add(texts.len()) > 16384 {
        return Err(FormatError::UnsupportedProfile);
    }
    let mut groups: BTreeMap<(bool, u32, String), Vec<Site>> = BTreeMap::new();
    let mut seen = HashSet::new();
    let clean = |mut encoding: Option<WireStringEncoding>,
                 text: &str|
     -> Result<Option<WireStringEncoding>, FormatError> {
        if let Some(e) = &encoding {
            if e.source_text != text {
                encoding = None;
            } else if !text.is_ascii() || text.len() < 2 {
                return Err(FormatError::UnsupportedProfile);
            }
        }
        Ok(encoding)
    };
    for alias in &w.strings {
        if !seen.insert((&alias.owner, alias.tag)) {
            return Err(FormatError::UnsupportedProfile);
        }
        let value = string_field_value(p, &alias.owner, alias.tag)
            .ok_or(FormatError::UnsupportedProfile)?;
        let encoding = clean(alias.encoding.clone(), value)?;
        let mut alias = alias.clone();
        alias.encoding = encoding.clone();
        groups
            .entry((false, alias.group, value.into()))
            .or_default()
            .push(Site {
                key: (alias.owner.label(), alias.tag),
                alias: Some(alias),
                metadata: None,
                encoding,
            });
    }
    for (index, text) in texts.iter().enumerate() {
        let encoding = clean(text.encoding.clone(), &text.value)?;
        groups
            .entry((
                text.group.is_none(),
                text.group.unwrap_or(index as u32),
                text.value.clone(),
            ))
            .or_default()
            .push(Site {
                alias: None,
                metadata: Some(index),
                key: (format!("\0editor-{index:05}"), 0),
                encoding,
            });
    }
    let mut groups: Vec<_> = groups.into_values().collect();
    for group in &mut groups {
        if group.iter().any(|s| s.encoding != group[0].encoding) {
            return Err(FormatError::UnsupportedProfile);
        }
        group.sort_by_key(|site| site.key.clone());
    }
    groups.sort_by_key(|group| group[0].key.clone());
    let mut result = Vec::new();
    let mut next_group = 0u32;
    for group in groups {
        let shared = group.len() > 1;
        let retained = shared
            || group
                .iter()
                .any(|s| s.alias.is_some() && s.encoding.is_some());
        let id = retained.then_some(next_group);
        if retained {
            next_group += 1;
        }
        for site in group {
            if let Some(mut alias) = site.alias {
                if let Some(id) = id {
                    alias.group = id;
                    result.push(alias);
                }
            }
            if let Some(index) = site.metadata {
                texts[index].group = if shared { id } else { None };
                texts[index].encoding = site.encoding;
            }
        }
    }
    if let Some(editor) = &mut editor {
        let mut index = 0;
        editor.visit_strings_mut(|value| {
            *value = texts[index].clone();
            index += 1;
        });
        let mut enums = Vec::new();
        editor.visit_enums(|value| enums.push(value.clone()));
        let mut groups: BTreeMap<(bool, u32, u32), Vec<usize>> = BTreeMap::new();
        for (i, value) in enums.iter().enumerate() {
            groups
                .entry((
                    value.group.is_none(),
                    value.group.unwrap_or(i as u32),
                    value.value,
                ))
                .or_default()
                .push(i);
        }
        let mut groups: Vec<_> = groups.into_values().collect();
        groups.sort_by_key(|g| g[0]);
        let mut next = 0;
        for group in groups {
            let id = (group.len() > 1).then_some(next);
            if id.is_some() {
                next += 1;
            }
            for i in group {
                enums[i].group = id;
            }
        }
        let mut index = 0;
        editor.visit_enums_mut(|value| {
            *value = enums[index].clone();
            index += 1;
        });
        editor.validate()?;
    }
    if editor.as_ref() == Some(&WireEditorMetadata::default()) {
        editor = None;
    }
    Ok((result, editor))
}

pub(in crate::minimal) fn normalize_wire_metadata(p: &mut SceneProject) -> Result<(), FormatError> {
    let (strings, editor) = normalized_strings(p)?;
    let declarations = normalized_declarations(p)?;
    if let Some(w) = &mut p.wire {
        if let Some(state) = &mut w.source_state {
            state.normalize();
        }
        if w.source_state.as_ref() == Some(&WireSourceState::default()) {
            w.source_state = None;
        }
        w.strings = strings;
        w.editor_metadata = editor;
        w.constraint_declarations = declarations;
        w.zero_size_meshes.sort_by_key(|a| (a.slot, a.attachment));
        w.slot_references_8.sort_by_key(|a| (a.slot, a.attachment));
    }
    Ok(())
}
pub fn normalize_wire_strings(p: &mut SceneProject) -> Result<(), FormatError> {
    normalize_wire_metadata(p)?;
    if p.wire.as_ref().is_some_and(|w| {
        w.editor_scalar_46.to_bits() == 100f32.to_bits()
            && w.skeleton_bounds_24.iter().all(|v| v.to_bits() == 0)
            && w.zero_size_meshes.is_empty()
    }) {
        if let Ok(current) = encode_scene_payload(p) {
            let mut canonical = p.clone();
            canonical.wire = None;
            if encode_scene_payload(&canonical).is_ok_and(|bytes| bytes == current) {
                p.wire = None;
            }
        }
    }
    Ok(())
}

/// Align family vectors to a retained layout. Native callers must remap their
/// parallel stable key identities with the same permutation before publishing.
pub fn normalize_wire_track_order(p: &mut SceneProject) -> Result<(), FormatError> {
    let Some(w) = &p.wire else { return Ok(()) };
    let layouts = w.animation_layouts.clone();
    let mut next = p.clone();
    let mut clips = HashSet::new();
    for layout in layouts {
        if !clips.insert(layout.animation) {
            return Err(FormatError::UnsupportedProfile);
        }
        let current = next
            .animations
            .get(layout.animation)
            .ok_or(FormatError::UnsupportedProfile)?;
        let expected: HashSet<_> = track_selectors(current).into_iter().collect();
        let mut ranks = HashMap::new();
        let mut owners = HashSet::new();
        for g in &layout.groups {
            if g.tracks.is_empty() || !owners.insert(g.owner) {
                return Err(FormatError::UnsupportedProfile);
            }
            for t in &g.tracks {
                if !expected.contains(t)
                    || t.owner(&next)? != g.owner
                    || ranks.insert(*t, ranks.len()).is_some()
                {
                    return Err(FormatError::UnsupportedProfile);
                }
            }
        }
        if expected.len() != ranks.len() {
            return Err(FormatError::UnsupportedProfile);
        }
        let a = &mut next.animations[layout.animation];
        a.tracks.sort_by_key(|t| {
            ranks[&WireTrack::Bone {
                bone: t.bone,
                channel: t.channel,
            }]
        });
        a.slot_tracks.sort_by_key(|t| ranks[&WireTrack::slot(t)]);
        a.sequence_tracks.sort_by_key(|t| {
            ranks[&WireTrack::Sequence {
                attachment: t.attachment,
            }]
        });
        a.deform_tracks.sort_by_key(|t| {
            ranks[&WireTrack::Deform {
                attachment: t.attachment,
            }]
        });
        a.constraint_tracks
            .sort_by_key(|t| ranks[&WireTrack::constraint(t)]);
        a.event_tracks
            .sort_by_key(|t| ranks[&WireTrack::Event { event: t.event }]);
    }
    *p = next;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::minimal::{
        regions::{Attachment, Region, RegionProject, Slot},
        Bone, MinimalProject,
    };
    fn fixture() -> SceneProject {
        let mut rig = MinimalProject::new("wire fixture".into(), [7; 16]);
        rig.bones.push(Bone {
            name: "child".into(),
            parent: Some(0),
            ..Bone::root()
        });
        let regions = RegionProject {
            rig,
            images_root: "images".into(),
            region_order: vec![0, 1],
            slots: (0..2)
                .map(|i| Slot {
                    name: format!("slot{i}"),
                    bone: i,
                    color: [255; 4],
                    blend: regions::BlendMode::Normal,
                    visible: true,
                    attachment: Some(Attachment::Region(Region {
                        name: format!("image{i}"),
                        path: String::new(),
                        x: 0.,
                        y: 0.,
                        rotation: 0.,
                        scale_x: 1.,
                        scale_y: 1.,
                        width: 32.,
                        height: 24.,
                    })),
                })
                .collect(),
        };
        let mut p = SceneProject::from(&regions);
        p.animations[0].tracks = vec![BoneTimeline {
            bone: 1,
            channel: BoneChannel::Translate,
            keys: vec![
                BoneKeyframe {
                    frame: 0.,
                    values: [0., 0.],
                    curve: KeyCurve::Linear,
                },
                BoneKeyframe {
                    frame: 30.,
                    values: [20., 0.],
                    curve: KeyCurve::Linear,
                },
            ],
        }];
        p.animations[0].slot_tracks = vec![SlotTimeline::Attachment {
            slot: 0,
            keys: vec![SlotAttachmentKey {
                frame: 0.,
                attachment: Some(0),
            }],
        }];
        p
    }
    fn provenance(p: &mut SceneProject) {
        let mut layout = animation_layout(p, 0).unwrap();
        layout.groups.reverse();
        p.wire = Some(SceneWire {
            source_state: None,
            slot_references_8: vec![],
            editor_metadata: None,
            constraint_declarations: None,
            editor_scalar_46: FiniteF32::new(50.).unwrap(),
            skeleton_bounds_24: [FiniteF32::new(0.).unwrap(); 4],
            strings: vec![],
            zero_size_meshes: vec![],
            animation_layouts: vec![layout],
        });
    }
    fn roundtrip(p: &SceneProject) -> SceneProject {
        let bytes = encode_scene_payload(p).unwrap();
        let decoded = decode_scene(&bytes).unwrap();
        assert_eq!(&decoded, p);
        assert_eq!(encode_scene_payload(&decoded).unwrap(), bytes);
        decoded
    }
    #[test]
    fn semantic_alias_partition_survives_numeric_keys_insert_rename_and_string_identity_shifts() {
        let mut p = fixture();
        provenance(&mut p);
        p.rig.bones[0].name = crate::TARGET_VERSION.into();
        p.wire.as_mut().unwrap().strings = vec![
            WireStringAlias {
                owner: WireStringOwner::Project,
                tag: 20,
                group: 91,
                encoding: None,
            },
            WireStringAlias {
                owner: WireStringOwner::Bone(0),
                tag: 1,
                group: 91,
                encoding: None,
            },
        ];
        normalize_wire_strings(&mut p).unwrap();
        roundtrip(&p);
        p.rig.bones[1].x = 17.;
        p.animations[0].tracks[0].keys.insert(
            1,
            BoneKeyframe {
                frame: 15.,
                values: [7., 3.],
                curve: KeyCurve::Stepped,
            },
        );
        roundtrip(&p);
        p.rig.bones[0].name = "renamed independently".into();
        normalize_wire_strings(&mut p).unwrap();
        assert!(p.wire.as_ref().unwrap().strings.is_empty());
        roundtrip(&p);
        assert!(p.to_regions().is_err());
    }
    #[test]
    fn layout_requires_exact_semantic_coverage_and_correct_owner() {
        let mut p = fixture();
        provenance(&mut p);
        roundtrip(&p);
        let layout = &mut p.wire.as_mut().unwrap().animation_layouts[0];
        layout.groups[0].tracks.clear();
        assert!(encode_scene_payload(&p).is_err());
        provenance(&mut p);
        p.wire.as_mut().unwrap().animation_layouts[0].groups[0].owner = WireAnimationOwner::Bone(1);
        assert!(encode_scene_payload(&p).is_err());
        provenance(&mut p);
        let duplicate = p.wire.as_ref().unwrap().animation_layouts[0].groups[0].tracks[0];
        p.wire.as_mut().unwrap().animation_layouts[0].groups[0]
            .tracks
            .push(duplicate);
        assert!(encode_scene_payload(&p).is_err());
        provenance(&mut p);
        p.wire.as_mut().unwrap().strings.push(WireStringAlias {
            owner: WireStringOwner::Bone(999),
            tag: 1,
            group: 0,
            encoding: None,
        });
        assert!(encode_scene_payload(&p).is_err());
    }
    #[test]
    fn canonical_provenance_absence_and_positive_region_dimensions_stay_explicit() {
        let mut p = fixture();
        let bytes = encode_scene_payload(&p).unwrap();
        assert!(decode_scene(&bytes).unwrap().wire.is_none());
        for value in [0., -0., -1., f32::INFINITY, f32::NAN] {
            p.slots[0].attachments[0].image_mut().unwrap().width = value;
            assert!(encode_scene_payload(&p).is_err());
        }
        p.slots[0].attachments[0] = SceneAttachment::Mesh(Box::new(crate::minimal::meshes::quad(
            Region {
                name: "mesh".into(),
                path: String::new(),
                x: 0.,
                y: 0.,
                rotation: 0.,
                scale_x: 1.,
                scale_y: 1.,
                width: 0.,
                height: 24.,
            },
            0,
        )));
        assert!(encode_scene_payload(&p).is_err());
    }
    #[test]
    fn zero_mesh_image_metadata_requires_an_exact_source_marker_and_keeps_authored_geometry() {
        let mut p = fixture();
        let mut mesh =
            crate::minimal::meshes::quad(p.slots[0].attachments[0].image().unwrap().clone(), 0);
        let vertices = mesh.vertices.clone();
        mesh.image.width = 0.;
        mesh.image.height = -0.;
        p.slots[0].attachments[0] = SceneAttachment::Mesh(Box::new(mesh));
        assert!(encode_scene_payload(&p).is_err());
        provenance(&mut p);
        assert!(encode_scene_payload(&p).is_err());
        p.wire.as_mut().unwrap().zero_size_meshes = vec![AttachmentAddress {
            slot: 0,
            attachment: 0,
        }];
        let reopened = roundtrip(&p);
        assert_eq!(
            reopened.slots[0].attachments[0].mesh().unwrap().vertices,
            vertices
        );
        p.wire
            .as_mut()
            .unwrap()
            .zero_size_meshes
            .push(AttachmentAddress {
                slot: 0,
                attachment: 0,
            });
        assert!(encode_scene_payload(&p).is_err());
        p.wire.as_mut().unwrap().zero_size_meshes.pop();
        p.slots[0].attachments[0].image_mut().unwrap().width = -1.;
        assert!(encode_scene_payload(&p).is_err());
        p.slots[0].attachments[0].image_mut().unwrap().width = 32.;
        p.slots[0].attachments[0].image_mut().unwrap().height = 24.;
        assert!(
            encode_scene_payload(&p).is_err(),
            "stale zero marker rejects"
        );
    }
    #[test]
    fn mixed_known_family_layouts_keep_event_defaults_and_every_track_identity() {
        let mut p = fixture();
        p.slots[0].attachments[0] = SceneAttachment::Mesh(Box::new(crate::minimal::meshes::quad(
            p.slots[0].attachments[0].image().unwrap().clone(),
            0,
        )));
        p.constraints
            .push(Constraint::Physics(PhysicsConstraint::new(
                "physics".into(),
                1,
            )));
        p.events.push(EventDefinition {
            name: "cue".into(),
            int: 1,
            float: 2.,
            string: "same default".into(),
            audio: String::new(),
            volume: 1.,
            balance: 0.,
        });
        p.animations[0].deform_tracks.push(DeformTimeline {
            attachment: AttachmentAddress {
                slot: 0,
                attachment: 0,
            },
            keys: vec![DeformKey {
                frame: 0.,
                offsets: vec![0.; 8],
                data_present: true,
                curve: DeformCurve::Linear,
            }],
        });
        p.animations[0]
            .constraint_tracks
            .push(ConstraintTimeline::PhysicsReset {
                constraint: 0,
                keys: vec![PhysicsResetKeyframe { frame: 0. }],
            });
        p.animations[0].event_tracks.push(EventTimeline {
            event: 0,
            keys: vec![EventKeyframe {
                frame: 0.,
                int: 3,
                float: 4.,
                string: "same default".into(),
                volume: 1.,
                balance: 0.,
            }],
        });
        p.animations[0].draw_order.push(DrawOrderKey {
            frame: 0.,
            offsets: vec![],
        });
        provenance(&mut p);
        for group in &mut p.wire.as_mut().unwrap().animation_layouts[0].groups {
            group.tracks.reverse();
        }
        roundtrip(&p);
    }
    #[test]
    fn family_vectors_must_follow_layout_and_explicit_normalization_preserves_semantic_tracks() {
        let mut p = fixture();
        p.animations[0].slot_tracks.push(SlotTimeline::Attachment {
            slot: 1,
            keys: vec![SlotAttachmentKey {
                frame: 5.,
                attachment: None,
            }],
        });
        provenance(&mut p);
        roundtrip(&p);
        p.animations[0].slot_tracks.reverse();
        assert!(encode_scene_payload(&p).is_err());
        normalize_wire_track_order(&mut p).unwrap();
        roundtrip(&p);
        let before = p.clone();
        p.wire.as_mut().unwrap().animation_layouts[0].groups[0]
            .tracks
            .clear();
        let invalid = p.clone();
        assert!(normalize_wire_track_order(&mut p).is_err());
        assert_eq!(p, invalid);
        assert_ne!(p, before);
    }
    #[test]
    fn exact_canonical_transition_drops_unnecessary_provenance_without_changing_bytes() {
        let mut p = fixture();
        let canonical = encode_scene_payload(&p).unwrap();
        let layout = animation_layout(&p, 0).unwrap();
        p.wire = Some(SceneWire {
            source_state: None,
            slot_references_8: vec![],
            editor_metadata: None,
            constraint_declarations: None,
            editor_scalar_46: FiniteF32::new(100.).unwrap(),
            skeleton_bounds_24: [FiniteF32::new(0.).unwrap(); 4],
            strings: vec![
                WireStringAlias {
                    owner: WireStringOwner::Bone(0),
                    tag: 28,
                    group: 0,
                    encoding: None,
                },
                WireStringAlias {
                    owner: WireStringOwner::Bone(1),
                    tag: 28,
                    group: 0,
                    encoding: None,
                },
            ],
            zero_size_meshes: vec![],
            animation_layouts: vec![layout],
        });
        assert_eq!(encode_scene_payload(&p).unwrap(), canonical);
        normalize_wire_strings(&mut p).unwrap();
        assert!(p.wire.is_none());
        roundtrip(&p);
    }
}

#[cfg(test)]
mod bounds_tests {
    use super::*;
    use crate::minimal::{regions::RegionProject, MinimalProject};
    fn fixture(bounds: [f32; 4]) -> SceneProject {
        let mut p = SceneProject::from(&RegionProject {
            rig: MinimalProject::new("own stored bounds".into(), [29; 16]),
            images_root: "./images/".into(),
            slots: vec![],
            region_order: vec![],
        });
        p.wire = Some(SceneWire {
            source_state: None,
            slot_references_8: vec![],
            editor_metadata: None,
            constraint_declarations: None,
            editor_scalar_46: FiniteF32::new(100.).unwrap(),
            skeleton_bounds_24: bounds.map(|v| FiniteF32::new(v).unwrap()),
            strings: vec![],
            zero_size_meshes: vec![],
            animation_layouts: vec![animation_layout(&p, 0).unwrap()],
        });
        p
    }
    #[test]
    fn skeleton_metadata_bounds_preserve_all_finite_bits_without_geometry_authority() {
        let values = [-0., f32::from_bits(0x8000_0001), f32::MAX, -42.5];
        let mut p = fixture(values);
        let bytes = encode_scene_payload(&p).unwrap();
        let decoded = decode_scene(&bytes).unwrap();
        assert_eq!(decoded, p);
        assert_eq!(
            decoded
                .wire
                .as_ref()
                .unwrap()
                .skeleton_bounds_24
                .map(FiniteF32::to_bits),
            values.map(f32::to_bits)
        );
        assert_eq!(encode_scene_payload(&decoded).unwrap(), bytes);
        let before = p.clone();
        p.rig.bones[0].x = 12.5;
        normalize_wire_strings(&mut p).unwrap();
        assert_eq!(p.wire, before.wire);
        let edited = decode_scene(&encode_scene_payload(&p).unwrap()).unwrap();
        assert_eq!(edited, p);
        assert_eq!(
            edited.wire.as_ref().unwrap().skeleton_bounds_24,
            before.wire.as_ref().unwrap().skeleton_bounds_24
        );
        p.rig.bones[0].x = before.rig.bones[0].x;
        assert_eq!(p, before);
    }
    #[test]
    fn skeleton_bounds_positive_zero_default_keeps_canonical_bytes_and_negative_zero_presence() {
        let mut p = fixture([0.; 4]);
        let mut canonical = p.clone();
        canonical.wire = None;
        let bytes = encode_scene_payload(&canonical).unwrap();
        assert_eq!(encode_scene_payload(&p).unwrap(), bytes);
        assert!(decode_scene(&bytes).unwrap().wire.is_none());
        normalize_wire_strings(&mut p).unwrap();
        assert!(p.wire.is_none());
        let mut negative = fixture([-0., 0., 0., 0.]);
        normalize_wire_strings(&mut negative).unwrap();
        assert!(negative.wire.is_some());
        let nbytes = encode_scene_payload(&negative).unwrap();
        assert_ne!(nbytes, bytes);
        assert_eq!(decode_scene(&nbytes).unwrap(), negative);
    }
    #[test]
    fn skeleton_bounds_bad_shape_and_nonfinite_raw_values_reject_without_normalizing() {
        let p = fixture([1., 2., 3., 4.]);
        for values in [
            vec![1., 2., 3.],
            vec![1., 2., 3., 4., 5.],
            vec![f32::NAN, 2., 3., 4.],
            vec![1., f32::INFINITY, 3., 4.],
            vec![1., 2., f32::NEG_INFINITY, 4.],
        ] {
            let mut record = super::super::write::project_record(&p);
            let Field::Value(Object::Array(skeletons)) = &mut record
                .fields
                .iter_mut()
                .find(|(tag, _)| *tag == 0)
                .unwrap()
                .1
            else {
                panic!("own skeleton array")
            };
            let Object::Record(skeleton) = &mut skeletons[0] else {
                panic!("own skeleton record")
            };
            skeleton
                .fields
                .iter_mut()
                .find(|(tag, _)| *tag == 24)
                .unwrap()
                .1 = Field::FloatArray(values);
            let bytes = crate::minimal::encode_record_payload(&record, p.rig.identity);
            assert!(decode_scene(&bytes).is_err());
        }
        for value in [f32::NAN, f32::INFINITY, f32::NEG_INFINITY] {
            assert!(FiniteF32::new(value).is_err());
        }
    }
}
