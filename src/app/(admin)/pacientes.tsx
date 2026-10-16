import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import Header from '../../components/Header';
import Card from '../../components/ui/Card';
import Loading from '../../components/ui/Loading';
import {
  obtenerPacientes,
  type Pet,
} from '../../services/petService';

export default function PacientesScreen() {
  const [pacientes, setPacientes] = useState<Pet[]>([]);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);

  const cargarPacientes = useCallback(async (recargar = false) => {
    if (recargar) {
      setActualizando(true);
    } else {
      setCargando(true);
    }

    try {
      const resultado = await obtenerPacientes();
      setPacientes(resultado);
    } catch (error) {
      console.error('Error al cargar pacientes:', error);

      Alert.alert(
        'Error',
        'No se pudieron cargar los pacientes. Verifica los permisos de Firebase.'
      );
    } finally {
      setCargando(false);
      setActualizando(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargarPacientes();
    }, [cargarPacientes])
  );

  if (cargando) {
    return <Loading text="Cargando pacientes..." />;
  }

  return (
    <View style={styles.container}>
      <Header title="Pacientes" />

      <View style={styles.contenido}>
        <Text style={styles.titulo}>
          Pacientes registrados
        </Text>

        <Text style={styles.subtitulo}>
          Consulta las mascotas registradas en la veterinaria.
        </Text>

        <FlatList
          data={pacientes}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={actualizando}
              onRefresh={() => cargarPacientes(true)}
              colors={['#112250']}
            />
          }
          contentContainerStyle={
            pacientes.length === 0
              ? styles.listaVacia
              : styles.lista
          }
          ListEmptyComponent={
            <Card>
              <Text style={styles.vacioTitulo}>
                No hay pacientes registrados
              </Text>

              <Text style={styles.vacioTexto}>
                Las mascotas aparecerán aquí cuando estén
                registradas en la aplicación.
              </Text>
            </Card>
          }
          renderItem={({ item }) => (
            <Card style={styles.tarjeta}>
              <View style={styles.encabezado}>
                <View style={styles.avatar}>
                  <Text style={styles.icono}>
                    {item.especie.toLowerCase().includes('gato')
                      ? '🐱'
                      : (item.especie || '').toLowerCase().includes('perro')
                        ? '🐶'
                        : (item.especie || '').toLowerCase().includes('conejo')
                          ? '🐇'
                          : (item.especie || '').toLowerCase().includes('lagartija')
                            ? '🦎'
                            : (item.especie || '').toLowerCase().includes('tortuga')
                              ? '🐢'
                              : (item.especie || '').toLowerCase().includes('periquito')
                              ? '🦜'
                              : '🐾'}
                  </Text>
                </View>

                <View style={styles.info}>
                  <Text style={styles.nombre}>
                    {item.nombre || 'Sin nombre'}
                  </Text>

                  <Text style={styles.detalle}>
                    {item.especie || 'Especie no registrada'}
                  </Text>

                  <Text style={styles.detalle}>
                    Raza: {item.raza || 'No registrada'}
                  </Text>
                </View>
              </View>

              <View style={styles.separador} />

              
              <Text style={styles.etiqueta}>
              Propietario
              </Text>

              <Text style={styles.propietario}>
              {item.propietarioNombre || 'Propietario no encontrado'}
              </Text>

            </Card>
          )}
        />
      </View>
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
    color: '#666666',
    marginTop: 6,
    marginBottom: 20,
    lineHeight: 21,
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
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#E8ECF5',
    alignItems: 'center',
    justifyContent: 'center',
  },

  icono: {
    fontSize: 29,
  },

  info: {
    flex: 1,
    marginLeft: 14,
  },

  nombre: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#112250',
  },

  detalle: {
    fontSize: 14,
    color: '#666666',
    marginTop: 4,
  },

  separador: {
    height: 1,
    backgroundColor: '#E8EAF0',
    marginVertical: 15,
  },

  etiqueta: {
    fontSize: 12,
    color: '#667085',
    marginBottom: 5,
  },

  propietario: {
    fontSize: 13,
    color: '#252B36',
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
});
