import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  clampTimelineScrollLeft,
  timelineContentFrame,
  timelineFramePixel,
  timelineScrollAtAnchor,
} from '../src/domain/timelineCamera.ts';
import { timelineFrameAt } from '../src/domain/animationTimeline.ts';

test('timeline content positions invert through a scrolled positive lead-in without snapping', () => {
  const gutter = 210, scrollLeft = 70, leadingPixels = 144, pixelsPerFrame = 8;
  const content = timelineFramePixel(18.375, leadingPixels, pixelsPerFrame);
  const clientX = gutter + content - scrollLeft;
  assert.equal(timelineContentFrame(clientX - gutter + scrollLeft, leadingPixels, pixelsPerFrame), 18.375);
  assert.equal(timelineFrameAt(clientX, gutter + leadingPixels, scrollLeft, pixelsPerFrame, false), 18.375);
  assert.equal(timelineContentFrame(75, leadingPixels, pixelsPerFrame), -8.625);
  assert.equal(timelineFrameAt(gutter + 75, gutter + leadingPixels, 0, pixelsPerFrame, false), 0);
});

test('linked panes share an anchor across the lead-in and zoom change', () => {
  const previous = { leadingPixels: 144, pixelsPerFrame: 8 };
  const next = { leadingPixels: 24, pixelsPerFrame: 12 };
  const scrollLeft = timelineScrollAtAnchor(184, 40, previous, next);
  assert.equal(scrollLeft, 104);
  assert.equal(timelineContentFrame(scrollLeft + 40, next.leadingPixels, next.pixelsPerFrame), 10);
  assert.equal(timelineScrollAtAnchor(scrollLeft, 40, next, previous), 184);
});

test('linked scroll clamps to the smallest measured range and excludes unmeasured panes', () => {
  const sheet = { scrollWidth: 1260, clientWidth: 476 };
  const graph = { scrollWidth: 1260, clientWidth: 464 };
  const unmeasured = { scrollWidth: 0, clientWidth: 0 };
  assert.equal(clampTimelineScrollLeft(810, [sheet, graph]), 784);
  assert.equal(clampTimelineScrollLeft(810, [graph, sheet]), 784);
  assert.equal(clampTimelineScrollLeft(782.5, [sheet, graph]), 782.5);
  assert.equal(clampTimelineScrollLeft(810, [unmeasured, graph]), 796);
  assert.equal(clampTimelineScrollLeft(782.5, [unmeasured]), 782.5);
  assert.equal(clampTimelineScrollLeft(20, [{ scrollWidth: 400, clientWidth: 450 }, graph]), 0);
  assert.equal(clampTimelineScrollLeft(-20, [sheet, graph]), 0);
  assert.equal(clampTimelineScrollLeft(NaN, [sheet, graph]), 0);
});
