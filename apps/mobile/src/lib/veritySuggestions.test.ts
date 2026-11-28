import { describe, expect, it } from 'vitest';
import { onVerityRequest, openVerity, type VerityRequest } from './verityBus';
import { LOG_QUESTIONS, suggestionsFor } from './veritySuggestions';

describe('Verity’s suggested questions', () => {
  it('fit the screen the chat opens on', () => {
    expect(suggestionsFor('/timer')).toContain('What is Tabata?');
    expect(suggestionsFor('/gym/melbourne-1')[0]).toBe('What should I ask a gym before I visit?');
    // An exercise's page, not Progress itself.
    expect(suggestionsFor('/progress/barbell-bench-press')).toContain('How do I keep good form on this?');
    expect(suggestionsFor('/progress')).toContain('What counts as a record?');
    expect(suggestionsFor('/')).toContain('How do I find a gym I can visit today?');
    expect(suggestionsFor('/somewhere-new')).toEqual(suggestionsFor('/'));
  });

  it('are two or three, and never a real gym’s facts', () => {
    for (const path of ['/', '/explore', '/saved', '/profile', '/gym/x', '/workout/any', '/templates', '/pro', '/collection']) {
      const questions = suggestionsFor(path);
      expect(questions.length).toBeGreaterThanOrEqual(2);
      expect(questions.length).toBeLessThanOrEqual(3);
      for (const question of questions) expect(question).not.toMatch(/\$|price of|how busy is|open now/i);
    }
  });

  it('start with the training-log questions when the log is on', () => {
    expect(suggestionsFor('/timer', true)).toEqual([...LOG_QUESTIONS, 'What is Tabata?']);
  });
});

describe('opening Verity from a screen', () => {
  it('reaches the chat, and stops when it stops listening', () => {
    const heard: VerityRequest[] = [];
    const stop = onVerityRequest((request) => heard.push(request));
    openVerity({ question: 'Talk me through this plan', context: 'Workout: Push day', about: 'this workout' });
    stop();
    openVerity({ question: 'Not heard' });
    expect(heard).toEqual([{ question: 'Talk me through this plan', context: 'Workout: Push day', about: 'this workout' }]);
  });
});
