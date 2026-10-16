import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function AdminLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#112250',
        tabBarInactiveTintColor: '#737D91',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E5E8EF',
          height: 65,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="inicio"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: focused ? 23 : 21 }}>
              🏠
            </Text>
          ),
        }}
      />

    <Tabs.Screen
        name="mascotas"
        options={{
          title: 'Mascotas',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: focused ? 23 : 21 }}>
              🐾
            </Text>
          ),
        }}
      />

      <Tabs.Screen
        name="citas"
        options={{
          title: 'Citas',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: focused ? 23 : 21 }}>
              📅
            </Text>
          ),
        }}
      />

      <Tabs.Screen
        name="historial"
        options={{
          title: 'Historial',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: focused ? 23 : 21 }}>
              🗂️
            </Text>
          ),
        }}
      />

      <Tabs.Screen
        name="pagos"
        options={{
          title: 'Pagos',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: focused ? 23 : 21 }}>
              💳
            </Text>
          ),
        }}
      />

      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: focused ? 23 : 21 }}>
              👤
            </Text>
          ),
        }}
      />
    </Tabs>
  );
}