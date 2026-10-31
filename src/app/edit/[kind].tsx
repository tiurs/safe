import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { PhotoStrip } from '../../components/PhotoStrip';
import { Button, Chips, Input, Label } from '../../components/ui';
import { ENTITIES, isKind } from '../../db/entities';
import { getItem, listItems, parsePhotos, saveItem, toFormValues, validate, type FormValues } from '../../db/repo';
import type { FieldDef, Kind, Row } from '../../db/types';
import { localToday } from '../../lib/date';
import { deletePhotos } from '../../lib/photos';
import { useTheme } from '../../lib/theme';

export default function EditScreen() {
  const params = useLocalSearchParams<{ kind: string; id?: string }>();
  if (!isKind(params.kind)) return null;
  return <EditForm kind={params.kind} id={params.id ? Number(params.id) : undefined} />;
}

function EditForm({ kind, id }: { kind: Kind; id?: number }) {
  const db = useSQLiteContext();
  const t = useTheme();
  const def = ENTITIES[kind];
  const [values, setValues] = useState<FormValues | null>(id ? null : toFormValues(kind, null));
  const [photos, setPhotos] = useState<string[]>([]);
  const [firearms, setFirearms] = useState<Row[]>([]);
  const [saving, setSaving] = useState(false);
  const originalPhotos = useRef<string[]>([]);
  const saved = useRef(false);

  useEffect(() => {
    if (id) {
      getItem(db, kind, id).then((row) => {
        setValues(toFormValues(kind, row));
        const p = parsePhotos(row);
        originalPhotos.current = p;
        setPhotos(p);
      });
    }
    if (def.fields.some((f) => f.type === 'firearm')) listItems(db, 'firearms').then(setFirearms);
  }, [db, kind, id, def.fields]);

  const photosRef = useRef(photos);
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);
  useEffect(
    () => () => {
      // Clean up photos added during an edit that was abandoned.
      if (!saved.current) deletePhotos(photosRef.current.filter((p) => !originalPhotos.current.includes(p)));
    },
    []
  );

  if (!values) return null;

  const set = (key: string, v: string) => setValues((prev) => ({ ...(prev ?? {}), [key]: v }));

  const save = async () => {
    const error = validate(kind, values);
    if (error) {
      Alert.alert('Check the form', error);
      return;
    }
    setSaving(true);
    try {
      const savedId = await saveItem(db, kind, values, photos, id);
      saved.current = true;
      deletePhotos(originalPhotos.current.filter((p) => !photos.includes(p)));
      if (id) {
        router.back();
      } else {
        router.replace({ pathname: '/item/[kind]/[id]', params: { kind, id: String(savedId) } });
      }
    } catch (e) {
      Alert.alert('Could not save', e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  };

  const renderField = (f: FieldDef) => {
    const v = values[f.key] ?? '';
    let control;
    switch (f.type) {
      case 'choice':
        control = <Chips options={(f.options ?? []).map((o) => ({ label: o, value: o }))} value={v} onChange={(x) => set(f.key, x)} />;
        break;
      case 'firearm':
        control =
          firearms.length === 0 ? (
            <Text style={{ color: t.muted }}>No firearms added yet.</Text>
          ) : (
            <Chips
              options={firearms.map((r) => ({ label: ENTITIES.firearms.title(r), value: String(r.id) }))}
              value={v}
              onChange={(x) => set(f.key, x)}
            />
          );
        break;
      case 'number':
      case 'money':
        control = (
          <Input
            value={v}
            onChangeText={(x) => set(f.key, x)}
            keyboardType="decimal-pad"
            placeholder={f.placeholder ?? (f.type === 'money' ? '0.00' : '')}
            accessibilityLabel={f.label}
          />
        );
        break;
      case 'date':
        control = (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Input
              style={{ flex: 1 }}
              value={v}
              onChangeText={(x) => set(f.key, x)}
              placeholder="YYYY-MM-DD"
              keyboardType="numbers-and-punctuation"
              accessibilityLabel={f.label}
            />
            <Button title="Today" variant="secondary" onPress={() => set(f.key, localToday())} />
          </View>
        );
        break;
      default:
        control = (
          <Input
            value={v}
            onChangeText={(x) => set(f.key, x)}
            placeholder={f.placeholder}
            multiline={f.type === 'multiline'}
            autoCapitalize={f.key === 'serial_number' || f.key === 'lot_number' ? 'characters' : 'sentences'}
            autoCorrect={f.key !== 'serial_number' && f.key !== 'lot_number'}
            accessibilityLabel={f.label}
          />
        );
    }
    return (
      <View key={f.key}>
        <Label>
          {f.label}
          {f.required ? ' *' : ''}
        </Label>
        {control}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: id ? `Edit ${def.singular}` : `New ${def.singular}` }} />
      <ScrollView
        style={{ backgroundColor: t.bg }}
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 48 }}
        keyboardShouldPersistTaps="handled">
        <View>
          <Label>Photos</Label>
          <PhotoStrip photos={photos} onChange={setPhotos} />
        </View>
        {def.fields.map(renderField)}
        <Button title={saving ? 'Saving…' : 'Save'} icon="checkmark" onPress={save} disabled={saving} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
