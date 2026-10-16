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
        name="citas"
        options={{
          title: 'Agenda',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: focused ? 23 : 21 }}>
              📅
            </Text>
          ),
        }}
      />

      <Tabs.Screen
        name="pacientes"
        options={{
          title: 'Pacientes',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: focused ? 23 : 21 }}>
              🐾
            </Text>
          ),
        }}
      />

      <Tabs.Screen
        name="usuarios"
        options={{
          title: 'Clientes',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: focused ? 23 : 21 }}>
              👥
            </Text>
          ),
        }}
      />

      <Tabs.Screen
        name="facturacion"
        options={{
          title: 'Facturación',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: focused ? 23 : 21 }}>
              💰
            </Text>
          ),
        }}
      />

      <Tabs.Screen
        name="inventario"
        options={{
          title: 'Inventario',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: focused ? 23 : 21 }}>
              📦
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