import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { auth } from '@/lib/firebase';
import {
  crearCita,
  obtenerCitasDeUsuario,
  type Appointment,
} from '@/services/appointmentService';
import {
  obtenerMascotasDeUsuario,
  type Pet,
} from '@/services/petService';

import Header from '@/components/Header';
import Loading from '@/components/ui/Loading';

const SERVICIOS = [
  'Consulta general',
  'Vacunación',
  'Desparasitación',
  'Control veterinario',
  'Emergencia',
];

export default function CitasUsuario() {
  const [citas, setCitas] = useState<Appointment[]>([]);
  const [mascotas, setMascotas] = useState<Pet[]>([]);
  const [mascotaSeleccionada, setMascotaSeleccionada] =
    useState<Pet | null>(null);
  const [tipo, setTipo] = useState('');
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const cargarDatos = useCallback(async () => {
    const usuario = auth.currentUser;

    if (!usuario) {
      setError('Debes iniciar sesión para consultar tus citas.');
      setCargando(false);
      return;
    }

    setCargando(true);
    setError('');

    try {
      const [citasUsuario, mascotasUsuario] = await Promise.all([
        obtenerCitasDeUsuario(usuario.uid),
        obtenerMascotasDeUsuario(usuario.uid),
      ]);

      setCitas(citasUsuario);
      setMascotas(mascotasUsuario);
    } catch (e) {
      console.error('Error al cargar las citas:', e);
      setError('No se pudieron cargar tus datos. Inténtalo de nuevo.');
    } finally {
      setCargando(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void cargarDatos();
    }, [cargarDatos])
  );

  const solicitarCita = async () => {
    const usuario = auth.currentUser;

    if (!usuario) {
      Alert.alert('Sesión requerida', 'Inicia sesión para solicitar una cita.');
      return;
    }

    if (!mascotaSeleccionada) {
      Alert.alert('Falta tu mascota', 'Selecciona la mascota que atenderemos.');
      return;
    }

    if (!tipo) {
      Alert.alert('Falta el servicio', 'Selecciona el tipo de consulta.');
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      Alert.alert('Fecha inválida', 'Escribe la fecha como AAAA-MM-DD.');
      return;
    }

    const fechaIngresada = new Date(`${fecha}T00:00:00`);
    const fechaActual = new Date();
    fechaActual.setHours(0, 0, 0, 0);

    if (
      Number.isNaN(fechaIngresada.getTime()) ||
      fechaIngresada.toISOString().slice(0, 10) !== fecha
    ) {
      Alert.alert('Fecha inválida', 'Ingresa una fecha real del calendario.');
      return;
    }

    if (fechaIngresada < fechaActual) {
      Alert.alert('Fecha inválida', 'Selecciona hoy o una fecha futura.');
      return;
    }

    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(hora)) {
      Alert.alert('Hora inválida', 'Escribe la hora en formato de 24 horas, por ejemplo 14:30.');
      return;
    }

    setGuardando(true);

    try {
      await crearCita({
        mascota: mascotaSeleccionada.nombre,
        tipo,
        fecha,
        hora,
        estado: 'pendiente',
        usuarioID: usuario.uid,
      });

      setTipo('');
      setFecha('');
      setHora('');
      setMascotaSeleccionada(null);

      await cargarDatos();

      Alert.alert(
        '¡Solicitud registrada! 🐾',
        'Tu cita quedó pendiente de confirmación por parte de la veterinaria.'
      );
    } catch (e) {
      console.error('Error al registrar la cita:', e);
      Alert.alert(
        'No se pudo registrar',
        'Comprueba tu conexión y los permisos de Firebase e inténtalo de nuevo.'
      );
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return <Loading text="Cargando tus citas..." />;
  }

  return (
    <View style={styles.contenedor}>
      <Header title="Mis citas" />

      <ScrollView
        contentContainerStyle={styles.contenido}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.titulo}>Agenda veterinaria 🐾</Text>
        <Text style={styles.subtitulo}>
          Solicita una cita para tu mascota y consulta su estado.
        </Text>

        {error !== '' && (
          <View style={styles.error}>
            <Text style={styles.textoError}>{error}</Text>
            <TouchableOpacity onPress={() => void cargarDatos()}>
              <Text style={styles.reintentar}>Volver a intentar</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.tarjeta}>
          <Text style={styles.tituloTarjeta}>Solicitar una cita</Text>

          <Text style={styles.etiqueta}>1. Selecciona tu mascota</Text>

          {mascotas.length === 0 ? (
            <View style={styles.sinMascotas}>
              <Text style={styles.textoAyuda}>
                Todavía no tienes mascotas registradas.
              </Text>
              <TouchableOpacity
                style={styles.botonSecundario}
                onPress={() => router.push('/(user)/mascotas')}
              >
                <Text style={styles.textoBotonSecundario}>
                  Registrar mascota
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.opciones}>
              {mascotas.map((mascota) => {
                const seleccionada = mascotaSeleccionada?.id === mascota.id;

                return (
                  <TouchableOpacity
                    key={mascota.id}
                    style={[
                      styles.opcionMascota,
                      seleccionada && styles.opcionSeleccionada,
                    ]}
                    onPress={() => setMascotaSeleccionada(mascota)}
                  >
                    <Text style={styles.iconoMascota}>🐶</Text>
                    <View style={styles.infoMascota}>
                      <Text style={styles.nombreMascota}>
                        {mascota.nombre}
                      </Text>
                      <Text style={styles.detalleMascota}>
                        {[mascota.especie, mascota.raza]
                          .filter(Boolean)
                          .join(' · ')}
                      </Text>
                    </View>
                    <Text style={styles.marca}>
                      {seleccionada ? '✓' : '○'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <Text style={styles.etiqueta}>2. Tipo de servicio</Text>

          <View style={styles.opciones}>
            {SERVICIOS.map((servicio) => (
              <TouchableOpacity
                key={servicio}
                style={[
                  styles.opcionServicio,
                  tipo === servicio && styles.servicioSeleccionado,
                ]}
                onPress={() => setTipo(servicio)}
              >
                <Text
                  style={[
                    styles.textoServicio,
                    tipo === servicio && styles.textoServicioSeleccionado,
                  ]}
                >
                  {servicio}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.etiqueta}>3. Fecha de la cita</Text>
          <TextInput
            style={styles.input}
            placeholder="AAAA-MM-DD (ej. 2026-10-20)"
            placeholderTextColor="#8492A6"
            value={fecha}
            onChangeText={setFecha}
            keyboardType="numbers-and-punctuation"
            maxLength={10}
          />

          <Text style={styles.etiqueta}>4. Hora preferida</Text>
          <TextInput
            style={styles.input}
            placeholder="HH:mm (ej. 14:30)"
            placeholderTextColor="#8492A6"
            value={hora}
            onChangeText={setHora}
            keyboardType="numbers-and-punctuation"
            maxLength={5}
          />

          <Text style={styles.nota}>
            La fecha y hora son preferencias de solicitud. La cita quedará
            pendiente hasta que la veterinaria la confirme.
          </Text>

          <TouchableOpacity
            style={[
              styles.botonPrincipal,
              (guardando || mascotas.length === 0) && styles.botonDeshabilitado,
            ]}
            onPress={() => void solicitarCita()}
            disabled={guardando || mascotas.length === 0}
          >
            <Text style={styles.textoBotonPrincipal}>
              {guardando ? 'Registrando cita...' : 'Solicitar cita'}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.tituloSeccion}>Mis citas registradas</Text>

        {citas.length === 0 ? (
          <View style={styles.vacio}>
            <Text style={styles.iconoVacio}>📅</Text>
            <Text style={styles.textoVacio}>Todavía no tienes citas.</Text>
            <Text style={styles.textoAyuda}>
              Cuando solicites una, aparecerá aquí.
            </Text>
          </View>
        ) : (
          citas.map((cita) => (
            <View key={cita.id} style={styles.tarjetaCita}>
              <View style={styles.encabezadoCita}>
                <Text style={styles.nombreCita}>🐾 {cita.mascota}</Text>
                <View
                  style={[
                    styles.estado,
                    cita.estado?.toLowerCase() === 'confirmada'
                      ? styles.estadoConfirmado
                      : cita.estado?.toLowerCase() === 'cancelada'
                        ? styles.estadoCancelado
                        : cita.estado?.toLowerCase() === 'completada'
                          ? styles.estadoCompletado
                          : styles.estadoPendiente,
                  ]}
                >
                  <Text style={styles.textoEstado}>
                    {cita.estado || 'Pendiente'}
                  </Text>
                </View>
              </View>

              <Text style={styles.tipoCita}>{cita.tipo}</Text>

              <View style={styles.detallesCita}>
                <Text style={styles.detalleCita}>📅 {cita.fecha}</Text>
                <Text style={styles.detalleCita}>🕒 {cita.hora}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: '#8FBFE3',
  },
  contenido: {
    padding: 18,
    paddingBottom: 35,
  },
  titulo: {
    fontSize: 25,
    fontWeight: '800',
    color: '#112250',
  },
  subtitulo: {
    fontSize: 14,
    lineHeight: 21,
    color: '#30466A',
    marginTop: 6,
    marginBottom: 20,
  },
  tarjeta: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 26,
  },
  tituloTarjeta: {
    fontSize: 20,
    fontWeight: '800',
    color: '#112250',
    marginBottom: 20,
  },
  etiqueta: {
    fontSize: 14,
    fontWeight: '700',
    color: '#112250',
    marginTop: 16,
    marginBottom: 9,
  },
  opciones: {
    gap: 9,
  },
  opcionMascota: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#D7E1EC',
    borderRadius: 12,
    gap: 10,
  },
  opcionSeleccionada: {
    borderColor: '#112250',
    backgroundColor: '#EAF4FC',
  },
  iconoMascota: {
    fontSize: 25,
  },
  infoMascota: {
    flex: 1,
  },
  nombreMascota: {
    color: '#112250',
    fontSize: 15,
    fontWeight: '700',
  },
  detalleMascota: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 3,
  },
  marca: {
    color: '#112250',
    fontSize: 20,
    fontWeight: '800',
  },
  opcionServicio: {
    borderWidth: 1,
    borderColor: '#D7E1EC',
    borderRadius: 10,
    padding: 12,
  },
  servicioSeleccionado: {
    backgroundColor: '#112250',
    borderColor: '#112250',
  },
  textoServicio: {
    color: '#30466A',
    fontWeight: '600',
  },
  textoServicioSeleccionado: {
    color: '#FFFFFF',
  },
  input: {
    borderWidth: 1,
    borderColor: '#C8D5E4',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    color: '#112250',
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontSize: 15,
  },
  nota: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 15,
  },
  botonPrincipal: {
    backgroundColor: '#112250',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  botonDeshabilitado: {
    opacity: 0.55,
  },
  textoBotonPrincipal: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  sinMascotas: {
    backgroundColor: '#F1F7FC',
    padding: 14,
    borderRadius: 12,
  },
  textoAyuda: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 19,
  },
  botonSecundario: {
    alignSelf: 'flex-start',
    marginTop: 12,
    padding: 10,
    backgroundColor: '#DCEBFA',
    borderRadius: 9,
  },
  textoBotonSecundario: {
    color: '#112250',
    fontWeight: '700',
  },
  tituloSeccion: {
    fontSize: 21,
    fontWeight: '800',
    color: '#112250',
    marginBottom: 14,
  },
  vacio: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  iconoVacio: {
    fontSize: 35,
    marginBottom: 10,
  },
  textoVacio: {
    color: '#112250',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  tarjetaCita: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 16,
    marginBottom: 13,
  },
  encabezadoCita: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  nombreCita: {
    flex: 1,
    color: '#112250',
    fontSize: 16,
    fontWeight: '800',
  },
  estado: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  estadoPendiente: {
    backgroundColor: '#FFF0C2',
  },
  estadoConfirmado: {
    backgroundColor: '#DDF5E5',
  },
  estadoCancelado: {
    backgroundColor: '#FCE4E4',
  },
  estadoCompletado: {
    backgroundColor: '#DCEBFF',
  },
  textoEstado: {
    color: '#30466A',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  tipoCita: {
    color: '#64748B',
    fontSize: 13,
    marginTop: 9,
  },
  detallesCita: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 13,
  },
  detalleCita: {
    color: '#30466A',
    fontSize: 13,
    fontWeight: '600',
  },
  error: {
    backgroundColor: '#FCE4E4',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  textoError: {
    color: '#B42318',
    marginBottom: 8,
  },
  reintentar: {
    color: '#112250',
    fontWeight: '800',
  },
});
