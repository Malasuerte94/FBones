//! Exact observed constraint/Event timeline values; runtime state is not stored.
use super::{Animation, Constraint, SceneProject};
use crate::FormatError;
#[derive(Clone, Debug)]
pub struct EventDefinition {
    pub name: String,
    pub int: i32,
    pub float: f32,
    pub string: String,
    pub audio: String,
    pub volume: f32,
    pub balance: f32,
}
impl PartialEq for EventDefinition {
    fn eq(&self, o: &Self) -> bool {
        self.name == o.name
            && self.int == o.int
            && self.float.to_bits() == o.float.to_bits()
            && self.string == o.string
            && self.audio == o.audio
            && self.volume.to_bits() == o.volume.to_bits()
            && self.balance.to_bits() == o.balance.to_bits()
    }
}
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum PhysicsProperty {
    Inertia,
    Strength,
    Damping,
    Mass,
    Wind,
    Gravity,
    Mix,
}
impl PhysicsProperty {
    pub const ALL: [Self; 7] = [
        Self::Inertia,
        Self::Strength,
        Self::Damping,
        Self::Mass,
        Self::Wind,
        Self::Gravity,
        Self::Mix,
    ];
    pub fn index(self) -> usize {
        Self::ALL.iter().position(|p| *p == self).unwrap()
    }
}
macro_rules! axes_curve {
    ($name:ident,$n:expr) => {
        #[derive(Clone, Copy, Debug)]
        pub enum $name {
            Linear,
            Stepped,
            Bezier { controls: [[f32; 4]; $n] },
        }
        impl PartialEq for $name {
            fn eq(&self, o: &Self) -> bool {
                match (self, o) {
                    (Self::Linear, Self::Linear) | (Self::Stepped, Self::Stepped) => true,
                    (Self::Bezier { controls: a }, Self::Bezier { controls: b }) => a
                        .iter()
                        .flatten()
                        .map(|v| v.to_bits())
                        .eq(b.iter().flatten().map(|v| v.to_bits())),
                    _ => false,
                }
            }
        }
    };
}
axes_curve!(IkKeyCurve, 2);
axes_curve!(TransformMixCurve, 6);
#[derive(Clone, Copy, Debug)]
pub enum PhysicsCurve {
    Linear,
    Stepped,
    Bezier { controls: [f32; 4] },
}
impl PartialEq for PhysicsCurve {
    fn eq(&self, o: &Self) -> bool {
        match (self, o) {
            (Self::Linear, Self::Linear) | (Self::Stepped, Self::Stepped) => true,
            (Self::Bezier { controls: a }, Self::Bezier { controls: b }) => {
                a.map(f32::to_bits) == b.map(f32::to_bits)
            }
            _ => false,
        }
    }
}
#[derive(Clone, Debug)]
pub struct IkKeyframe {
    pub frame: f32,
    pub mix: f32,
    pub softness: f32,
    pub stretch: bool,
    pub compress: bool,
    pub bend_positive: bool,
    pub curve: IkKeyCurve,
}
impl PartialEq for IkKeyframe {
    fn eq(&self, o: &Self) -> bool {
        self.frame.to_bits() == o.frame.to_bits()
            && self.mix.to_bits() == o.mix.to_bits()
            && self.softness.to_bits() == o.softness.to_bits()
            && self.stretch == o.stretch
            && self.compress == o.compress
            && self.bend_positive == o.bend_positive
            && self.curve == o.curve
    }
}
#[derive(Clone, Debug)]
pub struct TransformMixKeyframe {
    pub frame: f32,
    pub values: [f32; 6],
    pub curve: TransformMixCurve,
}
impl PartialEq for TransformMixKeyframe {
    fn eq(&self, o: &Self) -> bool {
        self.frame.to_bits() == o.frame.to_bits()
            && self.values.map(f32::to_bits) == o.values.map(f32::to_bits)
            && self.curve == o.curve
    }
}
#[derive(Clone, Debug)]
pub struct PhysicsKeyframe {
    pub frame: f32,
    pub value: f32,
    pub curve: PhysicsCurve,
}
impl PartialEq for PhysicsKeyframe {
    fn eq(&self, o: &Self) -> bool {
        self.frame.to_bits() == o.frame.to_bits()
            && self.value.to_bits() == o.value.to_bits()
            && self.curve == o.curve
    }
}
#[derive(Clone, Debug)]
pub struct PhysicsResetKeyframe {
    pub frame: f32,
}
impl PartialEq for PhysicsResetKeyframe {
    fn eq(&self, o: &Self) -> bool {
        self.frame.to_bits() == o.frame.to_bits()
    }
}
#[derive(Clone, Debug, PartialEq)]
pub enum ConstraintTimeline {
    Ik {
        constraint: usize,
        keys: Vec<IkKeyframe>,
    },
    TransformMix {
        constraint: usize,
        keys: Vec<TransformMixKeyframe>,
    },
    Physics {
        constraint: usize,
        property: PhysicsProperty,
        keys: Vec<PhysicsKeyframe>,
    },
    PhysicsReset {
        constraint: usize,
        keys: Vec<PhysicsResetKeyframe>,
    },
}
impl ConstraintTimeline {
    pub fn constraint(&self) -> usize {
        match self {
            Self::Ik { constraint, .. }
            | Self::TransformMix { constraint, .. }
            | Self::Physics { constraint, .. }
            | Self::PhysicsReset { constraint, .. } => *constraint,
        }
    }
    pub fn kind(&self) -> u32 {
        match self {
            Self::Ik { .. } => 7,
            Self::TransformMix { .. } => 8,
            Self::Physics { property, .. } => 23 + property.index() as u32,
            Self::PhysicsReset { .. } => 30,
        }
    }
    pub fn owner_bone(&self, p: &SceneProject) -> Result<usize, FormatError> {
        match (p.constraints.get(self.constraint()), self) {
            (Some(Constraint::Ik(c)), Self::Ik { .. }) => Ok(c.target),
            (Some(Constraint::Transform(c)), Self::TransformMix { .. }) => Ok(c.source),
            (Some(Constraint::Physics(c)), Self::Physics { .. } | Self::PhysicsReset { .. }) => {
                Ok(c.bone)
            }
            _ => Err(FormatError::UnsupportedProfile),
        }
    }
}
#[derive(Clone, Debug)]
pub struct EventKeyframe {
    pub frame: f32,
    pub int: i32,
    pub float: f32,
    pub string: String,
    pub volume: f32,
    pub balance: f32,
}
impl PartialEq for EventKeyframe {
    fn eq(&self, o: &Self) -> bool {
        self.frame.to_bits() == o.frame.to_bits()
            && self.int == o.int
            && self.float.to_bits() == o.float.to_bits()
            && self.string == o.string
            && self.volume.to_bits() == o.volume.to_bits()
            && self.balance.to_bits() == o.balance.to_bits()
    }
}
#[derive(Clone, Debug, PartialEq)]
pub struct EventTimeline {
    pub event: usize,
    pub keys: Vec<EventKeyframe>,
}
impl Animation {
    pub fn constraint_track_permutation(
        &self,
        p: &SceneProject,
    ) -> Result<Vec<usize>, FormatError> {
        let mut owners = Vec::new();
        for t in &self.tracks {
            if !owners.contains(&t.bone) {
                owners.push(t.bone)
            }
        }
        for t in &self.slot_tracks {
            let b = p
                .slots
                .get(t.slot())
                .ok_or(FormatError::UnsupportedProfile)?
                .bone;
            if !owners.contains(&b) {
                owners.push(b)
            }
        }
        for t in &self.deform_tracks {
            let b = p
                .slots
                .get(t.attachment.slot)
                .ok_or(FormatError::UnsupportedProfile)?
                .bone;
            if !owners.contains(&b) {
                owners.push(b)
            }
        }
        let mut ranks = Vec::new();
        for t in &self.constraint_tracks {
            let b = t.owner_bone(p)?;
            let rank = if let Some(i) = owners.iter().position(|v| *v == b) {
                i
            } else {
                owners.push(b);
                owners.len() - 1
            };
            ranks.push(rank)
        }
        let mut order: Vec<_> = (0..ranks.len()).collect();
        order.sort_by_key(|i| ranks[*i]);
        Ok(order)
    }
    pub fn event_track_permutation(&self, event_count: usize) -> Result<Vec<usize>, FormatError> {
        if self.event_tracks.iter().any(|t| t.event >= event_count) {
            return Err(FormatError::UnsupportedProfile);
        }
        let mut order: Vec<_> = (0..self.event_tracks.len()).collect();
        order.sort_by_key(|i| self.event_tracks[*i].event);
        Ok(order)
    }
}
pub(crate) struct ConstraintWireKey {
    pub frame: f32,
    pub values: Vec<f32>,
    pub code: u32,
    pub controls: Option<Vec<[f32; 4]>>,
}
impl ConstraintTimeline {
    pub(crate) fn wire_keys(&self) -> Vec<ConstraintWireKey> {
        match self {
            Self::Ik { keys, .. } => keys
                .iter()
                .map(|k| {
                    let (code, controls) = match k.curve {
                        IkKeyCurve::Linear => (0, None),
                        IkKeyCurve::Stepped => (2, None),
                        IkKeyCurve::Bezier { controls } => (1, Some(controls.to_vec())),
                    };
                    ConstraintWireKey {
                        frame: k.frame,
                        values: vec![
                            k.mix,
                            k.softness,
                            u8::from(k.stretch) as f32,
                            u8::from(k.compress) as f32,
                            u8::from(k.bend_positive) as f32,
                        ],
                        code,
                        controls,
                    }
                })
                .collect(),
            Self::TransformMix { keys, .. } => keys
                .iter()
                .map(|k| {
                    let (code, controls) = match k.curve {
                        TransformMixCurve::Linear => (0, None),
                        TransformMixCurve::Stepped => (2, None),
                        TransformMixCurve::Bezier { controls } => (1, Some(controls.to_vec())),
                    };
                    ConstraintWireKey {
                        frame: k.frame,
                        values: k.values.to_vec(),
                        code,
                        controls,
                    }
                })
                .collect(),
            Self::Physics { keys, .. } => keys
                .iter()
                .map(|k| {
                    let (code, controls) = match k.curve {
                        PhysicsCurve::Linear => (0, None),
                        PhysicsCurve::Stepped => (2, None),
                        PhysicsCurve::Bezier { controls } => (1, Some(vec![controls])),
                    };
                    ConstraintWireKey {
                        frame: k.frame,
                        values: vec![k.value],
                        code,
                        controls,
                    }
                })
                .collect(),
            Self::PhysicsReset { keys, .. } => keys
                .iter()
                .map(|k| ConstraintWireKey {
                    frame: k.frame,
                    values: vec![],
                    code: 0,
                    controls: None,
                })
                .collect(),
        }
    }
}
pub(super) fn validate_definitions(p: &SceneProject) -> Result<(), FormatError> {
    let valid = |s: &str| s.len() <= 1024;
    if !valid(&p.audio_root) || p.audio_root.chars().any(char::is_control) || p.events.len() > 128 {
        return Err(FormatError::UnsupportedProfile);
    }
    let mut names = std::collections::HashSet::new();
    for e in &p.events {
        if e.name.is_empty()
            || !valid(&e.name)
            || e.name.chars().any(char::is_control)
            || !names.insert(&e.name)
            || !valid(&e.string)
            || !valid(&e.audio)
            || e.audio.chars().any(char::is_control)
            || [e.float, e.volume, e.balance]
                .iter()
                .any(|v| !v.is_finite() || v.abs() > 1_000_000.)
        {
            return Err(FormatError::UnsupportedProfile);
        }
    }
    Ok(())
}
pub(super) fn validate_tracks(
    p: &SceneProject,
    a: &Animation,
) -> Result<(usize, usize, usize), FormatError> {
    let fail = || FormatError::UnsupportedProfile;
    if a.constraint_track_permutation(p)?
        .iter()
        .copied()
        .ne(0..a.constraint_tracks.len())
        || a.event_track_permutation(p.events.len())?
            .iter()
            .copied()
            .ne(0..a.event_tracks.len())
    {
        return Err(fail());
    }
    let mut seen = std::collections::HashSet::new();
    let mut count = 0;
    let mut extra = 0;
    for t in &a.constraint_tracks {
        t.owner_bone(p)?;
        if !seen.insert((t.constraint(), t.kind())) {
            return Err(fail());
        }
        let keys = t.wire_keys();
        if keys.is_empty() || keys.len() > 4096 {
            return Err(fail());
        }
        count += keys.len();
        extra += keys.len() + 1;
        let mut previous = 0.;
        for (i, k) in keys.iter().enumerate() {
            if !k.frame.is_finite()
                || k.frame < previous
                || k.frame < 0.
                || k.frame > 1_000_000.
                || k.values
                    .iter()
                    .any(|v| !v.is_finite() || v.abs() > 1_000_000.)
            {
                return Err(fail());
            }
            if t.kind() == 7 && k.values[1] < 0. {
                return Err(fail());
            }
            if let ConstraintTimeline::Physics { property, .. } = t {
                if (*property == PhysicsProperty::Mass && k.values[0] <= 0.)
                    || (*property == PhysicsProperty::Damping && k.values[0] < 0.)
                {
                    return Err(fail());
                }
            }
            if let Some(controls) = &k.controls {
                let next = keys.get(i + 1).ok_or_else(fail)?;
                if next.frame <= k.frame {
                    return Err(fail());
                }
                for axis in controls {
                    if axis.iter().any(|v| !v.is_finite() || v.abs() > 1_000_000.)
                        || axis[0] < k.frame
                        || axis[0] > next.frame
                        || axis[2] < k.frame
                        || axis[2] > next.frame
                    {
                        return Err(fail());
                    }
                }
            }
            previous = k.frame;
        }
    }
    let mut events = std::collections::HashSet::new();
    for t in &a.event_tracks {
        if t.event >= p.events.len()
            || !events.insert(t.event)
            || t.keys.is_empty()
            || t.keys.len() > 4096
        {
            return Err(fail());
        }
        count += t.keys.len();
        extra += t.keys.len() * 2 + 1;
        let mut previous = 0.;
        for k in &t.keys {
            if !k.frame.is_finite()
                || k.frame < previous
                || k.frame < 0.
                || k.frame > 1_000_000.
                || k.string.len() > 1024
                || [k.float, k.volume, k.balance]
                    .iter()
                    .any(|v| !v.is_finite() || v.abs() > 1_000_000.)
            {
                return Err(fail());
            }
            previous = k.frame;
        }
    }
    Ok((
        count,
        a.constraint_tracks.len() + a.event_tracks.len(),
        extra,
    ))
}
#[cfg(test)]
#[path = "constraints_events_tests.rs"]
mod tests;
