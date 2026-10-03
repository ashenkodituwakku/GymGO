/**
 * @gymgo/demo-data — the fictional pilot dataset.
 *
 * Every gym here is invented and flagged `isDemoData`. Both apps load it from
 * this one package, so the phone and the website can never disagree about
 * what the demo contains.
 */

export { DEMO_GYMS } from './gyms';
export { DEMO_EPOCH, daysBeforeEpoch } from './builders';
export * from './places';
