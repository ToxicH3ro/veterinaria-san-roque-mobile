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
  obtenerClientes,
  type Cliente,
} from '../../services/userService';

export default function UsuariosScreen() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);

  const cargarClientes = useCallback(async (recargar = false) => {
    if (recargar) {
      setActualizando(true);
    } else {
      setCargando(true);
    }

    try {
      const resultado = await obtenerClientes();
      setClientes(resultado);
    } catch (error) {
      console.error('Error al cargar clientes:', error);

      Alert.alert(
        'Error',
        'No se pudieron cargar los clientes. Verifica tu conexión y los permisos de Firebase.'
      );
    } finally {
      setCargando(false);
      setActualizando(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargarClientes();
    }, [cargarClientes])
  );

  if (cargando) {
    return <Loading text="Cargando clientes..." />;
  }

  return (
    <View style={styles.container}>
      <Header title="Clientes" />

      <View style={styles.contenido}>
        <Text style={styles.titulo}>
          Clientes registrados
        </Text>

        <Text style={styles.subtitulo}>
          Consulta la información de los propietarios de mascotas.
        </Text>

        <FlatList
          data={clientes}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={actualizando}
              onRefresh={() => cargarClientes(true)}
              colors={['#112250']}
            />
          }
          contentContainerStyle={
            clientes.length === 0
              ? styles.listaVacia
              : styles.lista
          }
          ListEmptyComponent={
            <Card>
              <Text style={styles.vacioTitulo}>
                No hay clientes registrados
              </Text>

              <Text style={styles.vacioTexto}>
                Los clientes aparecerán aquí cuando tengan
                su cuenta registrada en la aplicación.
              </Text>
            </Card>
          }
          renderItem={({ item }) => (
            <Card style={styles.tarjeta}>
              <View style={styles.encabezadoTarjeta}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarTexto}>
                    {item.nombre
                      ? item.nombre.charAt(0).toUpperCase()
                      : 'C'}
                  </Text>
                </View>

                <View style={styles.infoPrincipal}>
                  <Text style={styles.nombre}>
                    {[item.nombre, item.apellido]
                      .filter(Boolean)
                      .join(' ') || 'Sin nombre registrado'}
                  </Text>

                  <Text style={styles.rol}>
                    Cliente
                  </Text>
                </View>
              </View>

              <View style={styles.separador} />

              <Text style={styles.etiqueta}>
                Correo electrónico
              </Text>
              <Text style={styles.dato}>
                {item.correo || 'No registrado'}
              </Text>

              <Text style={styles.etiqueta}>
                Dirección
              </Text>
              <Text style={styles.dato}>
                {item.direccion || 'No registrada'}
              </Text>

              <Text style={styles.etiqueta}>
                Teléfono
              </Text>
              <Text style={styles.dato}>
                {item.telefono || 'No registrado'}
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

  encabezadoTarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8ECF5',
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarTexto: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#112250',
  },

  infoPrincipal: {
    flex: 1,
    marginLeft: 12,
  },

  nombre: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#112250',
  },

  rol: {
    fontSize: 13,
    color: '#667085',
    marginTop: 3,
  },

  separador: {
    height: 1,
    backgroundColor: '#E8EAF0',
    marginVertical: 15,
  },

  etiqueta: {
    fontSize: 12,
    color: '#667085',
    marginTop: 9,
    marginBottom: 3,
  },

  dato: {
    fontSize: 15,
    color: '#252B36',
    lineHeight: 21,
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
