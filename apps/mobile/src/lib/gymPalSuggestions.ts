/**
 * Questions GymPal offers to start with, for the screen the chat opened on:
 * one tap asks it. Each is something his guide to the app covers
 * (apps/server/src/gymPalGuide.ts) or a general training question, never a
 * real gym's facts. With Pro and his training log switched on, he offers
 * the two questions that need it first.
 */

const BY_SCREEN: Array<[RegExp, string[]]> = [
  [/^\/gym\//, ['What should I ask a gym before I visit?', 'What does “Call first” mean?', 'How do members’ reports work?']],
  [/^\/workout\//, ['How many sets should I do to build muscle?', 'How long should I rest between sets?', 'How do I warm up properly?']],
  [/^\/workouts/, ['How do I start a saved workout?', 'How often should I repeat a workout?']],
  [/^\/train/, ['How do I know when to add weight?', 'What if I can’t finish my reps?']],
  [/^\/progress\/./, ['How do I keep good form on this?', 'How do I know when to add weight?', 'What is an estimated 1-rep max?']],
  [/^\/progress/, ['What counts as a record?', 'How does the weekly goal work?', 'How do I share my week?']],
  [/^\/exercises/, ['Which exercises suit a beginner?', 'What’s the difference between compound and isolation moves?']],
  [/^\/templates/, ['Which template should a beginner start with?', 'What is 5×5 training?', 'How does Push, pull, legs work?']],
  [/^\/timer/, ['What is Tabata?', 'What is EMOM?', 'How hard should intervals feel?']],
  [/^\/strength/, ['What is a 1-rep max?', 'How heavy should I go for 8 reps?']],
  [/^\/plates/, ['How do I load plates on a bar?', 'How much does a barbell weigh?']],
  [/^\/collection/, ['How do card rarities work?', 'How do I finish a suburb set?', 'How do I check in at a gym?']],
  [/^\/(friends|leaderboard)/, ['How do I add a friend?', 'How does the leaderboard work?']],
  [/^\/trips/, ['How do Trips work?', 'Can I find gyms when I travel?']],
  [/^\/machines/, ['How does Find a machine work?', 'Where do the machine lists come from?']],
  [/^\/explore/, ['How do the filters work?', 'What does Search this area do?', 'Why do most gyms say Call first?']],
  [/^\/saved/, ['How do I compare gyms?', 'How many gyms can I save?']],
  [/^\/pro/, ['What does GymGO Pro add?', 'Can I cancel Pro any time?', 'What is Pro Duo?']],
  [/^\/(profile|account|appearance|reminders|country)/, ['What does GymGO Pro add?', 'How do I download my data?', 'How do training reminders work?']],
];

const HOME = ['How do I find a gym I can visit today?', 'What does “Call first” mean?', 'What’s a good workout for a beginner?'];

/** Need Pro and the training log switched on. */
export const LOG_QUESTIONS = ['What should I train today?', 'How is my training going?'];

export function suggestionsFor(pathname: string, withLog = false): string[] {
  const screen = BY_SCREEN.find(([pattern]) => pattern.test(pathname))?.[1] ?? HOME;
  return withLog ? [...LOG_QUESTIONS, screen[0]!] : screen;
}
