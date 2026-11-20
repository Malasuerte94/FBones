import * as pixi from 'pixi.js';
import type { Point } from '../domain/binding.ts';
import { weightInfluenceColor } from '../domain/colors.ts';
import type { BoneView, DenseBindingView } from '../domain/project.ts';

const vertex = `
in vec2 aPosition;
in vec3 aWeightColor;
uniform mat3 uProjectionMatrix;
uniform mat3 uWorldTransformMatrix;
uniform mat3 uTransformMatrix;
out vec3 vWeightColor;
void main() {
    vec3 position = uProjectionMatrix * uWorldTransformMatrix * uTransformMatrix * vec3(aPosition, 1.0);
    gl_Position = vec4(position.xy, 0.0, 1.0);
    vWeightColor = aWeightColor;
}
`;

const fragment = `
in vec3 vWeightColor;
out vec4 finalColor;
void main() {
    finalColor = vec4(vWeightColor, 1.0);
}
`;

/** An editor-only fill under the wireframe, independent of artwork and masks. */
export class WeightOverlay {
  private readonly geometry = new pixi.Geometry({
    attributes: {
      aPosition: { buffer: new Float32Array(0), format: 'float32x2' },
      aWeightColor: { buffer: new Float32Array(0), format: 'float32x3' },
    },
    indexBuffer: new Uint32Array(0),
  });
  private readonly shader = new pixi.Shader({
    glProgram: pixi.GlProgram.from({ vertex, fragment, name: 'fbones-weight-overlay' }),
    resources: {},
  });
  readonly mesh = new pixi.Mesh({ geometry: this.geometry, shader: this.shader });
  private meshTriangleSource?: readonly number[];

  draw(
    points: readonly Point[], binding: DenseBindingView, bones: ReadonlyMap<number, BoneView>,
    triangles: readonly number[] | undefined, selectedBones: readonly number[] | undefined,
  ) {
    const positions = new Float32Array(points.length * 2);
    points.forEach(({x, y}, index) => {
      positions[index * 2] = x;
      positions[index * 2 + 1] = y;
    });
    const indices = this.geometry.getIndex();
    if (triangles === undefined) {
      // Clipping has no authored triangles. Triangulate its editable contour,
      // including concave corners, without substituting the rendered mask.
      const contour = pixi.earcut(Array.from(positions));
      if (indices.data.length !== contour.length || contour.some((value, index) => value !== indices.data[index])) {
        indices.data = new Uint32Array(contour);
      }
    } else if (triangles !== this.meshTriangleSource) {
      indices.data = new Uint32Array(triangles);
    }
    this.meshTriangleSource = triangles;
    this.mesh.visible = indices.data.length > 0;
    if (!this.mesh.visible) return;

    this.geometry.getBuffer('aPosition').data = positions;
    this.geometry.getBuffer('aWeightColor').data = colorsForBinding(binding, bones, selectedBones);
  }

  destroy() {
    this.mesh.destroy();
    this.geometry.destroy(true);
    this.shader.destroy();
  }
}

function colorsForBinding(
  binding: DenseBindingView, bones: ReadonlyMap<number, BoneView>, selectedBones?: readonly number[],
) {
  const selected = selectedBones ? new Set(selectedBones) : null;
  const palette = binding.bones.map((bone, column) =>
    selected && !selected.has(bone) ? 0 : weightInfluenceColor(bones.get(bone), column),
  );
  const colors = new Float32Array(binding.vertices.length * 3);
  binding.vertices.forEach(({weights}, index) => {
    let red = 0, green = 0, blue = 0, total = 0;
    weights.forEach((weight, column) => {
      if (weight <= 0) return;
      const color = palette[column]!;
      red += (color >>> 16) * weight;
      green += ((color >>> 8) & 255) * weight;
      blue += (color & 255) * weight;
      total += weight;
    });
    if (total <= 0) return;
    const scale = 1 / (255 * total);
    colors[index * 3] = red * scale;
    colors[index * 3 + 1] = green * scale;
    colors[index * 3 + 2] = blue * scale;
  });
  return colors;
}
