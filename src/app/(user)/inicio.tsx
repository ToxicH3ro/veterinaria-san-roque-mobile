import { router } from 'expo-router';
import { signOut } from 'firebase/auth';
import { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import Header from '@/components/Header';
import Card from '@/components/ui/Card';
import Loading from '@/components/ui/Loading';
import { auth } from '@/lib/firebase';
import { obtenerPerfil } from '@/services/userService';

const opciones = [
  {
    titulo: 'Mis mascotas',
    icono: '🐾',
    descripcion: 'Consultar mis mascotas',
    ruta: '/(user)/mascotas' as const,
  },
  {
    titulo: 'Mis citas',
    icono: '📅',
    descripcion: 'Consultar mis citas',
    ruta: '/(user)/citas' as const,
  },
  {
    titulo: 'Historial clínico',
    icono: '🗂️',
    descripcion: 'Revisar su historial médico',
    ruta: '/(user)/historial' as const,
  },
  {
    titulo: 'perfil',
    icono: '👤',
    descripcion: 'Consultar mi perfil',
    ruta: '/(user)/perfil' as const,
  },
];

export default function UserInicio() {
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
          setNombre(perfil.nombre || 'Cliente');
        }
      } catch (error) {
        console.error('Error al cargar el perfil:', error);

        if (activo) {
          setNombre('Cliente');
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
                'No se pudo cerrar la sesión. Inténtalo de nuevo.',
              );
            }
          },
        },
      ],
    );
  };

  if (cargando) {
    return <Loading text="Cargando inicio..." />;
  }

  return (
    <View style={styles.container}>
      <Header
        title="Veterinaria San Roque"
        onSettings={() => router.push('/(user)/perfil')}
        onLogout={cerrarSesion}
      />

      <ScrollView
        contentContainerStyle={styles.contenido}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.bienvenida}>
          <View style={styles.profileCircle}>
            <Text style={styles.profileIcon}>🐶</Text>
          </View>

          <View style={styles.bienvenidaTexto}>
            <Text style={styles.saludo}>
              ¡Hola, {nombre}! 👋
            </Text>

            <Text style={styles.mensaje}>
              ¿Cómo podemos cuidar de tus mascotas hoy?
            </Text>
          </View>
        </View>

        <Text style={styles.seccionTitulo}>
          Mi espacio
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

        <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => {
        console.log('Navegando a Mis pagos...');
        router.push('/(user)/pagos');
        }}
        >
      <View style={styles.pagosBanner}>
      <Text style={styles.pagosIcono}>💳</Text>

      <View style={styles.pagosTextoContainer}>
      <Text style={styles.pagosTitulo}>Mis pagos</Text>
      <Text style={styles.pagosDescripcion}>
        Consulta tus facturas y el estado de tus pagos.
      </Text>
      </View>
      <Text style={styles.pagosFlecha}>→</Text>
      </View>
      </TouchableOpacity>

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
    fontSize: 16,
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

  pagosBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginTop: 22,
  },

  pagosIcono: {
    fontSize: 28,
    marginRight: 14,
  },

  pagosTextoContainer: {
    flex: 1,
  },

  pagosTitulo: {
    color: '#112250',
    fontSize: 16,
    fontWeight: 'bold',
  },

  pagosDescripcion: {
    color: '#737D91',
    fontSize: 12,
    marginTop: 4,
  },

  pagosFlecha: {
    color: '#365A9D',
    fontSize: 23,
    fontWeight: 'bold',
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
