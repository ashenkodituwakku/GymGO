/**
 * The Google page, full screen over everything, map included: Google's
 * terms don't allow its place details beside a map that isn't Google's.
 */

import { Modal, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { GymRecord } from '@gymgo/domain';
import { useDialogName } from '@/lib/dialogName';
import { GooglePage } from './GooglePage';

export function GoogleModal({ record, onClose }: { record: GymRecord | undefined; onClose: () => void }) {
  const dialogName = useDialogName(record ? `${record.location.name} on Google` : 'On Google');
  return (
    <Modal visible={record !== undefined} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={styles.root} ref={dialogName}>
        <GestureHandlerRootView style={styles.root}>
          <SafeAreaProvider>{record && <GooglePage record={record} onClose={onClose} />}</SafeAreaProvider>
        </GestureHandlerRootView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
