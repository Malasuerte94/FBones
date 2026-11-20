use super::*;
use crate::minimal::scene::*;
pub(super) const EVENT_VALUE: u32 = u32::MAX - 1;
type RawConstraintKey = (f32, Vec<f32>, u32, Vec<[f32; 4]>);

fn controls(raw: &[RawConstraintKey], i: usize) -> Result<Vec<[f32; 4]>> {
    let next = raw.get(i + 1).ok_or(FormatError::UnsupportedProfile)?;
    Ok(raw[i]
        .3
        .iter()
        .zip(&next.3)
        .map(|(a, b)| [a[2], a[3], b[0], b[1]])
        .collect())
}

fn path_keys<const N: usize>(raw: &[RawConstraintKey]) -> Result<Vec<PathKeyframe<N>>> {
    raw.iter()
        .enumerate()
        .map(|(i, (frame, values, code, _))| {
            Ok(PathKeyframe {
                frame: *frame,
                values: values
                    .as_slice()
                    .try_into()
                    .map_err(|_| FormatError::UnsupportedProfile)?,
                curve: match code {
                    0 => PathKeyCurve::Linear,
                    2 => PathKeyCurve::Stepped,
                    1 => PathKeyCurve::Bezier {
                        controls: controls(raw, i)?
                            .try_into()
                            .map_err(|_| FormatError::UnsupportedProfile)?,
                    },
                    _ => return unsupported(),
                },
            })
        })
        .collect()
}

impl Reader<'_> {
    pub(super) fn constraint_event_track(&mut self, kind: u32) -> Result<BTreeMap<u32, Value>> {
        let keys = self.generic(204, |r| {
            let count = r.uint()?;
            if count == 0 || count > super::super::scene::MAX_TRACK_KEYS as u32 {
                return unsupported();
            }
            let mut raw = Vec::new();
            let mut events = Vec::new();
            let mut previous = 0;
            for _ in 0..count {
                if r.uint()? != 133 || r.uint()? != 1 || r.domain.len() >= MAX_DOMAIN_OBJECTS {
                    return unsupported();
                }
                r.domain.push(Domain {
                    class: 133,
                    fields: Some(BTreeMap::new()),
                });
                let frame = r.float()?;
                if kind == 12 {
                    if r.uint()? != 0 {
                        return unsupported();
                    }
                    r.schema.entry(EVENT_VALUE).or_insert_with(|| {
                        HashMap::from([
                            (6, FieldKind::Float),
                            (1, FieldKind::DomainLink(35)),
                            (2, FieldKind::UInt),
                            (4, FieldKind::String),
                            (3, FieldKind::Float),
                            (5, FieldKind::Float),
                        ])
                    });
                    events.push((frame, r.domain(EVENT_VALUE)?));
                    continue;
                }
                let dimension = match kind {
                    7 => 5,
                    8 => 6,
                    11 => 3,
                    30 => 0,
                    _ => 1,
                };
                let mut values = Vec::new();
                for _ in 0..dimension {
                    values.push(r.float()?)
                }
                let code = r.uint()?;
                if code > 2 || (kind == 30 && code != 0) {
                    return unsupported();
                }
                let axes = match kind {
                    7 => 2,
                    8 => 6,
                    11 => 3,
                    30 => 0,
                    _ => 1,
                };
                let mut handles = vec![[2147483648.; 4]; axes];
                if code == 1 || previous == 1 {
                    for handle in &mut handles {
                        for value in handle {
                            *value = r.float()?
                        }
                        if r.take(4)? != [0; 4] {
                            return unsupported();
                        }
                    }
                }
                raw.push((frame, values, code, handles));
                previous = code;
            }
            if kind == 12 {
                return Ok(GenericValue::EventKeys(events));
            }
            let track = match kind {
                7 => {
                    let mut keys = Vec::new();
                    for (i, (frame, v, code, _)) in raw.iter().enumerate() {
                        let boolean = |value: f32| -> Result<bool> {
                            match value.to_bits() {
                                0 => Ok(false),
                                0x3f800000 => Ok(true),
                                _ => unsupported(),
                            }
                        };
                        keys.push(IkKeyframe {
                            frame: *frame,
                            mix: v[0],
                            softness: v[1],
                            stretch: boolean(v[2])?,
                            compress: boolean(v[3])?,
                            bend_positive: boolean(v[4])?,
                            curve: match code {
                                0 => IkKeyCurve::Linear,
                                2 => IkKeyCurve::Stepped,
                                1 => IkKeyCurve::Bezier {
                                    controls: controls(&raw, i)?
                                        .try_into()
                                        .map_err(|_| FormatError::UnsupportedProfile)?,
                                },
                                _ => return unsupported(),
                            },
                        })
                    }
                    ConstraintTimeline::Ik {
                        constraint: 0,
                        keys,
                    }
                }
                8 => {
                    let mut keys = Vec::new();
                    for (i, (frame, v, code, _)) in raw.iter().enumerate() {
                        keys.push(TransformMixKeyframe {
                            frame: *frame,
                            values: v
                                .clone()
                                .try_into()
                                .map_err(|_| FormatError::UnsupportedProfile)?,
                            curve: match code {
                                0 => TransformMixCurve::Linear,
                                2 => TransformMixCurve::Stepped,
                                1 => TransformMixCurve::Bezier {
                                    controls: controls(&raw, i)?
                                        .try_into()
                                        .map_err(|_| FormatError::UnsupportedProfile)?,
                                },
                                _ => return unsupported(),
                            },
                        })
                    }
                    ConstraintTimeline::TransformMix {
                        constraint: 0,
                        keys,
                    }
                }
                9 => ConstraintTimeline::PathPosition {
                    constraint: 0,
                    keys: path_keys(&raw)?,
                },
                10 => ConstraintTimeline::PathSpacing {
                    constraint: 0,
                    keys: path_keys(&raw)?,
                },
                11 => ConstraintTimeline::PathMix {
                    constraint: 0,
                    keys: path_keys(&raw)?,
                },
                30 => ConstraintTimeline::PhysicsReset {
                    constraint: 0,
                    keys: raw
                        .iter()
                        .map(|(frame, _, _, _)| PhysicsResetKeyframe { frame: *frame })
                        .collect(),
                },
                _ => {
                    let mut keys = Vec::new();
                    for (i, (frame, v, code, _)) in raw.iter().enumerate() {
                        keys.push(PhysicsKeyframe {
                            frame: *frame,
                            value: v[0],
                            curve: match code {
                                0 => PhysicsCurve::Linear,
                                2 => PhysicsCurve::Stepped,
                                1 => PhysicsCurve::Bezier {
                                    controls: controls(&raw, i)?[0],
                                },
                                _ => return unsupported(),
                            },
                        })
                    }
                    ConstraintTimeline::Physics {
                        constraint: 0,
                        property: PhysicsProperty::ALL[(kind - 23) as usize],
                        keys,
                    }
                }
            };
            Ok(GenericValue::ConstraintKeys(track))
        })?;
        let class = match kind {
            7 => 56,
            8 => 65,
            9..=11 => 72,
            12 => 35,
            _ => 121,
        };
        let owner = self.domain(class)?;
        if owner == Reference::Null {
            return unsupported();
        }
        Ok(BTreeMap::from([
            (0, Value::UInt(kind)),
            (1, Value::Reference(keys)),
            (2, Value::Reference(owner)),
        ]))
    }
}
