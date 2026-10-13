import { describe, expect, it } from 'vitest';
import { DRAWN_EXERCISES, GLYPH_SIZE, REP_FRAMES, bounds, exerciseFrames, exerciseGlyph, exerciseMoves, hasExerciseGlyph, type Shape } from './exerciseGlyphs';
import { EXERCISES } from './workout';
import { TEMPLATES } from './templates';

describe('exercise icons', () => {
  it('draws every exercise GymGO plans, and nothing it doesn’t', () => {
    const missing = EXERCISES.filter((exercise) => !hasExerciseGlyph(exercise.id)).map((exercise) => exercise.id);
    expect(missing).toEqual([]);
    const known = new Set(EXERCISES.map((exercise) => exercise.id));
    expect(DRAWN_EXERCISES.filter((id) => !known.has(id))).toEqual([]);
  });

  it('draws every exercise in the templates', () => {
    const ids = TEMPLATES.flatMap((template) => template.days.flatMap((day) => day.items.map((item) => item.exerciseId)));
    expect(ids.filter((id) => !hasExerciseGlyph(id))).toEqual([]);
  });

  it('keeps every icon inside its square all through the rep, with numbers that draw', () => {
    for (const id of [...DRAWN_EXERCISES, 'an-older-id']) {
      // Every drawing of the rep, not just the still one.
      const shapes = exerciseFrames(id).flat();
      expect(shapes.length, id).toBeGreaterThan(0);
      const box = bounds(shapes);
      expect(box.x1, id).toBeGreaterThanOrEqual(0);
      expect(box.y1, id).toBeGreaterThanOrEqual(0);
      expect(box.x2, id).toBeLessThanOrEqual(GLYPH_SIZE);
      expect(box.y2, id).toBeLessThanOrEqual(GLYPH_SIZE);
      expect(JSON.stringify(shapes), id).not.toMatch(/NaN|null|Infinity/);
    }
  });

  it('moves each exercise through a rep made of the same shapes in new places', () => {
    for (const id of DRAWN_EXERCISES) {
      const frames = exerciseFrames(id);
      expect(frames.length, id).toBe(REP_FRAMES);
      const outline = (shapes: Shape[]) => shapes.map((shape) => `${shape.k}:${shape.tone}:${shape.k === 'line' ? shape.pts.length : 1}`).join(' ');
      for (const frame of frames) expect(outline(frame), id).toBe(outline(frames[0]!));
      expect(exerciseMoves(id), id).toBe(true);
      // The still icon is the rep's first drawing.
      expect(exerciseGlyph(id), id).toEqual(frames[0]);
    }
    expect(exerciseMoves('an-older-id')).toBe(false);
  });

  it('gives an exercise it doesn’t draw a plain dumbbell, not an empty tile', () => {
    expect(hasExerciseGlyph('an-older-id')).toBe(false);
    expect(exerciseGlyph('an-older-id').some((shape) => shape.tone === 'kit')).toBe(true);
  });
});
