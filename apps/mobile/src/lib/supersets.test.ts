import { describe, expect, it } from 'vitest';
import { groupName, groupOf, linkWithNext, nextUp, restAfter, tidyGroups, unlink } from './supersets';

type Item = { id: string; group?: string; restSeconds: number; sets: Array<{ done: boolean; kind?: string }> };
const item = (id: string, sets: number, restSeconds = 60, group?: string, done = 0): Item => ({
  id,
  restSeconds,
  ...(group ? { group } : {}),
  sets: Array.from({ length: sets }, (_, at) => ({ done: at < done })),
});
const groups = (items: ReadonlyArray<{ group?: string }>) => items.map((each) => each.group ?? '-').join('');

describe('grouping', () => {
  it('pairs an exercise with the next, and a third joins the same group', () => {
    const plan = [item('a', 3), item('b', 3), item('c', 3), item('d', 3)];
    const two = linkWithNext(plan, 1);
    expect(groups(two)).toBe('-AA-');
    const three = linkWithNext(two, 2);
    expect(groups(three)).toBe('-AAA');
    expect(groupOf(three, 3)).toMatchObject({ letter: 'A', kind: 'circuit', members: [1, 2, 3], position: 3 });
    expect(groupName(groupOf(two, 1)!)).toBe('Superset A');
  });

  it('merges two groups that meet, and keeps letters in order', () => {
    let plan = [item('a', 3), item('b', 3), item('c', 3), item('d', 3)];
    plan = linkWithNext(plan, 2); // c+d
    expect(groups(plan)).toBe('--AA');
    plan = linkWithNext(plan, 0); // a+b, before them: A
    expect(groups(plan)).toBe('AABB');
    plan = linkWithNext(plan, 1); // b with c: one group
    expect(groups(plan)).toBe('AAAA');
  });

  it('unlinks an exercise, leaving what stays two or more grouped', () => {
    const plan = tidyGroups([item('a', 3, 60, 'A'), item('b', 3, 60, 'A'), item('c', 3, 60, 'A'), item('d', 3, 60, 'A')]);
    expect(groups(unlink(plan, 1))).toBe('--AA');
    expect(groups(unlink(plan, 0))).toBe('-AAA');
    expect(groups(unlink(plan, 3))).toBe('AAA-');
    const pair = tidyGroups([item('a', 3, 60, 'A'), item('b', 3, 60, 'A')]);
    expect(groups(unlink(pair, 0))).toBe('--');
  });

  it('never leaves a group of one, or a group apart', () => {
    expect(groups(tidyGroups([item('a', 3, 60, 'Q'), item('b', 3), item('c', 3, 60, 'Q'), item('d', 3, 60, 'Q')]))).toBe('--AA');
    expect(groups(tidyGroups([item('a', 3, 60, 'Z'), item('b', 3, 60, 'Z'), item('c', 3, 60, 'Y'), item('d', 3, 60, 'Y')]))).toBe('AABB');
  });

  it('has no group info for an exercise on its own', () => {
    expect(groupOf([item('a', 3), item('b', 3)], 0)).toBeNull();
  });
});

describe('rest', () => {
  it('on its own: after every set but the last', () => {
    const plan = [item('a', 3, 90, undefined, 1)];
    expect(restAfter(plan, 0, 0)).toBe(90);
    expect(restAfter(plan, 0, 2)).toBe(0);
  });

  it('in a superset: none until both have done the round, then the longer rest', () => {
    const halfway = [item('a', 3, 60, 'A', 1), item('b', 3, 90, 'A', 0)];
    expect(restAfter(halfway, 0, 0)).toBe(0);
    const round = [item('a', 3, 60, 'A', 1), item('b', 3, 90, 'A', 1)];
    expect(restAfter(round, 1, 0)).toBe(90);
  });

  it('never before a drop set: it follows straight on', () => {
    const plan = [{ ...item('a', 3, 90, undefined, 1), sets: [{ done: true }, { done: false, kind: 'drop' }, { done: false }] }];
    expect(restAfter(plan, 0, 0)).toBe(0);
    expect(restAfter(plan, 0, 1)).toBe(90);
  });

  it('a minute at most after a warm-up', () => {
    const plan = [{ ...item('a', 3, 180, undefined, 1), sets: [{ done: true, kind: 'warmup' }, { done: false }, { done: false }] }];
    expect(restAfter(plan, 0, 0)).toBe(60);
    const short = [{ ...item('a', 2, 45, undefined, 1), sets: [{ done: true, kind: 'warmup' }, { done: false }] }];
    expect(restAfter(short, 0, 0)).toBe(45);
  });

  it('none after the last round, even with uneven sets', () => {
    const last = [item('a', 3, 60, 'A', 3), item('b', 2, 60, 'A', 2)];
    // b has only 2 sets: round 3 is a's alone, and it's the last.
    expect(restAfter(last, 0, 2)).toBe(0);
    const second = [item('a', 3, 60, 'A', 2), item('b', 2, 60, 'A', 2)];
    expect(restAfter(second, 1, 1)).toBe(60);
  });
});

describe('next up', () => {
  it('goes round the group before the next set of the first', () => {
    expect(nextUp([item('a', 3, 60, 'A', 1), item('b', 3, 60, 'A', 0), item('c', 3)])).toBe(1);
    expect(nextUp([item('a', 3, 60, 'A', 1), item('b', 3, 60, 'A', 1), item('c', 3)])).toBe(0);
    expect(nextUp([item('a', 3, 60, 'A', 3), item('b', 3, 60, 'A', 3), item('c', 3)])).toBe(2);
    expect(nextUp([item('a', 1, 60, undefined, 1)])).toBe(-1);
  });

  it('is the first with a set left when there are no groups', () => {
    expect(nextUp([item('a', 2, 60, undefined, 2), item('b', 2)])).toBe(1);
  });
});
