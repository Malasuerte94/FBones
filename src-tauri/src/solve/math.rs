//! FBones affine convention: columns X=(a,b), Y=(c,d), translation=(x,y).
use super::{LocalPose, SolveError};

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Affine {
    pub a: f64,
    pub b: f64,
    pub c: f64,
    pub d: f64,
    pub x: f64,
    pub y: f64,
}
impl Default for Affine {
    fn default() -> Self {
        Self::IDENTITY
    }
}
impl Affine {
    pub const IDENTITY: Self = Self {
        a: 1.,
        b: 0.,
        c: 0.,
        d: 1.,
        x: 0.,
        y: 0.,
    };
    pub fn determinant(self) -> f64 {
        self.a * self.d - self.b * self.c
    }
    pub fn point(self, x: f64, y: f64) -> (f64, f64) {
        (
            self.a * x + self.c * y + self.x,
            self.b * x + self.d * y + self.y,
        )
    }
    pub fn vector(self, x: f64, y: f64) -> (f64, f64) {
        (self.a * x + self.c * y, self.b * x + self.d * y)
    }
    pub fn compose(self, r: Self) -> Self {
        let (a, b) = self.vector(r.a, r.b);
        let (c, d) = self.vector(r.c, r.d);
        let (x, y) = self.point(r.x, r.y);
        Self { a, b, c, d, x, y }
    }
    pub fn inverse(self) -> Result<Self, SolveError> {
        let det = self.determinant();
        let norm = self
            .a
            .abs()
            .max(self.b.abs())
            .max(self.c.abs())
            .max(self.d.abs());
        if !det.is_finite() || norm == 0. || det.abs() <= 1e-12 * norm * norm {
            return Err(SolveError::SingularTransform);
        }
        let a = self.d / det;
        let b = -self.b / det;
        let c = -self.c / det;
        let d = self.a / det;
        Ok(Self {
            a,
            b,
            c,
            d,
            x: -a * self.x - c * self.y,
            y: -b * self.x - d * self.y,
        })
    }
    pub fn finite(self) -> bool {
        [self.a, self.b, self.c, self.d, self.x, self.y]
            .iter()
            .all(|v| v.is_finite())
    }
    pub fn rotate_basis(&mut self, degrees: f64) {
        let (s, c) = degrees.to_radians().sin_cos();
        (self.a, self.b) = (c * self.a - s * self.b, s * self.a + c * self.b);
        (self.c, self.d) = (c * self.c - s * self.d, s * self.c + c * self.d);
    }
    pub fn heading(self) -> f64 {
        self.b.atan2(self.a).to_degrees()
    }
    pub fn scale_x(self) -> f64 {
        self.a.hypot(self.b)
    }
    pub fn scale_y(self) -> f64 {
        self.c.hypot(self.d)
    }
}
impl LocalPose {
    pub fn affine(self) -> Affine {
        let (sx, cx) = (self.rotation + self.shear_x).to_radians().sin_cos();
        let (sy, cy) = (self.rotation + 90. + self.shear_y).to_radians().sin_cos();
        Affine {
            a: cx * self.scale_x,
            b: sx * self.scale_x,
            c: cy * self.scale_y,
            d: sy * self.scale_y,
            x: self.x,
            y: self.y,
        }
    }
    /// World-modified applied channels use a canonical local decomposition.
    /// Original4.3.26 ordered world→local-source probes establish shear-X=0,
    /// positive scale-X and determinant-signed scale-Y; authored signs stay
    /// separately available in BoneFrame.authored.
    pub(super) fn from_affine(matrix: Affine, _reference: Self) -> Result<Self, SolveError> {
        if !matrix.finite() {
            return Err(SolveError::NonFinite);
        }
        let sx = matrix.scale_x();
        let sy = matrix.scale_y() * if matrix.determinant() < 0. { -1. } else { 1. };
        let rotation = if sx > 0. {
            matrix.heading()
        } else if sy != 0. {
            matrix.d.atan2(matrix.c).to_degrees() - 90.
        } else {
            0.
        };
        let shear_y = if sx > 0. && sy != 0. {
            wrap((matrix.d / sy).atan2(matrix.c / sy).to_degrees() - rotation - 90.)
        } else {
            0.
        };
        Ok(Self {
            x: matrix.x,
            y: matrix.y,
            rotation,
            scale_x: sx,
            scale_y: sy,
            shear_x: 0.,
            shear_y,
        })
    }
    pub fn finite(self) -> bool {
        [
            self.x,
            self.y,
            self.rotation,
            self.scale_x,
            self.scale_y,
            self.shear_x,
            self.shear_y,
        ]
        .iter()
        .all(|v| v.is_finite())
    }
}
pub(super) fn wrap(value: f64) -> f64 {
    let v = (value + 180.).rem_euclid(360.) - 180.;
    if v <= -180. {
        180.
    } else {
        v
    }
}
