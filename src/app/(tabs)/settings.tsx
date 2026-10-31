import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Alert, ScrollView, Switch, Text, View } from 'react-native';
import { Button, Card, SectionTitle } from '../../components/ui';
import { ENTITIES, KINDS } from '../../db/entities';
import { eraseAll, exportBackup, exportCsv, pickBackupFile, restoreBackup } from '../../lib/backup';
import { authenticate, canUseBiometrics, useLock } from '../../lib/lock';
import { useTheme } from '../../lib/theme';

export default function Settings() {
  const db = useSQLiteContext();
  const t = useTheme();
  const lock = useLock();
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      Alert.alert('Something went wrong', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const toggleLock = (value: boolean) =>
    run(async () => {
      if (value && !(await canUseBiometrics())) {
        Alert.alert('Not available', 'Set up Face ID, Touch ID, or a fingerprint on this device first.');
        return;
      }
      if (await authenticate(value ? 'Confirm to enable app lock' : 'Confirm to disable app lock')) {
        await lock.setEnabled(value);
      }
    });

  const backup = () =>
    Alert.alert('Export backup', 'Include photos? Backups with photos can be large.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Without photos', onPress: () => run(() => exportBackup(db, false)) },
      { text: 'With photos', onPress: () => run(() => exportBackup(db, true)) },
    ]);

  const restore = () =>
    run(async () => {
      const payload = await pickBackupFile();
      if (!payload) return;
      Alert.alert('Replace all data?', 'Restoring a backup replaces everything currently in the app.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          style: 'destructive',
          onPress: () =>
            run(async () => {
              const s = await restoreBackup(db, payload);
              Alert.alert(
                'Restore complete',
                `${s.firearms} firearms, ${s.ammo} ammo, ${s.accessories} accessories, ${s.photos} photos.`
              );
            }),
        },
      ]);
    });

  const erase = () =>
    Alert.alert('Erase all data?', 'This permanently deletes every item and photo. Export a backup first.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Erase', style: 'destructive', onPress: () => run(() => eraseAll(db)) },
    ]);

  return (
    <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={{ padding: 16, gap: 16 }}>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: t.text, fontSize: 16, fontWeight: '600' }}>App lock</Text>
            <Text style={{ color: t.muted }}>Require Face ID / fingerprint to open Safe.</Text>
          </View>
          <Switch value={lock.enabled} onValueChange={toggleLock} disabled={busy} accessibilityLabel="App lock" />
        </View>
      </Card>

      <View style={{ gap: 10 }}>
        <SectionTitle>Backup</SectionTitle>
        <Text style={{ color: t.muted }}>
          Your data stays on this phone and is not backed up anywhere else. Export a backup file regularly and store it
          somewhere safe.
        </Text>
        <Button title="Export backup (JSON)" icon="download-outline" onPress={backup} disabled={busy} />
        <Button title="Restore from backup" icon="cloud-upload-outline" variant="secondary" onPress={restore} disabled={busy} />
      </View>

      <View style={{ gap: 10 }}>
        <SectionTitle>Spreadsheet export</SectionTitle>
        {KINDS.map((kind) => (
          <Button
            key={kind}
            title={`Export ${ENTITIES[kind].plural.toLowerCase()} (CSV)`}
            icon="document-text-outline"
            variant="secondary"
            onPress={() => run(() => exportCsv(db, kind))}
            disabled={busy}
          />
        ))}
      </View>

      <View style={{ gap: 10 }}>
        <SectionTitle>Danger zone</SectionTitle>
        <Button title="Erase all data" icon="trash-outline" variant="danger" onPress={erase} disabled={busy} />
      </View>
    </ScrollView>
  );
}
