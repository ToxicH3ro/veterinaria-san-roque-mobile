
import { StyleSheet, Text, View } from 'react-native';

import Button from './ui/Button';
import Card from './ui/Card';

import type { Appointment } from '../services/appointmentService';

interface AppointmentCardProps {
  cita: Appointment;
  onCambiarEstado?: (
    id: string,
    estado: string
  ) => void | Promise<void>;
}

const obtenerColoresEstado = (estado: string) => {
  switch (estado.toLowerCase()) {
    case 'pendiente':
      return { fondo: '#FFF4D6', texto: '#946200' };

    case 'confirmada':
    case 'confirmado':
      return { fondo: '#DDF5E5', texto: '#187344' };

    case 'completada':
    case 'completado':
      return { fondo: '#DCEBFF', texto: '#2459A9' };

    case 'cancelada':
    case 'cancelado':
      return { fondo: '#FCE4E4', texto: '#B42318' };

    default:
      return { fondo: '#EEEEF2', texto: '#555568' };
  }
};

export default function AppointmentCard({
  cita,
  onCambiarEstado,
}: AppointmentCardProps) {
  const estado = (cita.estado || '').toLowerCase();
  const colores = obtenerColoresEstado(estado);

  const finalizada = [
    'completada',
    'completado',
    'cancelada',
    'cancelado',
  ].includes(estado);

  const acciones = [
    { titulo: 'Confirmar', estado: 'confirmada' },
    { titulo: 'Completar', estado: 'completada' },
    { titulo: 'Cancelar', estado: 'cancelada' },
  ];

  return (
    <Card style={styles.tarjeta}>
      <View style={styles.encabezado}>
        <View style={styles.infoMascota}>
          <Text style={styles.icono}>🐾</Text>

          <View style={styles.infoTexto}>
            <Text style={styles.mascota}>
              {cita.mascota || 'Mascota sin nombre'}
            </Text>

            <Text style={styles.tipo}>
              {cita.tipo || 'Consulta veterinaria'}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.etiquetaEstado,
            { backgroundColor: colores.fondo },
          ]}
        >
          <Text
            style={[
              styles.textoEstado,
              { color: colores.texto },
            ]}
          >
            {cita.estado || 'Sin estado'}
          </Text>
        </View>
      </View>

      <View style={styles.divisor} />

      <View style={styles.detalles}>
        <View style={styles.detalle}>
          <Text style={styles.etiqueta}>FECHA</Text>
          <Text style={styles.valor}>
            {cita.fecha || 'Sin fecha'}
          </Text>
        </View>

        <View style={styles.detalle}>
          <Text style={styles.etiqueta}>HORA</Text>
          <Text style={styles.valor}>
            {cita.hora || 'Sin hora'}
          </Text>
        </View>
      </View>

      <Text style={styles.cliente}>
        Cliente: {cita.usuarioID || 'No disponible'}
      </Text>

      {onCambiarEstado && !finalizada && (
        <View style={styles.acciones}>
          {acciones
            .filter((accion) => accion.estado !== estado)
            .map((accion) => (
              <View
                key={accion.estado}
                style={styles.boton}
              >
                <Button
                  title={accion.titulo}
                  onPress={() =>
                    onCambiarEstado(cita.id, accion.estado)
                  }
                />
              </View>
            ))}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  tarjeta: {
    marginBottom: 14,
  },
  encabezado: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  infoMascota: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  icono: {
    fontSize: 28,
  },
  infoTexto: {
    flex: 1,
    gap: 4,
  },
  mascota: {
    fontSize: 17,
    fontWeight: '700',
    color: '#112250',
  },
  tipo: {
    fontSize: 13,
    color: '#64748B',
  },
  etiquetaEstado: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  textoEstado: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  divisor: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 14,
  },
  detalles: {
    flexDirection: 'row',
    gap: 20,
  },
  detalle: {
    flex: 1,
    gap: 5,
  },
  etiqueta: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  valor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  cliente: {
    marginTop: 14,
    fontSize: 12,
    color: '#64748B',
  },
  acciones: {
    marginTop: 14,
    gap: 8,
  },
  boton: {
    width: '100%',
  },
});
