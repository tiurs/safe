import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { ENTITIES } from '../db/entities';
import { listItems, parsePhotos } from '../db/repo';
import type { Kind, Row } from '../db/types';
import { photoUri } from '../lib/photos';
import { useTheme } from '../lib/theme';
import { EmptyState, Input } from './ui';

const ICONS = { shield: 'shield-outline', cube: 'cube-outline', construct: 'construct-outline' } as const;

export function EntityList({ kind }: { kind: Kind }) {
  const db = useSQLiteContext();
  const t = useTheme();
  const def = ENTITIES[kind];
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<Row[]>([]);

  const load = useCallback(() => {
    listItems(db, kind, search).then(setRows);
  }, [db, kind, search]);

  useFocusEffect(load);

  const renderItem = ({ item }: { item: Row }) => {
    const photo = parsePhotos(item)[0];
    const low =
      kind === 'ammo' &&
      item.low_stock_threshold != null &&
      Number(item.quantity ?? 0) <= Number(item.low_stock_threshold);
    return (
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push({ pathname: '/item/[kind]/[id]', params: { kind, id: String(item.id) } })}
        style={({ pressed }) => [
          styles.row,
          { backgroundColor: t.card, borderColor: t.border, opacity: pressed ? 0.85 : 1 },
        ]}>
        {photo ? (
          <Image source={{ uri: photoUri(photo) }} style={styles.thumb} />
        ) : (
          <View style={[styles.thumb, styles.placeholder, { backgroundColor: t.chip }]}>
            <Ionicons name={ICONS[def.icon]} size={24} color={t.muted} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: t.text }]} numberOfLines={1}>
            {def.title(item)}
          </Text>
          <Text style={{ color: low ? t.warn : t.muted }} numberOfLines={1}>
            {def.subtitle(item)}
            {low ? '  · LOW' : ''}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={t.muted} />
      </Pressable>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={styles.searchWrap}>
        <Input
          value={search}
          onChangeText={setSearch}
          placeholder={`Search ${def.plural.toLowerCase()}`}
          autoCorrect={false}
          clearButtonMode="while-editing"
          returnKeyType="search"
        />
      </View>
      <FlatList
        data={rows}
        keyExtractor={(r) => String(r.id)}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 12, paddingBottom: 96, gap: 8 }}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <EmptyState
            icon={ICONS[def.icon]}
            title={search ? 'No matches' : `No ${def.plural.toLowerCase()} yet`}
            body={search ? undefined : `Tap + to add your first ${def.singular.toLowerCase()}.`}
          />
        }
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Add ${def.singular}`}
        onPress={() => router.push({ pathname: '/edit/[kind]', params: { kind } })}
        style={[styles.fab, { backgroundColor: t.accent }]}>
        <Ionicons name="add" size={30} color={t.accentText} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  searchWrap: { paddingHorizontal: 12, paddingTop: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  thumb: { width: 52, height: 52, borderRadius: 8 },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
});
