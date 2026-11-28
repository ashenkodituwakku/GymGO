import { describe, expect, it } from 'vitest';
import { spacePresses, type KeyTarget } from './spaceKey';

const el = (tagName: string, attrs: Record<string, string> = {}, editable = false): KeyTarget => ({
  tagName,
  isContentEditable: editable,
  getAttribute: (name) => attrs[name] ?? null,
});

describe('Space on a control in a browser', () => {
  it('presses ticks, choices, switches and tabs', () => {
    for (const role of ['checkbox', 'radio', 'switch', 'tab', 'option', 'menuitemcheckbox', 'menuitemradio']) {
      expect(spacePresses(el('DIV', { role }))).toBe(true);
    }
  });

  it('leaves buttons to React Native Web, which presses them with Space already', () => {
    expect(spacePresses(el('DIV', { role: 'button' }))).toBe(false);
    expect(spacePresses(el('BUTTON', { role: 'checkbox' }))).toBe(false);
  });

  it('never takes a Space from typing or a native control', () => {
    expect(spacePresses(el('INPUT', { role: 'checkbox' }))).toBe(false);
    expect(spacePresses(el('TEXTAREA'))).toBe(false);
    expect(spacePresses(el('DIV', { role: 'checkbox' }, true))).toBe(false);
    expect(spacePresses(el('A', { role: 'checkbox' }))).toBe(false);
  });

  it('presses a link that says it is a tab, as the tab bar\'s are', () => {
    expect(spacePresses(el('A', { role: 'tab' }))).toBe(true);
    expect(spacePresses(el('A'))).toBe(false);
  });

  it('does nothing on a disabled control, plain text, or nothing at all', () => {
    expect(spacePresses(el('DIV', { role: 'checkbox', 'aria-disabled': 'true' }))).toBe(false);
    expect(spacePresses(el('DIV'))).toBe(false);
    expect(spacePresses(null)).toBe(false);
  });
});
