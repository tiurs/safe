import * as LocalAuthentication from 'expo-local-authentication';
import { useSQLiteContext } from 'expo-sqlite';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getSetting, setSetting } from '../db/repo';
import { useTheme } from './theme';

const LOCK_KEY = 'biometric_lock';
const RELOCK_AFTER_MS = 60_000;

interface LockContextValue {
  enabled: boolean;
  setEnabled: (value: boolean) => Promise<void>;
}

const LockContext = createContext<LockContextValue>({ enabled: false, setEnabled: async () => {} });

export function useLock() {
  return useContext(LockContext);
}

export async function canUseBiometrics(): Promise<boolean> {
  const [hardware, enrolled] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
  ]);
  return hardware && enrolled;
}

export async function authenticate(prompt = 'Unlock Safe'): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({ promptMessage: prompt });
  return result.success;
}

export function LockGate({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const theme = useTheme();
  const [loaded, setLoaded] = useState(false);
  const [enabled, setEnabledState] = useState(false);
  const [locked, setLocked] = useState(false);
  const backgroundedAt = useRef<number | null>(null);
  const authInFlight = useRef(false);

  const unlock = useCallback(async () => {
    if (authInFlight.current) return;
    authInFlight.current = true;
    try {
      if (await authenticate()) setLocked(false);
    } finally {
      authInFlight.current = false;
    }
  }, []);

  useEffect(() => {
    getSetting(db, LOCK_KEY).then((v) => {
      const on = v === '1';
      setEnabledState(on);
      setLocked(on);
      setLoaded(true);
    });
  }, [db]);

  useEffect(() => {
    if (loaded && locked) unlock();
  }, [loaded, locked, unlock]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (!enabled) return;
      if (state === 'background') {
        backgroundedAt.current = Date.now();
      } else if (state === 'active' && backgroundedAt.current !== null) {
        if (Date.now() - backgroundedAt.current > RELOCK_AFTER_MS) setLocked(true);
        backgroundedAt.current = null;
      }
    });
    return () => sub.remove();
  }, [enabled]);

  const setEnabled = useCallback(
    async (value: boolean) => {
      await setSetting(db, LOCK_KEY, value ? '1' : '0');
      setEnabledState(value);
    },
    [db]
  );

  if (!loaded) return <View style={{ flex: 1, backgroundColor: theme.bg }} />;

  return (
    <LockContext.Provider value={{ enabled, setEnabled }}>
      {locked ? (
        <View style={[styles.lock, { backgroundColor: theme.bg }]}>
          <Ionicons name="lock-closed" size={56} color={theme.accent} />
          <Text style={[styles.title, { color: theme.text }]}>Safe is locked</Text>
          <Pressable
            accessibilityRole="button"
            onPress={unlock}
            style={[styles.button, { backgroundColor: theme.accent }]}>
            <Text style={{ color: theme.accentText, fontWeight: '600', fontSize: 16 }}>Unlock</Text>
          </Pressable>
        </View>
      ) : (
        children
      )}
    </LockContext.Provider>
  );
}

const styles = StyleSheet.create({
  lock: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  title: { fontSize: 20, fontWeight: '600' },
  button: { paddingHorizontal: 32, paddingVertical: 12, borderRadius: 10 },
});
