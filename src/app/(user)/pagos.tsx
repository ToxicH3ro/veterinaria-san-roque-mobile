import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import { auth } from '@/lib/firebase';

import {
    obtenerFacturasDeUsuario,
    type Factura,
} from '@/services/facturacionService';

import {
    obtenerPagosDeUsuario,
    solicitarPago,
    type Pago,
} from '@/services/paymentservice';

type MetodoPago = 'Tarjeta Bancaria' | 'Transferencia Bancaria';

const METODOS: MetodoPago[] = [
  'Tarjeta Bancaria',
  'Transferencia Bancaria',
];

const dinero = (cantidad: number) => `$${cantidad.toFixed(2)}`;

const fechaTexto = (fecha: unknown): string => {
  if (!fecha) return 'Sin fecha';

  try {
    let fechaReal: Date | null = null;

    if (fecha instanceof Date) {
      fechaReal = fecha;
    } else if (
      typeof fecha === 'string' ||
      typeof fecha === 'number'
    ) {
      fechaReal = new Date(fecha);
    } else if (
      typeof fecha === 'object' &&
      fecha !== null &&
      'toDate' in fecha &&
      typeof fecha.toDate === 'function'
    ) {
      fechaReal = fecha.toDate();
    }

    if (!fechaReal || Number.isNaN(fechaReal.getTime())) {
      return 'Sin fecha';
    }

    return fechaReal.toLocaleDateString();
  } catch {
    return 'Sin fecha';
  }
};

const estadoPagoTexto = (estado: Pago['estado']) => {
  switch (estado) {
    case 'confirmado':
      return 'Pago confirmado';
    case 'rechazado':
      return 'Pago rechazado';
    default:
      return 'Pendiente de verificación';
  }
};

const estadoFacturaTexto = (estado: Factura['estado']) => {
  switch (estado) {
    case 'pagada':
      return 'Pagada';
    case 'atrasada':
      return 'Atrasada';
    default:
      return 'Pendiente';
  }
};

export default function PagosScreen() {
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);

  const [facturaSeleccionada, setFacturaSeleccionada] =
    useState<Factura | null>(null);

  const [metodoSeleccionado, setMetodoSeleccionado] =
    useState<MetodoPago>('Tarjeta Bancaria');

  const [modalPago, setModalPago] = useState(false);
  const [enviandoPago, setEnviandoPago] = useState(false);

  const cargarDatos = useCallback(async (mostrarCarga = true) => {
    if (!auth.currentUser) {
      setFacturas([]);
      setPagos([]);
      setCargando(false);

      Alert.alert(
        'Sesión no disponible',
        'Inicia sesión para consultar tus facturas y pagos.'
      );
      return;
    }

    try {
      if (mostrarCarga) setCargando(true);
      else setActualizando(true);

      // Ambas consultas corresponden exclusivamente al usuario autenticado.
      const [misFacturas, misPagos] = await Promise.all([
        obtenerFacturasDeUsuario(),
        obtenerPagosDeUsuario(),
      ]);

      setFacturas(misFacturas);
      setPagos(misPagos);
    } catch (error) {
      console.error('Error al cargar mis pagos:', error);

      Alert.alert(
        'Error',
        'No se pudieron cargar tus facturas o pagos. Intenta nuevamente.'
      );
    } finally {
      setCargando(false);
      setActualizando(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargarDatos();
    }, [cargarDatos])
  );

  const pagosDeFactura = (facturaID: string) =>
    pagos
      .filter((pago) => pago.facturaID === facturaID)
      .sort((a, b) => {
        const fechaA =
          typeof a.creadoEn === 'object' &&
          a.creadoEn !== null &&
          'toMillis' in a.creadoEn &&
          typeof a.creadoEn.toMillis === 'function'
            ? a.creadoEn.toMillis()
            : 0;

        const fechaB =
          typeof b.creadoEn === 'object' &&
          b.creadoEn !== null &&
          'toMillis' in b.creadoEn &&
          typeof b.creadoEn.toMillis === 'function'
            ? b.creadoEn.toMillis()
            : 0;

        return fechaB - fechaA;
      });

  const ultimoPago = (facturaID: string) =>
    pagosDeFactura(facturaID)[0];

  const abrirPago = (factura: Factura) => {
    if (!['pendiente', 'atrasada'].includes(factura.estado)) {
      Alert.alert(
        'Factura no disponible',
        'Esta factura no admite una nueva solicitud de pago.'
      );
      return;
    }

    const pago = ultimoPago(factura.id);

    if (pago?.estado === 'pendiente_verificacion') {
      Alert.alert(
        'Pago en revisión',
        'Ya tienes un pago solicitado para esta factura. Espera a que el veterinario lo verifique.'
      );
      return;
    }

    setFacturaSeleccionada(factura);
    setMetodoSeleccionado('Tarjeta Bancaria');
    setModalPago(true);
  };

  const confirmarSolicitud = () => {
    if (!facturaSeleccionada) return;

    Alert.alert(
      'Confirmar pago',
      `Factura: ${facturaSeleccionada.numero}\nMonto: ${dinero(facturaSeleccionada.total)}\nMétodo: ${metodoSeleccionado}\n\n¿Deseas continuar?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Solicitar pago',
          onPress: async () => {
            try {
              setEnviandoPago(true);

              await solicitarPago(
                facturaSeleccionada.id,
                metodoSeleccionado
              );

              setModalPago(false);
              setFacturaSeleccionada(null);

              await cargarDatos(false);

              Alert.alert(
                'Solicitud enviada',
                'Tu pago quedó pendiente de verificación. La factura no se marcará como pagada hasta que el veterinario confirme el pago.'
              );
            } catch (error) {
              console.error('Error al solicitar pago:', error);

              Alert.alert(
                'No se pudo solicitar el pago',
                error instanceof Error
                  ? error.message
                  : 'Ocurrió un error al registrar tu solicitud.'
              );
            } finally {
              setEnviandoPago(false);
            }
          },
        },
      ]
    );
  };

  if (cargando) {
    return (
      <View style={styles.cargando}>
        <ActivityIndicator size="large" color="#112250" />
        <Text style={styles.textoCargando}>
          Cargando tus facturas...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.contenedor}>
      <ScrollView
        contentContainerStyle={styles.contenido}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.titulo}>Mis pagos</Text>
        <Text style={styles.subtitulo}>
          Consulta tus facturas y administra tus solicitudes de pago.
        </Text>

        <View style={styles.resumen}>
          <View style={styles.resumenTarjeta}>
            <Text style={styles.resumenEtiqueta}>Mis facturas</Text>
            <Text style={styles.resumenNumero}>{facturas.length}</Text>
          </View>

          <View style={styles.resumenTarjeta}>
            <Text style={styles.resumenEtiqueta}>Pendientes</Text>
            <Text style={styles.resumenNumero}>
              {
                facturas.filter(
                  (factura) =>
                    factura.estado === 'pendiente' ||
                    factura.estado === 'atrasada'
                ).length
              }
            </Text>
          </View>
        </View>

        <View style={styles.filaTitulo}>
          <Text style={styles.tituloSeccion}>Mis facturas</Text>

          <TouchableOpacity
            onPress={() => cargarDatos(false)}
            disabled={actualizando}
          >
            <Text style={styles.actualizarTexto}>
              {actualizando ? 'Actualizando...' : 'Actualizar'}
            </Text>
          </TouchableOpacity>
        </View>

        {facturas.length === 0 ? (
          <View style={styles.vacio}>
            <Text style={styles.vacioTitulo}>
              Todavía no tienes facturas
            </Text>
            <Text style={styles.vacioTexto}>
              Cuando la veterinaria genere una factura a tu nombre,
              aparecerá aquí.
            </Text>
          </View>
        ) : (
          facturas.map((factura) => {
            const pago = ultimoPago(factura.id);
            const tienePagoPendiente =
              pago?.estado === 'pendiente_verificacion';

            const facturaPagada = factura.estado === 'pagada';

            const puedeSolicitarPago =
              ['pendiente', 'atrasada'].includes(factura.estado) &&
              !tienePagoPendiente;

            return (
              <View key={factura.id} style={styles.facturaCard}>
                <View style={styles.filaTitulo}>
                  <Text style={styles.numeroFactura}>
                    {factura.numero}
                  </Text>

                  <Text
                    style={[
                      styles.estadoFactura,
                      facturaPagada
                        ? styles.estadoVerde
                        : factura.estado === 'atrasada'
                          ? styles.estadoRojo
                          : styles.estadoAmarillo,
                    ]}
                  >
                    {estadoFacturaTexto(factura.estado)}
                  </Text>
                </View>

                <Text style={styles.cliente}>
                  {factura.Cliente}
                </Text>

                <Text style={styles.detalle}>
                  Fecha: {fechaTexto(factura.fecha)}
                </Text>

                <Text style={styles.detalle}>
                  Artículos: {factura.items?.length ?? 0}
                </Text>

                <View style={styles.divisor} />

                <View style={styles.filaTitulo}>
                  <Text style={styles.totalEtiqueta}>Total</Text>
                  <Text style={styles.totalMonto}>
                    {dinero(Number(factura.total) || 0)}
                  </Text>
                </View>

                {facturaPagada ? (
                  <View style={styles.mensajePagado}>
                    <Text style={styles.mensajePagadoTexto}>
                      ✓ Esta factura ya está pagada.
                    </Text>
                  </View>
                ) : tienePagoPendiente ? (
                  <View style={styles.mensajePendiente}>
                    <Text style={styles.mensajePendienteTitulo}>
                      Pago pendiente de verificación
                    </Text>
                    <Text style={styles.mensajePendienteTexto}>
                      Método: {pago.metodo}
                    </Text>
                    <Text style={styles.mensajePendienteTexto}>
                      Enviado: {fechaTexto(pago.creadoEn)}
                    </Text>
                  </View>
                ) : pago?.estado === 'rechazado' ? (
                  <View style={styles.mensajeRechazado}>
                    <Text style={styles.mensajeRechazadoTexto}>
                      Tu solicitud anterior fue rechazada. Puedes volver
                      a solicitar el pago.
                    </Text>
                  </View>
                ) : null}

                {puedeSolicitarPago && (
                  <TouchableOpacity
                    style={styles.botonPagar}
                    onPress={() => abrirPago(factura)}
                  >
                    <Text style={styles.textoBotonPagar}>
                      Realizar Pago
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        )}

        <Text style={styles.tituloSeccion}>
          Historial de solicitudes
        </Text>

        {pagos.length === 0 ? (
          <Text style={styles.sinPagos}>
            Todavía no has solicitado ningún pago.
          </Text>
        ) : (
          pagos.map((pago) => (
            <View key={pago.id} style={styles.pagoCard}>
              <View style={styles.filaTitulo}>
                <Text style={styles.pagoMetodo}>{pago.metodo}</Text>
                <Text
                  style={[
                    styles.estadoPago,
                    pago.estado === 'confirmado'
                      ? styles.estadoVerde
                      : pago.estado === 'rechazado'
                        ? styles.estadoRojo
                        : styles.estadoAmarillo,
                  ]}
                >
                  {estadoPagoTexto(pago.estado)}
                </Text>
              </View>

              <Text style={styles.detalle}>
                Factura: {facturas.find((f) => f.id === pago.facturaID)?.numero ?? 'No disponible'}
              </Text>

              <Text style={styles.detalle}>
                Fecha: {fechaTexto(pago.creadoEn)}
              </Text>

              <Text style={styles.totalMonto}>
                {dinero(Number(pago.monto) || 0)}
              </Text>
            </View>
          ))
        )}
      </ScrollView>

      <Modal
        visible={modalPago}
        animationType="slide"
        onRequestClose={() => {
          if (!enviandoPago) setModalPago(false);
        }}
      >
        <View style={styles.modalPantalla}>
          <View style={styles.modalEncabezado}>
            <Text style={styles.modalTitulo}>
              Pago de factura
            </Text>

            <TouchableOpacity
              disabled={enviandoPago}
              onPress={() => setModalPago(false)}
            >
              <Text style={styles.cerrar}>Cerrar</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalContenido}>
            {facturaSeleccionada && (
              <>
                <Text style={styles.detalle}>
                  Factura: {facturaSeleccionada.numero}
                </Text>

                <Text style={styles.modalTotal}>
                  {dinero(Number(facturaSeleccionada.total) || 0)}
                </Text>

                <Text style={styles.tituloSeccion}>
                  Selecciona un método
                </Text>

                {METODOS.map((metodo) => (
                  <TouchableOpacity
                    key={metodo}
                    style={[
                      styles.metodoOpcion,
                      metodoSeleccionado === metodo &&
                        styles.metodoOpcionActivo,
                    ]}
                    onPress={() => setMetodoSeleccionado(metodo)}
                  >
                    <View style={styles.radioExterior}>
                      {metodoSeleccionado === metodo && (
                        <View style={styles.radioInterior} />
                      )}
                    </View>

                    <View style={styles.metodoTextoContenedor}>
                      <Text style={styles.metodoTitulo}>
                        {metodo}
                      </Text>
                      <Text style={styles.metodoDescripcion}>
                        {metodo === 'Tarjeta Bancaria'
                          ? 'Metodo de Pago directo.'
                          : 'Metodo de Pago Rapido.'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}

                <View style={styles.aviso}>
                  <Text style={styles.avisoTitulo}>
                    Importante
                  </Text>
                  <Text style={styles.avisoTexto}>
                    Al continuar, se registrará una solicitud. El pago no
                    se confirmará automáticamente y la factura seguirá
                    pendiente hasta la revisión del veterinario.
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.botonPagar,
                    enviandoPago && styles.botonDeshabilitado,
                  ]}
                  disabled={enviandoPago}
                  onPress={confirmarSolicitud}
                >
                  {enviandoPago ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.textoBotonPagar}>
                      Confirmar solicitud
                    </Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>
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
    paddingBottom: 40,
  },
  cargando: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F6FA',
  },
  textoCargando: {
    marginTop: 12,
    color: '#112250',
  },
  titulo: {
    fontSize: 29,
    fontWeight: '800',
    color: '#112250',
  },
  subtitulo: {
    color: '#687386',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 5,
    marginBottom: 18,
  },
  aviso: {
    backgroundColor: '#FFF3E8',
    borderColor: '#F5D1B7',
    borderWidth: 1,
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  avisoTitulo: {
    color: '#9B4A18',
    fontWeight: '800',
    marginBottom: 5,
  },
  avisoTexto: {
    color: '#794C32',
    fontSize: 13,
    lineHeight: 20,
  },
  resumen: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 22,
  },
  resumenTarjeta: {
    flex: 1,
    padding: 15,
    backgroundColor: '#FFFFFF',
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#E1E6EF',
  },
  resumenEtiqueta: {
    color: '#687386',
    fontSize: 13,
  },
  resumenNumero: {
    color: '#112250',
    fontWeight: '900',
    fontSize: 25,
    marginTop: 6,
  },
  filaTitulo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  tituloSeccion: {
    fontSize: 19,
    fontWeight: '800',
    color: '#112250',
    marginBottom: 13,
    marginTop: 5,
  },
  actualizarTexto: {
    color: '#E57A3A',
    fontWeight: '800',
    fontSize: 13,
  },
  facturaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E1E6EF',
    padding: 16,
    marginBottom: 14,
  },
  numeroFactura: {
    color: '#112250',
    fontSize: 16,
    fontWeight: '900',
    flexShrink: 1,
  },
  estadoFactura: {
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 20,
    overflow: 'hidden',
  },
  estadoPago: {
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'right',
    flexShrink: 1,
  },
  estadoVerde: {
    color: '#218838',
    backgroundColor: '#E4F5E8',
  },
  estadoAmarillo: {
    color: '#986900',
    backgroundColor: '#FFF3C4',
  },
  estadoRojo: {
    color: '#C0392B',
    backgroundColor: '#FCE8E6',
  },
  cliente: {
    color: '#273449',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 11,
  },
  detalle: {
    color: '#687386',
    fontSize: 12,
    marginTop: 6,
    lineHeight: 18,
  },
  divisor: {
    height: 1,
    backgroundColor: '#E5E9F0',
    marginVertical: 13,
  },
  totalEtiqueta: {
    color: '#273449',
    fontWeight: '700',
    fontSize: 15,
  },
  totalMonto: {
    color: '#112250',
    fontSize: 19,
    fontWeight: '900',
    marginTop: 8,
  },
  botonPagar: {
    backgroundColor: '#112250',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
  },
  textoBotonPagar: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  botonDeshabilitado: {
    opacity: 0.65,
  },
  mensajePagado: {
    marginTop: 13,
    padding: 11,
    borderRadius: 9,
    backgroundColor: '#E4F5E8',
  },
  mensajePagadoTexto: {
    color: '#218838',
    fontWeight: '700',
    fontSize: 13,
  },
  mensajePendiente: {
    marginTop: 13,
    padding: 12,
    borderRadius: 9,
    backgroundColor: '#FFF3C4',
  },
  mensajePendienteTitulo: {
    color: '#805B00',
    fontWeight: '800',
    fontSize: 13,
  },
  mensajePendienteTexto: {
    color: '#805B00',
    fontSize: 12,
    marginTop: 5,
  },
  mensajeRechazado: {
    marginTop: 13,
    padding: 11,
    borderRadius: 9,
    backgroundColor: '#FCE8E6',
  },
  mensajeRechazadoTexto: {
    color: '#C0392B',
    fontSize: 12,
    lineHeight: 18,
  },
  vacio: {
    backgroundColor: '#FFFFFF',
    padding: 22,
    borderRadius: 13,
    alignItems: 'center',
    marginBottom: 20,
  },
  vacioTitulo: {
    color: '#112250',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  vacioTexto: {
    color: '#687386',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 7,
  },
  sinPagos: {
    color: '#687386',
    backgroundColor: '#FFFFFF',
    padding: 17,
    borderRadius: 12,
    fontSize: 13,
    marginBottom: 15,
  },
  pagoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E1E6EF',
    marginBottom: 10,
  },
  pagoMetodo: {
    color: '#112250',
    fontWeight: '800',
    fontSize: 13,
    flexShrink: 1,
  },
  modalPantalla: {
    flex: 1,
    backgroundColor: '#F4F6FA',
  },
  modalEncabezado: {
    padding: 18,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E1E6EF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  modalTitulo: {
    color: '#112250',
    fontSize: 22,
    fontWeight: '900',
    flexShrink: 1,
  },
  cerrar: {
    color: '#E57A3A',
    fontWeight: '800',
  },
  modalContenido: {
    padding: 18,
    paddingBottom: 40,
  },
  modalTotal: {
    color: '#112250',
    fontSize: 34,
    fontWeight: '900',
    marginTop: 9,
    marginBottom: 24,
  },
  metodoOpcion: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DCE2EC',
    padding: 15,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  metodoOpcionActivo: {
    borderColor: '#112250',
    backgroundColor: '#EDF2FB',
  },
  radioExterior: {
    width: 21,
    height: 21,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#112250',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  radioInterior: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#112250',
  },
  metodoTextoContenedor: {
    flex: 1,
  },
  metodoTitulo: {
    color: '#112250',
    fontWeight: '800',
    fontSize: 14,
  },
  metodoDescripcion: {
    color: '#687386',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
  },
});
