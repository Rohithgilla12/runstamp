import { describe, expect, it } from 'vitest';
import {
  EXERCISES,
  NEEDS,
  ROUTINES,
  exerciseGif,
  getExercise,
  getRoutine,
  needMeta,
  routineExercises,
  routinesForNeed,
} from '../strength';

describe('exercise catalogue', () => {
  it('has unique ids', () => {
    const ids = EXERCISES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every exercise has a 4-digit dataset id and a gif path', () => {
    for (const e of EXERCISES) {
      expect(e.id).toMatch(/^\d{4}$/);
      expect(e.gif).toMatch(/^videos\/.+\.gif$/);
      expect(e.name.length).toBeGreaterThan(0);
    }
  });

  it('resolves a gif to the dataset CDN', () => {
    const ex = getExercise('0276')!;
    expect(exerciseGif(ex)).toBe(
      'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0276-iny3m5y.gif',
    );
  });
});

describe('routines', () => {
  it('has unique ids', () => {
    const ids = ROUTINES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every routine item references a known exercise', () => {
    for (const r of ROUTINES) {
      expect(r.items.length).toBeGreaterThan(0);
      for (const item of r.items) {
        expect(getExercise(item.exerciseId), `${r.id} → ${item.exerciseId}`).toBeDefined();
        expect(item.sets).toBeGreaterThan(0);
        expect(item.reps.length).toBeGreaterThan(0);
        expect(item.restSec).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('routineExercises resolves one exercise per item, in order', () => {
    for (const r of ROUTINES) {
      const exs = routineExercises(r);
      expect(exs.map((e) => e.id)).toEqual(r.items.map((i) => i.exerciseId));
    }
  });

  it('covers every runner need with at least one routine', () => {
    for (const n of NEEDS) {
      expect(routinesForNeed(n.key).length, n.key).toBeGreaterThan(0);
    }
  });

  it('every routine.need resolves to need metadata', () => {
    for (const r of ROUTINES) {
      expect(needMeta(r.need).key).toBe(r.need);
    }
  });

  it('getRoutine finds by id and misses cleanly', () => {
    expect(getRoutine('hills-power')?.title).toBe('Hills & power');
    expect(getRoutine('nope')).toBeUndefined();
  });
});
