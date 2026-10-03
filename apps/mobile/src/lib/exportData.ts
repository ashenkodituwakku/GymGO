/**
 * Handing someone their own data as a file: everything GymGO holds about
 * them, or their training log as a spreadsheet. In a browser it downloads;
 * on a phone it's written as a file and handed to the share sheet, so it
 * can go to Files, Mail, Drive or a spreadsheet app.
 */

import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform, Share } from 'react-native';
import { api } from './api';
import { logToCsv } from './insights';
import type { TrainingSession } from './training';

async function handOver(name: string, text: string, type: string): Promise<void> {
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  // A real file where the phone can share one (to Files, Mail, Drive, Numbers); the text itself where it can't.
  try {
    if (await Sharing.isAvailableAsync()) {
      const file = new File(Paths.cache, name);
      if (file.exists) file.delete();
      file.create();
      file.write(text);
      await Sharing.shareAsync(file.uri, { mimeType: type, dialogTitle: name, UTI: type === 'text/csv' ? 'public.comma-separated-values-text' : 'public.json' });
      return;
    }
  } catch {
    // Fall back to sharing the text.
  }
  await Share.share({ title: name, message: text });
}

const today = () => new Date().toISOString().slice(0, 10);

export async function downloadMyData(token: string): Promise<void> {
  const data = await api.exportMyData(token);
  await handOver(`gymgo-my-data-${today()}.json`, JSON.stringify(data, null, 2), 'application/json');
}

/** Your training log, a row a set, for a spreadsheet. */
export async function downloadTrainingCsv(sessions: TrainingSession[]): Promise<void> {
  await handOver(`gymgo-training-${today()}.csv`, logToCsv(sessions), 'text/csv');
}
