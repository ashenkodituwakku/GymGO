// Made by scripts/demo-pictures.mjs: run it again rather than editing this.
/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * The demo's invented gyms' pictures: illustrations, never photographs,
 * made for the GymGO demo (scripts/demo-pictures.mjs). Keyed by gym id;
 * `alt` says what each shows.
 */
export const DEMO_PICTURES: Record<string, { source: number; alt: string }> = {
  'ironbark-strength-surry-hills': { source: require('../../assets/demo/ironbark-strength-surry-hills.webp'), alt: "Two power racks loaded with bumper plates on wooden platforms, a dumbbell rack and a plate tree, under hanging lamps on a dark green wall" },
  'waterloo-aquatic-fitness': { source: require('../../assets/demo/waterloo-aquatic-fitness.webp'), alt: "An indoor pool with lane ropes and starting blocks under high windows, with a bench and plants on the deck" },
  'halfmoon-fitness-redfern': { source: require('../../assets/demo/halfmoon-fitness-redfern.webp'), alt: "Treadmills in a row facing a tall window onto a night skyline with a half moon, a cable station and a Smith machine under strip lights" },
  'tallow-street-gym-chippendale': { source: require('../../assets/demo/tallow-street-gym-chippendale.webp'), alt: "A brick-walled gym with an air bike, a cable station, a dumbbell rack and a bench, under hanging lamps" },
  'quarry-lane-barbell-alexandria': { source: require('../../assets/demo/quarry-lane-barbell-alexandria.webp'), alt: "Three lifting platforms with power racks and bumper plates in a concrete hall, a turf strip with a sled, and a plate tree" },
  'marrow-and-co-darlinghurst': { source: require('../../assets/demo/marrow-and-co-darlinghurst.webp'), alt: "A bright studio with a mirror wall, plyo boxes, a row of kettlebells, an air bike and a sled on a turf strip, with plants" },
  'keystone-fitness-ultimo': { source: require('../../assets/demo/keystone-fitness-ultimo.webp'), alt: "Arched windows onto the city behind a Smith machine, a cable station, a leg press and treadmills on a timber floor" },
  'vellum-strength-newtown': { source: require('../../assets/demo/vellum-strength-newtown.webp'), alt: "A pale, minimal strength room with squat stands, barbells, a bench and a dumbbell rack on a timber floor" },
  'brickworks-gym-alexandria': { source: require('../../assets/demo/brickworks-gym-alexandria.webp'), alt: "A red-brick warehouse gym with a squat stand, a cable station and a dumbbell rack under steel trusses and lamps" },
  'foundry-lane-erskineville': { source: require('../../assets/demo/foundry-lane-erskineville.webp'), alt: "A functional-training box with racks, rowers, air bikes, plyo boxes, kettlebells and a sled on turf, in a dark steel hall with orange signage" },
  'nightshift-gym-haymarket': { source: require('../../assets/demo/nightshift-gym-haymarket.webp'), alt: "A late-night gym with a glowing neon sign, treadmills facing a lit city window, a squat stand and a dumbbell rack" },
  'saltwater-strength-pyrmont': { source: require('../../assets/demo/saltwater-strength-pyrmont.webp'), alt: "A light, airy gym with a wide window onto the water, a squat stand, a cable station and a dumbbell rack" },
  'greenway-community-gym-glebe': { source: require('../../assets/demo/greenway-community-gym-glebe.webp'), alt: "A community gym with green walls and plants, park views, treadmills, a rower, a lifting platform with a squat stand and a dumbbell rack" },
  'paddington-hill-fitness': { source: require('../../assets/demo/paddington-hill-fitness.webp'), alt: "A window onto a hill of terrace houses behind a leg press, a hack squat, a squat stand and a cable station" },
  'oakline-fitness-zetland': { source: require('../../assets/demo/oakline-fitness-zetland.webp'), alt: "Oak slat walls and an oak floor with a squat stand, a bench, a cable station and a dumbbell rack" },
  'harbourgate-strength-potts-point': { source: require('../../assets/demo/harbourgate-strength-potts-point.webp'), alt: "A navy-and-brass gym looking out over a harbour and its arch bridge, with power racks, a hack squat, a leg press and a cable station" },
  'copperfield-gym-camperdown': { source: require('../../assets/demo/copperfield-gym-camperdown.webp'), alt: "Deep teal walls with copper lettering over treadmills, a squat stand, a bench and a cable station" },
};
