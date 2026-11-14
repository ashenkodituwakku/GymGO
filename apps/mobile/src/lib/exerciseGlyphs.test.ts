import { describe, expect, it } from 'vitest';
import { DRAWN_EXERCISES, GLYPH_SIZE, REP_FRAMES, TEMPO_NAMED, bounds, exerciseFrames, exerciseGlyph, exerciseMoves, exerciseTempo, hasExerciseGlyph, leadExercise, type Shape } from './exerciseGlyphs';
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
      const outline = (shapes: Shape[]) => shapes.map((shape) => `${shape.k}:${shape.tone}:${shape.k === 'line' || shape.k === 'poly' ? shape.pts.length : 1}`).join(' ');
      for (const frame of frames) expect(outline(frame), id).toBe(outline(frames[0]!));
      expect(exerciseMoves(id), id).toBe(true);
      // The still icon is the rep's first drawing.
      expect(exerciseGlyph(id), id).toEqual(frames[0]);
    }
    expect(exerciseMoves('an-older-id')).toBe(false);
  });

  it('times each move to suit: the lift first, the lowering first, round and round, or a hold', () => {
    expect(exerciseTempo('back-squat')).toBe('lift');
    expect(exerciseTempo('bench-press')).toBe('lower');
    expect(exerciseTempo('row-intervals')).toBe('cycle');
    expect(exerciseTempo('bike-intervals')).toBe('spin');
    expect(exerciseTempo('plank')).toBe('hold');
    expect(exerciseTempo('an-older-id')).toBe('lift');
    // Every move named for a tempo is one GymGO draws (a typo would quietly make it a lift).
    const named = Object.values(TEMPO_NAMED).flat();
    expect(named.filter((id) => !DRAWN_EXERCISES.includes(id))).toEqual([]);
    expect(new Set(named).size).toBe(named.length);
  });

  it('turns a ride one way round without a seam: its last drawing is its first', () => {
    const frames = exerciseFrames('bike-intervals');
    expect(frames[frames.length - 1]).toEqual(frames[0]);
    expect(JSON.stringify(frames[Math.floor(REP_FRAMES / 2)])).not.toBe(JSON.stringify(frames[0]));
  });

  it('draws each figure with a torso, a head, hands and feet', () => {
    for (const id of DRAWN_EXERCISES) {
      const still = exerciseGlyph(id);
      const figure = still.filter((shape) => shape.tone === 'ink' || shape.tone === 'far');
      expect(figure.filter((shape) => shape.k === 'poly').length, id).toBe(1);
      // A head, and a hand on each arm drawn.
      expect(figure.filter((shape) => shape.k === 'dot').length, id).toBeGreaterThanOrEqual(2);
    }
  });

  it('gives an exercise it doesn’t draw a plain dumbbell, not an empty tile', () => {
    expect(hasExerciseGlyph('an-older-id')).toBe(false);
    expect(exerciseGlyph('an-older-id').some((shape) => shape.tone === 'kit')).toBe(true);
  });

  it('draws the dumbbell for an id that names a built-in, rather than crashing', () => {
    // Any text can be saved as an exercise; these once found the object's own built-ins.
    for (const id of ['constructor', 'toString', '__proto__', 'hasOwnProperty', 'valueOf']) {
      expect(hasExerciseGlyph(id), id).toBe(false);
      expect(() => exerciseFrames(id), id).not.toThrow();
      expect(exerciseGlyph(id).some((shape) => shape.tone === 'kit'), id).toBe(true);
      expect(exerciseMoves(id), id).toBe(false);
    }
  });

  it('leads a saved plan with its first exercise GymGO still draws', () => {
    expect(leadExercise(['a-retired-id', 'bench-press'])).toBe('bench-press');
    expect(leadExercise(['constructor', 'back-squat'])).toBe('back-squat');
    expect(leadExercise(['a-retired-id'])).toBe('');
    expect(leadExercise([])).toBe('');
  });
});
