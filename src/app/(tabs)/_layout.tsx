import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router/js-tabs';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';
import { useTheme } from '../../lib/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

function TabIcon({ name, color, size }: { name: IconName; color: ColorValue; size: number }) {
  return <Ionicons name={name} color={color as string} size={size} />;
}

const icon = (name: IconName) => {
  const render = ({ color, size }: { color: ColorValue; size: number }) => (
    <TabIcon name={name} color={color} size={size} />
  );
  render.displayName = `TabIcon(${name})`;
  return render;
};

export default function TabsLayout() {
  const t = useTheme();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: t.accent,
        tabBarInactiveTintColor: t.muted,
        tabBarStyle: { backgroundColor: t.card, borderTopColor: t.border },
        headerStyle: { backgroundColor: t.card },
        headerTintColor: t.text,
        sceneStyle: { backgroundColor: t.bg },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Overview', tabBarIcon: icon('stats-chart-outline') }} />
      <Tabs.Screen name="firearms" options={{ title: 'Firearms', tabBarIcon: icon('shield-outline') }} />
      <Tabs.Screen name="ammo" options={{ title: 'Ammo', tabBarIcon: icon('cube-outline') }} />
      <Tabs.Screen name="accessories" options={{ title: 'Accessories', tabBarIcon: icon('construct-outline') }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: icon('settings-outline') }} />
    </Tabs>
  );
}
