//! Transform65/tag31 editor endpoints. These are independent from runtime maps.
use crate::FormatError;

/// A finite IEEE754 single whose equality includes the sign of zero.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct FiniteF32(u32);

impl FiniteF32 {
    pub fn new(value: f32) -> Result<Self, FormatError> {
        Self::from_bits(value.to_bits())
    }

    pub fn from_bits(bits: u32) -> Result<Self, FormatError> {
        if !f32::from_bits(bits).is_finite() {
            return Err(FormatError::UnsupportedProfile);
        }
        Ok(Self(bits))
    }

    pub fn get(self) -> f32 {
        f32::from_bits(self.0)
    }

    pub fn to_bits(self) -> u32 {
        self.0
    }
}

/// Four independently nullable cells for one channel. Reversed, equal and
/// partially absent endpoints are retained; no runtime formula is imposed.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub struct TransformEditorRange {
    pub source_start: Option<FiniteF32>,
    pub source_end: Option<FiniteF32>,
    pub destination_start: Option<FiniteF32>,
    pub destination_end: Option<FiniteF32>,
}

impl TransformEditorRange {
    pub fn from_bits(bits: [Option<u32>; 4]) -> Result<Self, FormatError> {
        let cell = |i: usize| bits[i].map(FiniteF32::from_bits).transpose();
        Ok(Self {
            source_start: cell(0)?,
            source_end: cell(1)?,
            destination_start: cell(2)?,
            destination_end: cell(3)?,
        })
    }

    pub fn bits(self) -> [Option<u32>; 4] {
        [
            self.source_start,
            self.source_end,
            self.destination_start,
            self.destination_end,
        ]
        .map(|cell| cell.map(FiniteF32::to_bits))
    }
}
