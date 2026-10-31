import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PhotoStrip } from '../../../components/PhotoStrip';
import { Button, Card, Chips, Input, Label, SectionTitle } from '../../../components/ui';
import { ENTITIES, isKind } from '../../../db/entities';
import {
  accessoriesForFirearm,
  addRoundsToFirearm,
  adjustAmmo,
  deleteItem,
  getItem,
  listItems,
  parsePhotos,
} from '../../../db/repo';
import type { FieldDef, Kind, Row } from '../../../db/types';
import { deletePhotos } from '../../../lib/photos';
import { money, useTheme } from '../../../lib/theme';

export default function DetailScreen() {
  const params = useLocalSearchParams<{ kind: string; id: string }>();
  if (!isKind(params.kind)) return null;
  return <Detail kind={params.kind} id={Number(params.id)} />;
}

function Detail({ kind, id }: { kind: Kind; id: number }) {
  const db = useSQLiteContext();
  const t = useTheme();
  const def = ENTITIES[kind];
  const [row, setRow] = useState<Row | null>(null);
  const [linked, setLinked] = useState<Row[]>([]);
  const [firearmName, setFirearmName] = useState<string | null>(null);
  const [firearms, setFirearms] = useState<Row[]>([]);
  const [amount, setAmount] = useState('');
  const [useWith, setUseWith] = useState('');

  const load = useCallback(() => {
    getItem(db, kind, id).then(async (r) => {
      setRow(r);
      if (kind === 'firearms') setLinked(await accessoriesForFirearm(db, id));
      if (kind === 'accessories' && r?.firearm_id) {
        const f = await getItem(db, 'firearms', Number(r.firearm_id));
        setFirearmName(f ? ENTITIES.firearms.title(f) : null);
      } else {
        setFirearmName(null);
      }
      if (kind === 'ammo') setFirearms(await listItems(db, 'firearms'));
    });
  }, [db, kind, id]);

  useFocusEffect(load);

  if (!row) return null;

  const remove = () => {
    Alert.alert(`Delete ${def.singular.toLowerCase()}?`, `"${def.title(row)}" will be permanently deleted.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          deletePhotos(await deleteItem(db, kind, id));
          router.back();
        },
      },
    ]);
  };

  const adjust = async (sign: 1 | -1) => {
    const n = parseInt(amount, 10);
    if (!Number.isFinite(n) || n <= 0) {
      Alert.alert('Enter a round count', 'Type how many rounds to add or remove.');
      return;
    }
    await adjustAmmo(db, id, sign * n);
    if (sign === -1 && useWith) await addRoundsToFirearm(db, Number(useWith), n);
    setAmount('');
    load();
  };

  const display = (f: FieldDef): string | null => {
    const v = row[f.key];
    if (v === null || v === undefined || v === '') return null;
    if (f.type === 'money') return money(Number(v));
    if (f.type === 'firearm') return firearmName;
    if (f.type === 'number') return Number(v).toLocaleString();
    return String(v);
  };

  const fields = def.fields.filter((f) => display(f) !== null);

  return (
    <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 48 }}>
      <Stack.Screen
        options={{
          title: def.singular,
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/edit/[kind]', params: { kind, id: String(id) } })}>
              <Text style={{ color: t.accent, fontSize: 16, fontWeight: '600' }}>Edit</Text>
            </Pressable>
          ),
        }}
      />
      <View>
        <Text style={[styles.title, { color: t.text }]}>{def.title(row)}</Text>
        <Text style={{ color: t.muted }}>{def.subtitle(row)}</Text>
      </View>

      <PhotoStrip photos={parsePhotos(row)} />

      {kind === 'ammo' && (
        <Card style={{ gap: 10 }}>
          <Text style={[styles.qty, { color: t.text }]}>{Number(row.quantity ?? 0).toLocaleString()} rounds</Text>
          <Input
            value={amount}
            onChangeText={setAmount}
            keyboardType="number-pad"
            placeholder="Number of rounds"
            accessibilityLabel="Rounds to adjust"
          />
          {firearms.length > 0 && (
            <View>
              <Label>When using, add to round count of</Label>
              <Chips
                options={firearms.map((f) => ({ label: ENTITIES.firearms.title(f), value: String(f.id) }))}
                value={useWith}
                onChange={setUseWith}
              />
            </View>
          )}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Button title="Use / remove" icon="remove" variant="secondary" onPress={() => adjust(-1)} />
            </View>
            <View style={{ flex: 1 }}>
              <Button title="Add" icon="add" onPress={() => adjust(1)} />
            </View>
          </View>
        </Card>
      )}

      <Card style={{ paddingVertical: 4 }}>
        {fields.map((f, i) => (
          <View
            key={f.key}
            style={[
              styles.field,
              i < fields.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.border },
            ]}>
            <Text style={{ color: t.muted, fontSize: 13 }}>{f.label}</Text>
            <Text style={{ color: t.text, fontSize: 16 }} selectable>
              {display(f)}
            </Text>
          </View>
        ))}
        {fields.length === 0 && <Text style={{ color: t.muted, paddingVertical: 10 }}>No details recorded.</Text>}
      </Card>

      {kind === 'firearms' && (
        <View>
          <SectionTitle>Accessories</SectionTitle>
          {linked.length === 0 ? (
            <Text style={{ color: t.muted }}>None linked. Choose this firearm when adding an accessory.</Text>
          ) : (
            <Card style={{ paddingVertical: 4 }}>
              {linked.map((a) => (
                <Pressable
                  key={a.id}
                  onPress={() =>
                    router.push({ pathname: '/item/[kind]/[id]', params: { kind: 'accessories', id: String(a.id) } })
                  }
                  style={styles.field}>
                  <Text style={{ color: t.text, fontSize: 16 }}>{ENTITIES.accessories.title(a)}</Text>
                  <Text style={{ color: t.muted }}>{ENTITIES.accessories.subtitle(a)}</Text>
                </Pressable>
              ))}
            </Card>
          )}
        </View>
      )}

      <Text style={{ color: t.muted, fontSize: 12 }}>
        Added {String(row.created_at)} · Updated {String(row.updated_at)} (UTC)
      </Text>
      <Button title={`Delete ${def.singular.toLowerCase()}`} icon="trash-outline" variant="danger" onPress={remove} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '800' },
  qty: { fontSize: 28, fontWeight: '800' },
  field: { paddingVertical: 10, gap: 2 },
});
