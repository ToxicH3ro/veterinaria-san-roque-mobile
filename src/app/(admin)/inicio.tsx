import { router } from 'expo-router';
import { signOut } from 'firebase/auth';
import { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

import Header from '@/components/Header';
import Card from '@/components/ui/Card';
import Loading from '@/components/ui/Loading';
import { auth } from '@/lib/firebase';
import { obtenerPerfil } from '@/services/userService';

const opciones = [
  {
    titulo: 'Agenda',
    icono: '📅',
    descripcion: 'Gestionar citas',
    ruta: '/(admin)/citas' as const,
  },
  {
    titulo: 'Clientes',
    icono: '👥',
    descripcion: 'Consultar clientes',
    ruta: '/(admin)/usuarios' as const,
  },
  {
    titulo: 'Pacientes',
    icono: '🐶',
    descripcion: 'Ver mascotas',
    ruta: '/(admin)/pacientes' as const,
  },
  {
    titulo: 'Facturación',
    icono: '💰',
    descripcion: 'Gestionar facturas',
    ruta: '/(admin)/facturacion' as const,
  },
  {
    titulo: 'Inventario',
    icono: '📦',
    descripcion: 'Gestionar productos',
    ruta: '/(admin)/inventario' as const,
  },
  {
    titulo: 'Perfil',
    icono: '👤',
    descripcion: 'Mis datos personales',
    ruta: '/(admin)/perfil' as const,
  },
];

export default function AdminInicio() {
  const [nombre, setNombre] = useState('');
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activo = true;

    const cargarNombre = async () => {
      try {
        const usuario = auth.currentUser;

        if (!usuario) {
          router.replace('/login');
          return;
        }

        const perfil = await obtenerPerfil(usuario.uid);

        if (activo) {
          setNombre(perfil.nombre || 'Veterinario');
        }
      } catch (error) {
        console.error('Error al cargar el perfil:', error);

        if (activo) {
          setNombre('Veterinario');
        }
      } finally {
        if (activo) {
          setCargando(false);
        }
      }
    };

    cargarNombre();

    return () => {
      activo = false;
    };
  }, []);

  const cerrarSesion = () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Deseas salir de tu cuenta?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut(auth);
              router.replace('/login');
            } catch (error) {
              console.error('Error al cerrar sesión:', error);
              Alert.alert(
                'Error',
                'No se pudo cerrar la sesión. Inténtalo de nuevo.'
              );
            }
          },
        },
      ]
    );
  };

  if (cargando) {
    return <Loading text="Cargando inicio..." />;
  }

  return (
    <View style={styles.container}>
      <Header
        title="Veterinaria San Roque"
        onSettings={() => router.push('/(admin)/perfil')}
        onLogout={cerrarSesion}
      />

      <ScrollView
        contentContainerStyle={styles.contenido}
        showsVerticalScrollIndicator={false}
      >

        <View style={styles.bienvenida}>
          <View style={styles.profileCircle}>
            <Text style={styles.profileIcon}>👨🏻‍⚕️</Text>
          </View>

          <View style={styles.bienvenidaTexto}>
            <Text style={styles.saludo}>¡Hola, {nombre}! 👋</Text>
            <Text style={styles.mensaje}>
              ¿Qué deseas gestionar hoy?
            </Text>
          </View>
        </View>

        <Text style={styles.seccionTitulo}>
          Administración
        </Text>

        <View style={styles.grid}>
          {opciones.map((opcion) => (
            <TouchableOpacity
              key={opcion.titulo}
              style={styles.cardWrapper}
              activeOpacity={0.8}
              onPress={() => router.push(opcion.ruta)}
            >
              <Card style={styles.card}>
                <View style={styles.iconContainer}>
                  <Text style={styles.cardIcon}>
                    {opcion.icono}
                  </Text>
                </View>

                <Text style={styles.cardTitle}>
                  {opcion.titulo}
                </Text>

                <Text style={styles.cardDescription}>
                  {opcion.descripcion}
                </Text>

                <Text style={styles.cardArrow}>
                  Ver sección →
                </Text>
              </Card>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.pie}>
          <Text style={styles.pieTexto}>
           🐾 Cuidamos de quienes más quieres 🐾
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#8FBFE3',
  },
  contenido: {
    paddingHorizontal: 18,
    paddingTop: 24,
    paddingBottom: 30,
  },
  
  marca: {
    color: '#112250',
    fontSize: 17,
    fontWeight: 'bold',
    letterSpacing: 1,
    textAlign: 'center',
  },
  subtitulo: {
    color: '#000000',
    fontSize: 14,
    marginTop: 5,
  },
  bienvenida: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#112250',
    borderRadius: 18,
    padding: 18,
    marginBottom: 28,
  },
  profileCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileIcon: {
    fontSize: 34,
  },
  bienvenidaTexto: {
    flex: 1,
    marginLeft: 14,
  },
  saludo: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: 'bold',
  },
  mensaje: {
    color: '#D8E0F2',
    fontSize: 13,
    marginTop: 5,
  },
  seccionTitulo: {
    color: '#112250',
    fontSize: 19,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 15,
  },
  cardWrapper: {
    width: '48%',
  },
  card: {
    minHeight: 174,
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding: 15,
  },
  iconContainer: {
    width: 49,
    height: 49,
    borderRadius: 15,
    backgroundColor: '#EAF0FB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  cardIcon: {
    fontSize: 27,
  },
  cardTitle: {
    color: '#112250',
    fontSize: 17,
    fontWeight: 'bold',
  },
  cardDescription: {
    color: '#737D91',
    fontSize: 12,
    marginTop: 5,
  },
  cardArrow: {
    color: '#365A9D',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 12,
  },
  pie: {
    alignItems: 'center',
    marginTop: 28,
  },
  pieTexto: {
    color: '#000000',
    fontSize: 13,
    textAlign: 'center',
  },
});
