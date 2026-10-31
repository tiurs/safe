import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, SectionTitle } from '../../components/ui';
import { ENTITIES } from '../../db/entities';
import { getStats, type Stats } from '../../db/repo';
import { money, useTheme } from '../../lib/theme';

export default function Overview() {
  const db = useSQLiteContext();
  const t = useTheme();
  const [stats, setStats] = useState<Stats | null>(null);

  useFocusEffect(
    useCallback(() => {
      getStats(db).then(setStats);
    }, [db])
  );

  if (!stats) return null;
  const total = stats.firearmValue + stats.ammoValue + stats.accessoryValue;

  const tile = (label: string, value: string, sub: string, href: '/firearms' | '/ammo' | '/accessories') => (
    <Pressable style={{ flex: 1 }} onPress={() => router.navigate(href)} accessibilityRole="button">
      <Card style={{ alignItems: 'center', paddingVertical: 16 }}>
        <Text style={[styles.big, { color: t.text }]}>{value}</Text>
        <Text style={{ color: t.muted, fontWeight: '600' }}>{label}</Text>
        <Text style={{ color: t.muted, fontSize: 12, marginTop: 4 }}>{sub}</Text>
      </Card>
    </Pressable>
  );

  return (
    <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Card>
        <Text style={{ color: t.muted, fontWeight: '600' }}>ESTIMATED TOTAL VALUE</Text>
        <Text style={[styles.total, { color: t.text }]}>{money(total)}</Text>
        <Text style={{ color: t.muted, fontSize: 12 }}>
          Uses current value when set, otherwise purchase price. Ammo uses cost per round.
        </Text>
      </Card>

      <View style={styles.tiles}>
        {tile('Firearms', String(stats.firearmCount), money(stats.firearmValue), '/firearms')}
        {tile('Rounds', stats.ammoRounds.toLocaleString(), money(stats.ammoValue), '/ammo')}
        {tile('Accessories', String(stats.accessoryCount), money(stats.accessoryValue), '/accessories')}
      </View>

      <View style={styles.tiles}>
        {(['firearms', 'ammo', 'accessories'] as const).map((kind) => (
          <View key={kind} style={{ flex: 1 }}>
            <Button
              title={ENTITIES[kind].singular}
              icon="add"
              variant="secondary"
              onPress={() => router.push({ pathname: '/edit/[kind]', params: { kind } })}
            />
          </View>
        ))}
      </View>

      {stats.lowStock.length > 0 && (
        <Card style={{ borderColor: t.warn }}>
          <SectionTitle>Low ammo</SectionTitle>
          {stats.lowStock.map((r) => (
            <Pressable
              key={r.id}
              onPress={() => router.push({ pathname: '/item/[kind]/[id]', params: { kind: 'ammo', id: String(r.id) } })}
              style={styles.line}>
              <Text style={{ color: t.text, flex: 1 }}>{ENTITIES.ammo.title(r)}</Text>
              <Text style={{ color: t.warn, fontWeight: '600' }}>
                {Number(r.quantity).toLocaleString()} / {Number(r.low_stock_threshold).toLocaleString()}
              </Text>
            </Pressable>
          ))}
        </Card>
      )}

      <Card>
        <SectionTitle>Rounds by caliber</SectionTitle>
        {stats.byCaliber.length === 0 ? (
          <Text style={{ color: t.muted }}>No ammo recorded yet.</Text>
        ) : (
          stats.byCaliber.map((c) => (
            <View key={c.caliber} style={styles.line}>
              <Text style={{ color: t.text, flex: 1 }}>{c.caliber}</Text>
              <Text style={{ color: t.text, fontWeight: '600' }}>{Number(c.rounds).toLocaleString()}</Text>
            </View>
          ))
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  total: { fontSize: 34, fontWeight: '800', marginVertical: 4 },
  big: { fontSize: 26, fontWeight: '800' },
  tiles: { flexDirection: 'row', gap: 10 },
  line: { flexDirection: 'row', paddingVertical: 8, gap: 8 },
});
