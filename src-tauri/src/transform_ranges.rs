//! Native endpoint resolution and one-cell range authoring.
//! See TRANSFORM-RANGE-IMPLEMENTATION-POLICY.md for measured versus own policies.
use crate::project::AppError;
use fbones_format::minimal::scene::{FiniteF32, TransformConstraint, TransformProperty as P};

#[cfg(test)]
mod tests;

fn invalid(message: impl Into<String>) -> AppError {
    AppError::new("InvalidTransformRange", message)
}

fn stored(value: f64) -> Result<f32, AppError> {
    let result = value as f32;
    if !value.is_finite() || !result.is_finite() {
        return Err(invalid(
            "A resolved range exceeds finite project precision.",
        ));
    }
    Ok(result)
}

fn set(c: &mut TransformConstraint, index: usize, value: Option<FiniteF32>) {
    let row = &mut c.editor_ranges[index / 4];
    match index % 4 {
        0 => row.source_start = value,
        1 => row.source_end = value,
        2 => row.destination_start = value,
        _ => row.destination_end = value,
    }
}

fn mapped(c: &TransformConstraint) -> [bool; 24] {
    let mut result = [false; 24];
    for from in &c.properties {
        let start = from.property.index() * 4;
        result[start] = true;
        result[start + 1] = true;
        for to in &from.to {
            let start = to.property.index() * 4 + 2;
            result[start] = true;
            result[start + 1] = true;
        }
    }
    result
}

fn validate_graph(c: &TransformConstraint) -> Result<(), AppError> {
    if c.properties.len() > 6 {
        return Err(invalid("A source channel may have only one ordered row."));
    }
    let mut from_seen = [false; 6];
    for from in &c.properties {
        let index = from.property.index();
        if from_seen[index] || from.to.is_empty() || from.to.len() > 6 || !from.offset.is_finite() {
            return Err(invalid(
                "Range resolution requires distinct finite source rows.",
            ));
        }
        from_seen[index] = true;
        let mut to_seen = [false; 6];
        for to in &from.to {
            let index = to.property.index();
            if to_seen[index] || [to.offset, to.max, to.scale].iter().any(|v| !v.is_finite()) {
                return Err(invalid(
                    "Range resolution requires distinct finite destinations.",
                ));
            }
            to_seen[index] = true;
        }
    }
    Ok(())
}

/// SourceStart/SourceEnd/DestinationStart/DestinationEnd in each canonical row.
/// This read-only resolver never materializes a missing cell. Match and the UI
/// consume the same defaults, including the first stored incoming-route rule.
pub(crate) fn resolved_endpoints(c: &TransformConstraint) -> Result<[f64; 24], AppError> {
    validate_graph(c)?;
    let mut values = [0.; 24];
    for property in P::ALL {
        let index = property.index();
        let incoming = c
            .properties
            .iter()
            .flat_map(|from| &from.to)
            .find(|to| to.property == property);
        let row = c.editor_ranges[index];
        values[index * 4 + 2] = row.destination_start.map_or_else(
            || incoming.map_or(0., |to| f64::from(to.offset)),
            |v| f64::from(v.get()),
        );
        values[index * 4 + 3] = row.destination_end.map_or_else(
            || incoming.map_or(1., |to| f64::from(to.max)),
            |v| f64::from(v.get()),
        );
    }
    for property in P::ALL {
        let index = property.index();
        let row = c.editor_ranges[index];
        let from = c.properties.iter().find(|from| from.property == property);
        let start = row.source_start.map_or_else(
            || from.map_or(0., |from| f64::from(from.offset)),
            |v| f64::from(v.get()),
        );
        let end = if let Some(value) = row.source_end {
            f64::from(value.get())
        } else if let Some(from) = from {
            let first = &from.to[0];
            let target = first.property.index() * 4 + 2;
            start
                + if first.scale == 0. {
                    1.
                } else {
                    (values[target + 1] - values[target]) / f64::from(first.scale)
                }
        } else {
            1.
        };
        values[index * 4] = start;
        values[index * 4 + 1] = end;
    }
    if values.iter().any(|v| !v.is_finite()) {
        return Err(invalid(
            "Existing endpoints do not resolve to finite values.",
        ));
    }
    Ok(values)
}

/// Stage one exact requested presence/bit intent. Runtime rows and all mapped
/// peer materialization commit together or not at all; no bone pose is sampled.
pub(crate) fn edited(
    c: &TransformConstraint,
    index: usize,
    bits: Option<u32>,
) -> Result<TransformConstraint, AppError> {
    if index >= 24 {
        return Err(invalid("Choose one of the 24 Transform range endpoints."));
    }
    let requested = bits
        .map(FiniteF32::from_bits)
        .transpose()
        .map_err(|_| invalid("Range endpoints must be finite f32 values."))?;
    let old_bits = c.editor_range_bits();
    if old_bits[index] == bits {
        return Ok(c.clone());
    }
    let mut next = c.clone();
    set(&mut next, index, requested);
    let linked = mapped(c);
    if !linked[index] {
        return Ok(next);
    }
    let mut values = resolved_endpoints(c)?;
    values[index] = if let Some(value) = requested {
        f64::from(value.get())
    } else {
        // Clear derives only this endpoint from current runtime fallback. All
        // other endpoints keep their old resolved value, including old peers.
        resolved_endpoints(&next)?[index]
    };
    for i in 0..24 {
        if linked[i] && i != index && old_bits[i].is_none() {
            let value = FiniteF32::new(stored(values[i])?)
                .map_err(|_| invalid("A resolved peer endpoint must be finite."))?;
            set(&mut next, i, Some(value));
        }
    }
    let property = P::ALL[index / 4];
    let source_side = index % 4 < 2;
    for from in &mut next.properties {
        let affected = if source_side {
            from.property == property
        } else {
            from.to.iter().any(|to| to.property == property)
        };
        if !affected {
            continue;
        }
        let i = from.property.index() * 4;
        let start = stored(values[i])?;
        let end = stored(values[i + 1])?;
        let denominator = end - start;
        if denominator == 0. || !denominator.is_finite() {
            return Err(invalid(
                "The affected source span is zero or overflows project precision.",
            ));
        }
        from.offset = start;
        for to in &mut from.to {
            let i = to.property.index() * 4 + 2;
            let start = stored(values[i])?;
            let end = stored(values[i + 1])?;
            let numerator = end - start;
            let scale = numerator / denominator;
            if !scale.is_finite() || (numerator != 0. && scale == 0.) {
                return Err(invalid(
                    "The affected runtime scale exceeds finite project precision.",
                ));
            }
            to.offset = start;
            to.max = end;
            to.scale = scale;
        }
    }
    Ok(next)
}
