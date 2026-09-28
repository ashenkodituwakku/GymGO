/**
 * Gyms' own websites, for map gyms that list none, so they can show their own
 * icon and a Website button.
 *
 * scripts/websites.py tried the domains each gym's name suggests and kept a
 * site only when its title named the gym and the page named the gym's suburb
 * (or its street, for a gym in a city centre). Each was then read by hand on
 * 28 September 2026; sites the script matched that belong to another business
 * (a rehab clinic, a suburb guide) were left out, as was one whose branch
 * didn't match. Credited in the app as a website GymGO found, not the map's.
 */

export const WEBSITES_CHECKED = '2026-09-28T15:00:00.000Z';

// prettier-ignore
export const FOUND_WEBSITES: Record<string, string> = {
  'bodhifit-studio-buttle-street-canberra': 'https://bodhifitstudio.com/',
  'fitness-nation-bell-street-melbourne': 'https://www.fitnessnation.au/',
  'freedom-fitness-flinders-street-adelaide': 'https://www.freedomfitness.com.au/',
  'fremantle-indoor-sainsbury-road-perth': 'https://fremantleindoor.com.au/',
  'gym-cartel-tate-street-brisbane': 'https://gymcartel.com.au/',
  'helix-triathlon-wilkie-street-brisbane': 'https://www.helixtriathlon.com.au/',
  'hybrid-strength-studio-gaffney-street-melbourne': 'https://www.hybridstrengthstudio.com.au/',
  'i-feel-good-247-orange-grove-road-brisbane': 'https://ifeelgood247.com.au/',
  'inertia-montague-road-brisbane': 'https://www.inertiafitness.com.au/',
  'intense-health-ardross-street-perth': 'https://www.intensehealth.com/',
  'iron-underground-pedder-street-brisbane': 'https://ironunderground.com.au/',
  'mc-fitness-eastgate-court-melbourne': 'https://mcfitness.com.au/',
  'mc-fitness-eastgate-court-melbourne-w1351979191': 'https://mcfitness.com.au/',
  'mick-coorey-health-and-fitness-oriel-road-brisbane': 'https://mickcoorey.com.au/',
  'ninja-nation-burwood-highway-melbourne': 'https://ninjanation.com.au/',
  'pivotal-health-fitness-poath-road-melbourne': 'https://www.pivotalfitness.com.au/',
  'resilience-training-centre-buckley-street-melbourne': 'https://www.resiliencetrainingcentre.com/',
  'smart-fit-studio-bridge-road-melbourne': 'https://www.smartfitstudio.com.au/',
  'summer-hill-gym-hardie-avenue-sydney': 'https://summerhillgym.com.au/',
  'undrgrnd-training-mertonvale-circuit-hobart': 'https://undrgrndtraining.com.au/',
  'urban-athletic-wilkinson-street-melbourne': 'https://www.urbanathletic.com.au/',
  'wellness-department-forest-road-sydney': 'https://www.wellnessdepartment.com.au/',
  'world-fitness-cartel-ferntree-gully-road-melbourne': 'https://worldfitnesscartel.com.au/',
};
