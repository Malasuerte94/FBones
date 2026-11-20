import type { Graphics } from 'pixi.js';
import { bindingWeightColor, type Point } from '../domain/binding.ts';
import { weightInfluenceColor } from '../domain/colors.ts';
import type { BoneView, DenseBindingView } from '../domain/project.ts';

export interface WeightDisplay {
  pies: boolean;
  overlay?: boolean;
  selectedOnly: boolean;
  influences?: readonly number[];
}

const influenceExtension = 1.5;
const selectedOutlineWidth = 1.5;
const selectedRadius = (active: boolean) => active ? 10 : 9;

export function selectedWeightHitRadius(active: boolean) {
  return selectedRadius(active) + influenceExtension + selectedOutlineWidth / 2;
}

export function drawWeightVertices(
  graphics: Graphics, points: readonly Point[], binding: DenseBindingView,
  bones: ReadonlyMap<number, BoneView>, selected: ReadonlySet<number>,
  activeVertex: number | null, influence: number | null, display?: WeightDisplay,
) {
  const activeColumn = influence === null ? -1 : binding.bones.indexOf(influence);
  const pieColors = display?.pies && binding.weighted
    ? binding.bones.map((bone, column) => weightInfluenceColor(bones.get(bone), column))
    : null;
  const filtered = !!pieColors && display?.selectedOnly;
  const selectedColumns = pieColors
    ? (display?.influences ?? []).map(id => binding.bones.indexOf(id)).filter(column => column >= 0)
    : [];
  const emphasized = new Set(selectedColumns);

  function draw(index: number, isSelected: boolean) {
    const { x, y } = points[index]!;
    const { weights } = binding.vertices[index]!;
    const visible = !filtered || isSelected || selectedColumns.some(column => weights[column]! > 0);
    if (pieColors && visible) {
      const radius = isSelected ? selectedRadius(index === activeVertex) : 6;
      const outline = drawPie(graphics, x, y, radius, weights, pieColors, emphasized);
      graphics.circle(x, y, outline).stroke({
        color: isSelected ? (index === activeVertex ? 0xffffff : 0x71dac4) : 0x252728,
        width: isSelected ? selectedOutlineWidth : 1,
      });
      return;
    }
    graphics.circle(x, y, visible ? 6 : 3.5)
      .fill(visible ? bindingWeightColor(weights[activeColumn] ?? 0) : 0x6ce1d9)
      .stroke({ color: 0x252728, width: 1 });
    if (isSelected) {
      graphics.circle(x, y, index === activeVertex ? 9.5 : 8.5)
        .stroke({ color: index === activeVertex ? 0xffffff : 0x71dac4, width: 1.5 });
    }
  }

  points.forEach((_, index) => { if (!selected.has(index)) draw(index, false); });
  for (const index of selected) {
    if (points[index]) draw(index, true);
  }
}

function drawPie(
  graphics: Graphics, x: number, y: number, radius: number,
  weights: readonly number[], colors: readonly number[], emphasized: ReadonlySet<number>,
) {
  const total = weights.reduce((sum, weight) => sum + Math.max(0, weight), 0);
  let angle = -Math.PI / 2;
  for (const [column, weight] of weights.entries()) {
    if (weight <= 0) continue;
    const color = colors[column]!;
    const sectorRadius = emphasized.has(column) ? radius + influenceExtension : radius;
    if (weight === total) {
      graphics.circle(x, y, sectorRadius).fill(color);
      return sectorRadius;
    }
    const next = angle + weight / total * 2 * Math.PI;
    graphics.moveTo(x, y).arc(x, y, sectorRadius, angle, next).closePath().fill(color);
    angle = next;
  }
  return radius;
}
