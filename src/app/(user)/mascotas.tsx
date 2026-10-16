import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import Header from '@/components/Header';
import Card from '@/components/ui/Card';
import Loading from '@/components/ui/Loading';
import { auth } from '@/lib/firebase';
import {
  obtenerMascotasDeUsuario,
  registrarMascota,
  type Pet,
} from '@/services/petService';

function obtenerIcono(especie: string): string {
  const valor = especie.toLowerCase();

  if (valor.includes('gato')) return '🐱';
  if (valor.includes('perro')) return '🐶';
  if (valor.includes('conejo')) return '🐇';
  if (valor.includes('lagartija')) return '🦎';
  if (valor.includes('tortuga')) return '🐢';
  if (valor.includes('periquito') || valor.includes('ave')) return '🦜';

  return '🐾';
}

export default function MascotasScreen() {
  const [mascotas, setMascotas] = useState<Pet[]>([]);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [nombre, setNombre] = useState('');
  const [especie, setEspecie] = useState('');
  const [raza, setRaza] = useState('');

  const cargarMascotas = useCallback(async (recargar = false) => {
    if (recargar) {
      setActualizando(true);
    } else {
      setCargando(true);
    }

    try {
      const usuario = auth.currentUser;

      if (!usuario) {
        router.replace('/login');
        return;
      }

      const resultado = await obtenerMascotasDeUsuario(usuario.uid);
      setMascotas(resultado);
    } catch (error) {
      console.error('Error al cargar mis mascotas:', error);

      Alert.alert(
        'Error',
        'No se pudieron cargar tus mascotas. Inténtalo de nuevo.',
      );
    } finally {
      setCargando(false);
      setActualizando(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargarMascotas();
    }, [cargarMascotas]),
  );

  const guardarMascota = async () => {
    const nombreLimpio = nombre.trim();
    const especieLimpia = especie.trim();
    const razaLimpia = raza.trim();

    if (!nombreLimpio || !especieLimpia || !razaLimpia) {
      Alert.alert(
        'Campos obligatorios',
        'Completa el nombre, la especie y la raza de tu mascota.',
      );
      return;
    }

    const usuario = auth.currentUser;

    if (!usuario) {
      Alert.alert('Sesión expirada', 'Inicia sesión nuevamente.');
      router.replace('/login');
      return;
    }

    setGuardando(true);

    try {
      await registrarMascota({
        nombre: nombreLimpio,
        especie: especieLimpia,
        raza: razaLimpia,
        usuarioId: usuario.uid,
      });

      setNombre('');
      setEspecie('');
      setRaza('');
      setModalVisible(false);

      await cargarMascotas();

      Alert.alert('¡Listo!', 'Tu mascota se registró correctamente.');
    } catch (error) {
      console.error('Error al registrar mascota:', error);

      Alert.alert(
        'Error',
        'No se pudo registrar tu mascota. Verifica los permisos de Firebase.',
      );
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return <Loading text="Cargando mis mascotas..." />;
  }

  return (
    <View style={styles.container}>
      <Header title="Mis mascotas" />

      <View style={styles.contenido}>
        <Text style={styles.titulo}>Mis mascotas 🐾</Text>

        <Text style={styles.subtitulo}>
          Consulta y registra a tus compañeros de vida.
        </Text>

        <TouchableOpacity
          style={styles.botonAgregar}
          activeOpacity={0.85}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.botonAgregarTexto}>
            + Registrar mascota
          </Text>
        </TouchableOpacity>

        <FlatList
          data={mascotas}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={actualizando}
              onRefresh={() => cargarMascotas(true)}
              colors={['#112250']}
              tintColor="#112250"
            />
          }
          contentContainerStyle={
            mascotas.length === 0
              ? styles.listaVacia
              : styles.lista
          }
          ListEmptyComponent={
            <Card style={styles.tarjetaVacia}>
              <Text style={styles.iconoVacio}>🐾</Text>

              <Text style={styles.vacioTitulo}>
                Aún no tienes mascotas registradas
              </Text>

              <Text style={styles.vacioTexto}>
                Pulsa el botón de arriba para registrar tu primera mascota.
              </Text>
            </Card>
          }
          renderItem={({ item }) => (
            <Card style={styles.tarjeta}>
              <View style={styles.encabezado}>
                <View style={styles.avatar}>
                  <Text style={styles.icono}>
                    {obtenerIcono(item.especie || '')}
                  </Text>
                </View>

                <View style={styles.info}>
                  <Text style={styles.nombreMascota}>
                    {item.nombre || 'Sin nombre'}
                  </Text>

                  <Text style={styles.detalle}>
                    Especie: {item.especie || 'No registrada'}
                  </Text>

                  <Text style={styles.detalle}>
                    Raza: {item.raza || 'No registrada'}
                  </Text>
                </View>
              </View>
            </Card>
          )}
        />
      </View>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!guardando) setModalVisible(false);
        }}
      >
        <KeyboardAvoidingView
          style={styles.modalFondo}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.formulario}>
            <Text style={styles.formularioTitulo}>
              Registrar mascota 🐾
            </Text>

            <Text style={styles.formularioSubtitulo}>
              Introduce los datos de tu mascota.
            </Text>

            <Text style={styles.etiqueta}>Nombre</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. Max"
              placeholderTextColor="#777777"
              value={nombre}
              onChangeText={setNombre}
              maxLength={60}
              editable={!guardando}
            />

            <Text style={styles.etiqueta}>Especie</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. Perro, gato, conejo..."
              placeholderTextColor="#777777"
              value={especie}
              onChangeText={setEspecie}
              maxLength={40}
              editable={!guardando}
            />

            <Text style={styles.etiqueta}>Raza</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. Labrador, mestizo..."
              placeholderTextColor="#777777"
              value={raza}
              onChangeText={setRaza}
              maxLength={60}
              editable={!guardando}
            />

            <TouchableOpacity
              style={[
                styles.botonGuardar,
                guardando && styles.botonDeshabilitado,
              ]}
              onPress={guardarMascota}
              disabled={guardando}
            >
              <Text style={styles.botonGuardarTexto}>
                {guardando ? 'Guardando...' : 'Guardar mascota'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.botonCancelar}
              onPress={() => setModalVisible(false)}
              disabled={guardando}
            >
              <Text style={styles.botonCancelarTexto}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    paddingHorizontal: 18,
    paddingTop: 20,
  },

  titulo: {
    fontSize: 23,
    fontWeight: 'bold',
    color: '#112250',
  },

  subtitulo: {
    fontSize: 14,
    color: '#444F64',
    marginTop: 6,
    marginBottom: 16,
  },

  botonAgregar: {
    backgroundColor: '#112250',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 18,
  },

  botonAgregarTexto: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },

  lista: {
    paddingBottom: 24,
  },

  listaVacia: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 24,
  },

  tarjeta: {
    marginBottom: 14,
  },

  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#E8ECF5',
    alignItems: 'center',
    justifyContent: 'center',
  },

  icono: {
    fontSize: 31,
  },

  info: {
    flex: 1,
    marginLeft: 14,
  },

  nombreMascota: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#112250',
  },

  detalle: {
    fontSize: 14,
    color: '#666666',
    marginTop: 4,
  },

  tarjetaVacia: {
    alignItems: 'center',
    paddingVertical: 28,
  },

  iconoVacio: {
    fontSize: 40,
    marginBottom: 12,
  },

  vacioTitulo: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#112250',
    textAlign: 'center',
  },

  vacioTexto: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 21,
    marginTop: 8,
  },

  modalFondo: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },

  formulario: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
  },

  formularioTitulo: {
    color: '#112250',
    fontSize: 22,
    fontWeight: 'bold',
  },

  formularioSubtitulo: {
    color: '#666666',
    fontSize: 14,
    marginTop: 6,
    marginBottom: 20,
  },

  etiqueta: {
    color: '#112250',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },

  input: {
    borderWidth: 1,
    borderColor: '#D5D9E2',
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 12,
    color: '#222222',
    fontSize: 15,
    marginBottom: 15,
  },

  botonGuardar: {
    backgroundColor: '#112250',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 4,
  },

  botonDeshabilitado: {
    opacity: 0.6,
  },

  botonGuardarTexto: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },

  botonCancelar: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 5,
  },

  botonCancelarTexto: {
    color: '#555555',
    fontSize: 15,
    fontWeight: '600',
  },
});
