/**
 * The screens an answer of Verity's names, as buttons under it: Verity
 * writes the way to a screen in bold ("**Profile → Progress**", its guide
 * asks it to), and each one this list knows becomes "Open Progress". Only
 * these screens, by their exact names, ever become a button, so an answer
 * can't send anyone anywhere else: the model never writes a link itself.
 */

export interface ScreenLink {
  /** The screen's name, as the button says it. */
  label: string;
  href: string;
}

/** Each screen's names as Verity writes them (lower case), and where it is. */
const SCREENS: Array<{ names: string[]; label: string; href: string }> = [
  { names: ['progress'], label: 'Progress', href: '/progress' },
  { names: ['calendar'], label: 'Calendar', href: '/calendar' },
  { names: ['templates'], label: 'Templates', href: '/templates' },
  { names: ['training programme', 'programme'], label: 'Training programme', href: '/programme' },
  { names: ['exercises'], label: 'Exercises', href: '/exercises' },
  { names: ['my workouts'], label: 'My workouts', href: '/workouts' },
  { names: ['build with verity'], label: 'Build with Verity', href: '/ai-workout' },
  { names: ['appearance'], label: 'Appearance', href: '/appearance' },
  { names: ['report a bug'], label: 'Report a bug', href: '/report-bug' },
  { names: ['pro', 'gymgo pro'], label: 'Pro', href: '/pro' },
  { names: ['monthly challenge'], label: 'Monthly challenge', href: '/challenges' },
  { names: ['collection'], label: 'Collection', href: '/collection' },
  { names: ['friends'], label: 'Friends', href: '/friends' },
  { names: ['feed'], label: 'Feed', href: '/feed' },
  { names: ['leaderboard'], label: 'Leaderboard', href: '/leaderboard' },
  { names: ['reminders'], label: 'Reminders', href: '/reminders' },
  { names: ['plate calculator', 'plates'], label: 'Plate calculator', href: '/plates' },
  { names: ['interval timer'], label: 'Interval timer', href: '/timer' },
  { names: ['body measurements', 'your body'], label: 'Body measurements', href: '/measurements' },
  { names: ['progress photos'], label: 'Progress photos', href: '/photos' },
  { names: ['monthly report'], label: 'Monthly report', href: '/month' },
  { names: ['what you pay'], label: 'What you pay', href: '/spend' },
  { names: ['trips'], label: 'Trips', href: '/trips' },
  { names: ['machines'], label: 'Machines', href: '/machines' },
  { names: ['lifetime'], label: 'Lifetime', href: '/lifetime' },
  { names: ['account'], label: 'Account', href: '/account' },
  { names: ['explore'], label: 'Explore', href: '/explore' },
  { names: ['saved'], label: 'Saved', href: '/saved' },
  { names: ['profile'], label: 'Profile', href: '/profile' },
];

const BY_NAME = new Map(SCREENS.flatMap((screen) => screen.names.map((name) => [name, screen] as const)));

/**
 * The screens an answer leads to, in the order it names them, each once, at
 * most `most`: for each bold phrase, the last step of a way there
 * ("Profile → Progress" is Progress) when it's a screen this list knows.
 */
export function screenLinks(answer: string, most = 3): ScreenLink[] {
  const out: ScreenLink[] = [];
  for (const [, bold] of answer.matchAll(/\*\*([^*\n]{2,80})\*\*/g)) {
    const steps = bold!.split(/\s*(?:→|->|›|>)\s*/).map((step) => step.trim().toLowerCase().replace(/[.:!?]+$/, ''));
    const screen = BY_NAME.get(steps.at(-1)!);
    if (!screen || out.some((link) => link.href === screen.href)) continue;
    out.push({ label: screen.label, href: screen.href });
    if (out.length === most) break;
  }
  return out;
}
