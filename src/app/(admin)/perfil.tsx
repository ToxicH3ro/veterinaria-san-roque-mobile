import { router } from 'expo-router';
import { signOut } from 'firebase/auth';
import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { auth } from '../../lib/firebase';
import {
  actualizarPerfil,
  obtenerPerfil,
  PerfilUsuario,
} from '../../services/userService';

import Header from '../../components/Header';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Loading from '../../components/ui/Loading';

export default function PerfilAdmin() {
  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null);

  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');

  const [editando, setEditando] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    cargarPerfil();
  }, []);

  const cargarPerfil = async () => {
    const usuario = auth.currentUser;

    if (!usuario) {
      router.replace('/login');
      return;
    }

    try {
      setCargando(true);

      const datos = await obtenerPerfil(usuario.uid);

      setPerfil(datos);
      setNombre(datos.nombre);
      setApellido(datos.apellido);
      setTelefono(datos.telefono);
      setDireccion(datos.direccion);
    } catch (error) {
      console.error('Error al cargar perfil:', error);

      Alert.alert(
        'Error',
        'No se pudo cargar tu perfil. Verifica tu conexión y los permisos de Firestore.'
      );
    } finally {
      setCargando(false);
    }
  };

  const guardarCambios = async () => {
    if (!perfil) return;

    if (!nombre.trim() || !apellido.trim()) {
      Alert.alert(
        'Campos obligatorios',
        'El nombre y el apellido son obligatorios.'
      );
      return;
    }

    try {
      setGuardando(true);

      await actualizarPerfil(perfil.id, {
        nombre,
        apellido,
        telefono,
        direccion,
      });

      setPerfil({
        ...perfil,
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        telefono: telefono.trim(),
        direccion: direccion.trim(),
      });

      setEditando(false);

      Alert.alert(
        'Perfil actualizado',
        'Tus datos se guardaron correctamente.'
      );
    } catch (error) {
      console.error('Error al actualizar perfil:', error);

      Alert.alert(
        'Error',
        'No se pudieron guardar los cambios. Verifica los permisos de Firestore.'
      );
    } finally {
      setGuardando(false);
    }
  };

  const cerrarSesion = () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Estás seguro de que deseas salir de tu cuenta?',
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
    return <Loading text="Cargando perfil..." />;
  }

  return (
    <View style={styles.container}>
      <Header
        title="Mi perfil"
        onLogout={cerrarSesion}
      />

      <KeyboardAvoidingView
        style={styles.contenido}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.encabezado}>
            <View style={styles.avatar}>
              <Text style={styles.avatarTexto}>
                {nombre.trim().charAt(0).toUpperCase() || 'V'}
              </Text>
            </View>

            <Text style={styles.nombreCompleto}>
              {perfil
                ? `${perfil.nombre} ${perfil.apellido}`.trim()
                : 'Veterinario'}
            </Text>

            <Text style={styles.rol}>
              {perfil?.rol || 'Veterinario'}
            </Text>
          </View>

          <Card style={styles.tarjeta}>
            <Text style={styles.tituloSeccion}>
              Información personal
            </Text>

            <Input
              label="Nombre"
              value={nombre}
              onChangeText={setNombre}
              editable={editando}
              placeholder="Ingresa tu nombre"
              autoCapitalize="words"
            />

            <Input
              label="Apellido"
              value={apellido}
              onChangeText={setApellido}
              editable={editando}
              placeholder="Ingresa tu apellido"
              autoCapitalize="words"
            />

            <Input
              label="Correo electrónico"
              value={perfil?.correo ?? ''}
              editable={false}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Input
              label="Teléfono"
              value={telefono}
              onChangeText={setTelefono}
              editable={editando}
              placeholder="Ingresa tu teléfono"
              keyboardType="phone-pad"
            />

            <Input
              label="Dirección"
              value={direccion}
              onChangeText={setDireccion}
              editable={editando}
              placeholder="Ingresa tu dirección"
              multiline
            />

            {editando ? (
              <>
                <Button
                  title="Guardar cambios"
                  onPress={guardarCambios}
                  loading={guardando}
                  disabled={guardando}
                />

                <View style={styles.espacio} />

                <Button
                  title="Cancelar edición"
                  onPress={() => {
                    setNombre(perfil?.nombre ?? '');
                    setApellido(perfil?.apellido ?? '');
                    setTelefono(perfil?.telefono ?? '');
                    setDireccion(perfil?.direccion ?? '');
                    setEditando(false);
                  }}
                  disabled={guardando}
                />
              </>
            ) : (
              <Button
                title="Editar perfil"
                onPress={() => setEditando(true)}
              />
            )}
          </Card>

          <Text style={styles.nota}>
            Tus datos personales se almacenan en Firebase.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#8FBFE3',
  },
  contenido: {
    flex: 1,
  },
  scroll: {
    padding: 18,
    paddingBottom: 35,
  },
  encabezado: {
    alignItems: 'center',
    marginBottom: 22,
    marginTop: 8,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#112250',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarTexto: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: 'bold',
  },
  nombreCompleto: {
    color: '#112250',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  rol: {
    color: '#667085',
    fontSize: 14,
    marginTop: 5,
    textTransform: 'capitalize',
  },
  tarjeta: {
    marginBottom: 16,
  },
  tituloSeccion: {
    color: '#112250',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  espacio: {
    height: 12,
  },
  nota: {
    color: '#667085',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
});
