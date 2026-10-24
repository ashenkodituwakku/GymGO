/**
 * The Google page, full screen over everything, map included: Google's
 * terms don't allow its place details beside a map that isn't Google's.
 */

import { Modal, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { GymRecord } from '@gymgo/domain';
import { GooglePage } from './GooglePage';

export function GoogleModal({ record, onClose }: { record: GymRecord | undefined; onClose: () => void }) {
  return (
    <Modal visible={record !== undefined} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <GestureHandlerRootView style={styles.root}>
        <SafeAreaProvider>{record && <GooglePage record={record} onClose={onClose} />}</SafeAreaProvider>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
