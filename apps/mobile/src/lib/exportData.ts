/**
 * Handing someone the file of everything GymGO holds about them. In a
 * browser it downloads as a .json file; on a phone it opens the share sheet,
 * so it can go to Files, Mail or anywhere else they choose.
 */

import { Platform, Share } from 'react-native';
import { api } from './api';

export async function downloadMyData(token: string): Promise<void> {
  const data = await api.exportMyData(token);
  const json = JSON.stringify(data, null, 2);
  const name = `gymgo-my-data-${new Date().toISOString().slice(0, 10)}.json`;
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  await Share.share({ title: name, message: json });
}
