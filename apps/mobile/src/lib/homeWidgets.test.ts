import { describe, expect, it } from 'vitest';
import { DEFAULT_HOME, HOME_GROUPS, HOME_WIDGETS, addWidget, availableWidgets, cleanHome, moveWidget, moveWidgetTo, removeWidget, shownWidgets } from './homeWidgets';

describe('Home’s widgets', () => {
  it('starts as Home was, with the weather in a line, and every widget known once', () => {
    expect(DEFAULT_HOME).toEqual(['shortcuts', 'workout', 'finders', 'weather', 'week', 'collection', 'nearby', 'saved', 'recent', 'browse', 'cities']);
    expect(new Set(HOME_WIDGETS.map((widget) => widget.id)).size).toBe(HOME_WIDGETS.length);
    for (const widget of HOME_WIDGETS) expect(HOME_GROUPS).toContain(widget.group);
    expect(HOME_WIDGETS.length).toBeGreaterThanOrEqual(17);
  });

  it('reads what was stored: known widgets once, in order; Home as it comes for anything else', () => {
    expect(cleanHome({ widgets: ['weather', 'nearby', 'weather', 'radio', 7, 'tools'] })).toEqual(['weather', 'nearby', 'tools']);
    // Everything taken off stays that way.
    expect(cleanHome({ widgets: [] })).toEqual([]);
    expect(cleanHome(null)).toEqual(DEFAULT_HOME);
    expect(cleanHome({ widgets: 'weather' })).toEqual(DEFAULT_HOME);
    expect(cleanHome(['weather'])).toEqual(DEFAULT_HOME);
  });

  it('moves one place at a time, and not past either end', () => {
    const list = ['shortcuts', 'weather', 'nearby'] as const;
    expect(moveWidget(list, 'weather', -1)).toEqual(['weather', 'shortcuts', 'nearby']);
    expect(moveWidget(list, 'weather', 1)).toEqual(['shortcuts', 'nearby', 'weather']);
    expect(moveWidget(list, 'shortcuts', -1)).toEqual(list);
    expect(moveWidget(list, 'nearby', 1)).toEqual(list);
    expect(moveWidget(list, 'tools', 1)).toEqual(list);
  });

  it('drops a dragged widget where it’s let go', () => {
    const list = ['shortcuts', 'weather', 'nearby', 'tools'] as const;
    expect(moveWidgetTo(list, 'tools', 0)).toEqual(['tools', 'shortcuts', 'weather', 'nearby']);
    expect(moveWidgetTo(list, 'shortcuts', 2)).toEqual(['weather', 'nearby', 'shortcuts', 'tools']);
    expect(moveWidgetTo(list, 'shortcuts', 3)).toEqual(['weather', 'nearby', 'tools', 'shortcuts']);
    expect(moveWidgetTo(list, 'weather', 1)).toEqual(list);
    expect(moveWidgetTo(list, 'weather', 99)).toEqual(['shortcuts', 'nearby', 'tools', 'weather']);
    expect(moveWidgetTo(list, 'recent', 0)).toEqual(list);
  });

  it('adds at the top once, and removes', () => {
    expect(addWidget(['nearby'], 'tools')).toEqual(['tools', 'nearby']);
    expect(addWidget(['tools', 'nearby'], 'tools')).toEqual(['tools', 'nearby']);
    expect(addWidget(['nearby'], 'tools', 'end')).toEqual(['nearby', 'tools']);
    expect(removeWidget(['tools', 'nearby'], 'tools')).toEqual(['nearby']);
  });

  it('leaves out, on the limited website, what needs GymGO’s server', () => {
    const limited = availableWidgets(true).map((widget) => widget.id);
    expect(limited).not.toContain('weather');
    expect(limited).not.toContain('lastWorkout');
    expect(limited).toContain('nearby');
    expect(limited).toContain('bodyWeight');
    expect(shownWidgets(['weather', 'nearby', 'collection'], true)).toEqual(['nearby']);
    expect(shownWidgets(['weather', 'nearby'], false)).toEqual(['weather', 'nearby']);
  });
});
