import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Image, Modal, Pressable, ScrollView, StyleSheet } from 'react-native';
import { pickPhoto, photoUri } from '../lib/photos';
import { useTheme } from '../lib/theme';

export function PhotoStrip({
  photos,
  onChange,
}: {
  photos: string[];
  onChange?: (photos: string[]) => void;
}) {
  const t = useTheme();
  const [viewing, setViewing] = useState<string | null>(null);
  const editable = !!onChange;

  const add = () => {
    Alert.alert('Add photo', undefined, [
      { text: 'Take photo', onPress: () => run('camera') },
      { text: 'Choose from library', onPress: () => run('library') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const run = async (source: 'camera' | 'library') => {
    try {
      const name = await pickPhoto(source);
      if (name) onChange?.([...photos, name]);
    } catch (e) {
      Alert.alert('Photo error', e instanceof Error ? e.message : String(e));
    }
  };

  const remove = (name: string) => {
    Alert.alert('Remove photo?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => onChange?.(photos.filter((p) => p !== name)) },
    ]);
  };

  if (!editable && photos.length === 0) return null;

  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {photos.map((name) => (
          <Pressable
            key={name}
            onPress={() => setViewing(name)}
            onLongPress={editable ? () => remove(name) : undefined}>
            <Image source={{ uri: photoUri(name) }} style={[styles.thumb, { borderColor: t.border }]} />
            {editable && (
              <Pressable accessibilityLabel="Remove photo" onPress={() => remove(name)} style={styles.remove}>
                <Ionicons name="close-circle" size={22} color="#fff" />
              </Pressable>
            )}
          </Pressable>
        ))}
        {editable && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add photo"
            onPress={add}
            style={[styles.thumb, styles.add, { borderColor: t.border, backgroundColor: t.chip }]}>
            <Ionicons name="camera" size={28} color={t.muted} />
          </Pressable>
        )}
      </ScrollView>
      <Modal visible={!!viewing} transparent animationType="fade" onRequestClose={() => setViewing(null)}>
        <Pressable style={styles.viewer} onPress={() => setViewing(null)}>
          {viewing && <Image source={{ uri: photoUri(viewing) }} style={styles.full} resizeMode="contain" />}
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  row: { gap: 10, paddingVertical: 4 },
  thumb: { width: 96, height: 96, borderRadius: 10, borderWidth: 1 },
  add: { alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed' },
  remove: { position: 'absolute', top: 2, right: 2, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 11 },
  viewer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  full: { width: '100%', height: '85%' },
});
