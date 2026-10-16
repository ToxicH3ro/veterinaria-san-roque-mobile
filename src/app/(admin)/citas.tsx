import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import AppointmentCard from '../../components/AppointmentCard';
import Header from '../../components/Header';
import Loading from '../../components/ui/Loading';

import {
  actualizarEstadoCita,
  obtenerCitas,
} from '../../services/appointmentService';

import type { Appointment } from '../../services/appointmentService';

type FiltroCita =
  | 'todas'
  | 'pendiente'
  | 'confirmada'
  | 'completada'
  | 'cancelada';

const FILTROS: { label: string; value: FiltroCita }[] = [
  { label: 'Todas', value: 'todas' },
  { label: 'Pendientes', value: 'pendiente' },
  { label: 'Confirmadas', value: 'confirmada' },
  { label: 'Completadas', value: 'completada' },
  { label: 'Canceladas', value: 'cancelada' },
];

const normalizarEstado = (estado: string) =>
  (estado || '').trim().toLowerCase();

const obtenerFechaHora = (cita: Appointment) => {
  // Las fechas existentes se guardan como string.
  // Este formato permite ordenarlas cronológicamente:
  // YYYY-MM-DD y HH:mm.
  return `${cita.fecha || ''} ${cita.hora || ''}`;
};

export default function CitasAdmin() {
  const [citas, setCitas] = useState<Appointment[]>([]);
  const [filtro, setFiltro] = useState<FiltroCita>('todas');
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [error, setError] = useState('');
  const [citaEnProceso, setCitaEnProceso] = useState<string | null>(null);

  const cargarCitas = useCallback(async (refrescar = false) => {
    if (refrescar) {
      setActualizando(true);
    } else {
      setCargando(true);
    }

    setError('');

    try {
      const resultado = await obtenerCitas();
      setCitas(resultado);
    } catch (e) {
      console.error('Error al cargar las citas:', e);
      setError('No se pudieron cargar las citas. Comprueba tu conexión e inténtalo de nuevo.');
    } finally {
      setCargando(false);
      setActualizando(false);
    }
  }, []);

  useEffect(() => {
    cargarCitas();
  }, [cargarCitas]);

  const citasFiltradas = useMemo(() => {
    return citas
      .filter((cita) => {
        if (filtro === 'todas') return true;

        return normalizarEstado(cita.estado) === filtro;
      })
      .sort((a, b) =>
        obtenerFechaHora(a).localeCompare(obtenerFechaHora(b))
      );
  }, [citas, filtro]);

  const cambiarEstado = async (id: string, nuevoEstado: string) => {
    if (citaEnProceso) return;

    const cita = citas.find((item) => item.id === id);

    if (!cita) return;

    setCitaEnProceso(id);

    try {
      await actualizarEstadoCita(id, nuevoEstado);

      setCitas((anteriores) =>
        anteriores.map((item) =>
          item.id === id
            ? { ...item, estado: nuevoEstado }
            : item
        )
      );

      Alert.alert(
        'Cita actualizada',
        `El estado cambió a "${nuevoEstado}".`
      );
    } catch (e) {
      console.error('Error al actualizar la cita:', e);

      Alert.alert(
        'Error',
        'No se pudo actualizar la cita. Comprueba los permisos de Firestore e inténtalo de nuevo.'
      );
    } finally {
      setCitaEnProceso(null);
    }
  };

  const solicitarCambioEstado = (id: string, estado: string) => {
    const accion = estado === 'cancelada' ? 'cancelar' : 'cambiar el estado de';

    Alert.alert(
      'Confirmar acción',
      `¿Deseas ${accion} esta cita?`,
      [
        {
          text: 'Volver',
          style: 'cancel',
        },
        {
          text: 'Confirmar',
          onPress: () => {
            void cambiarEstado(id, estado);
          },
        },
      ]
    );
  };

  if (cargando) {
    return <Loading text="Cargando agenda de citas..." />;
  }

  return (
    <SafeAreaView style={styles.contenedor}>
      <Header title="Agenda de citas" />

      <View style={styles.resumen}>
        <Text style={styles.titulo}>Gestión de citas</Text>
        <Text style={styles.subtitulo}>
          Consulta y administra las citas veterinarias.
        </Text>

        <View style={styles.contador}>
          <Text style={styles.numero}>{citas.length}</Text>
          <Text style={styles.textoContador}>
            {citas.length === 1 ? 'cita registrada' : 'citas registradas'}
          </Text>
        </View>
      </View>

      <View style={styles.filtros}>
        <FlatList
          horizontal
          data={FILTROS}
          keyExtractor={(item) => item.value}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listaFiltros}
          renderItem={({ item }) => {
            const seleccionado = filtro === item.value;

            return (
              <Text
                onPress={() => setFiltro(item.value)}
                style={[
                  styles.filtro,
                  seleccionado && styles.filtroSeleccionado,
                ]}
              >
                {item.label}
              </Text>
            );
          }}
        />
      </View>

      {error !== '' && (
        <View style={styles.error}>
          <Text style={styles.textoError}>{error}</Text>
          <Text
            style={styles.reintentar}
            onPress={() => void cargarCitas()}
          >
            Volver a intentar
          </Text>
        </View>
      )}

      <FlatList
        data={citasFiltradas}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listaCitas}
        refreshControl={
          <RefreshControl
            refreshing={actualizando}
            onRefresh={() => void cargarCitas(true)}
            tintColor="#112250"
          />
        }
        ListEmptyComponent={
          <View style={styles.vacio}>
            <Text style={styles.iconoVacio}>📅</Text>
            <Text style={styles.tituloVacio}>
              {error
                ? 'No hay datos disponibles'
                : filtro === 'todas'
                  ? 'Todavía no hay citas'
                  : 'No hay citas con este estado'}
            </Text>
            <Text style={styles.textoVacio}>
              {error
                ? 'Desliza hacia abajo para intentarlo de nuevo.'
                : 'Las citas que coincidan con este filtro aparecerán aquí.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View
            style={[
              styles.elementoCita,
              citaEnProceso !== null && styles.bloqueoVisual,
            ]}
          >
            <AppointmentCard
              cita={item}
              onCambiarEstado={solicitarCambioEstado}
            />

            {citaEnProceso === item.id && (
              <Text style={styles.actualizandoEstado}>
                Actualizando estado...
              </Text>
            )}
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: '#8FBFE3',
  },
  resumen: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  titulo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#112250',
  },
  subtitulo: {
    marginTop: 6,
    color: '#64748B',
    fontSize: 14,
  },
  contador: {
    marginTop: 16,
    padding: 16,
    borderRadius: 14,
    backgroundColor: '#112250',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  numero: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  textoContador: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  filtros: {
    marginBottom: 12,
  },
  listaFiltros: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filtro: {
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    color: '#475569',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    fontSize: 13,
    fontWeight: '600',
  },
  filtroSeleccionado: {
    backgroundColor: '#112250',
    color: '#FFFFFF',
  },
  listaCitas: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 24,
    flexGrow: 1,
  },
  elementoCita: {
    marginBottom: 4,
  },
  bloqueoVisual: {
    opacity: 0.85,
  },
  actualizandoEstado: {
    color: '#64748B',
    fontSize: 12,
    marginTop: -8,
    marginBottom: 10,
    textAlign: 'center',
  },
  error: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    backgroundColor: '#FCE4E4',
    borderRadius: 12,
  },
  textoError: {
    color: '#B42318',
    fontSize: 13,
  },
  reintentar: {
    color: '#112250',
    fontWeight: 'bold',
    marginTop: 8,
  },
  vacio: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  iconoVacio: {
    fontSize: 40,
    marginBottom: 12,
  },
  tituloVacio: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#112250',
    textAlign: 'center',
  },
  textoVacio: {
    marginTop: 8,
    color: '#64748B',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
});
