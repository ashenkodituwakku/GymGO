/**
 * Which body the figures show (the workout builder's Male / Female, the
 * recovery map, an exercise's muscles): chosen in the builder, kept on this
 * device, the same everywhere.
 */

import type { Gender } from '@/components/body/shapes';
import { deviceStore } from './deviceStore';

const store = deviceStore<Gender>('gymgo.body.v1', (stored) => (stored === 'female' ? 'female' : 'male'), 'male');

export const useBodyGender = (): Gender => store.use();
export const setBodyGender = (gender: Gender) => store.set(gender);
