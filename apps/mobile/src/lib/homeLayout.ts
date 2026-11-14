/**
 * Your Home's widgets and their order (lib/homeWidgets.ts has what they
 * are), kept on this device: Customise Home (Home's edit mode,
 * components/HomeEditor.tsx) changes them, Home (app/(tabs)/index.tsx) draws them.
 */

import { deviceStore } from './deviceStore';
import { DEFAULT_HOME, addWidget, cleanHome, moveWidget, moveWidgetTo, removeWidget, type HomeWidgetId } from './homeWidgets';

interface HomeLayout {
  widgets: HomeWidgetId[];
}

const store = deviceStore<HomeLayout>('gymgo.home.v1', (stored) => ({ widgets: cleanHome(stored) }), { widgets: [...DEFAULT_HOME] });

/** Your Home's widgets, in order. */
export const useHomeWidgets = (): HomeWidgetId[] => store.use().widgets;

const change = (next: (list: HomeWidgetId[]) => HomeWidgetId[]) => store.update((now) => ({ widgets: next(now.widgets) }));

export const homeLayout = {
  add: (id: HomeWidgetId, at: 'top' | 'end' = 'top') => change((list) => addWidget(list, id, at)),
  remove: (id: HomeWidgetId) => change((list) => removeWidget(list, id)),
  move: (id: HomeWidgetId, by: -1 | 1) => change((list) => moveWidget(list, id, by)),
  /** Dropped at place `to`, as you drag it on Home. */
  moveTo: (id: HomeWidgetId, to: number) => change((list) => moveWidgetTo(list, id, to)),
  reset: () => store.set({ widgets: [...DEFAULT_HOME] }),
};
