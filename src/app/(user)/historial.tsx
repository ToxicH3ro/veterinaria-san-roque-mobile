import { useFocusEffect } from 'expo-router';
import {
    collection,
    getDocs,
    query,
    Timestamp,
    where,
} from 'firebase/firestore';
import { useCallback, useMemo, useState } from 'react';
import {
    Alert,
    FlatList,
    Modal,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

import Header from '@/components/Header';
import Loading from '@/components/ui/Loading';
import { auth, db } from '@/lib/firebase';

type ItemHistorial = {
  nombre: string;
  tipo?: 'producto' | 'servicio' | string;
};

type FacturaHistorial = {
  id: string;
  creadoEn: Timestamp | Date | null;
  items: ItemHistorial[];
};

type MesFiltro = {
  clave: string;
  etiqueta: string;
};

const obtenerFecha = (
  fecha: FacturaHistorial['creadoEn']
): Date | null => {
  if (fecha instanceof Timestamp) {
    return fecha.toDate();
  }

  if (fecha instanceof Date && !Number.isNaN(fecha.getTime())) {
    return fecha;
  }

  return null;
};

const claveMes = (fecha: Date) =>
  `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;

const etiquetaMes = (fecha: Date) =>
  fecha.toLocaleDateString('es-SV', {
    month: 'long',
    year: 'numeric',
  });

const formatoFecha = (fecha: Date) =>
  fecha.toLocaleDateString('es-SV', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

const formatoHora = (fecha: Date) =>
  fecha.toLocaleTimeString('es-SV', {
    hour: '2-digit',
    minute: '2-digit',
  });

export default function HistorialUsuario() {
  const [facturas, setFacturas] = useState<FacturaHistorial[]>([]);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [mesSeleccionado, setMesSeleccionado] = useState('todos');
  const [modalMes, setModalMes] = useState(false);

  const cargarHistorial = useCallback(async (refrescar = false) => {
    const usuario = auth.currentUser;

    if (!usuario) {
      setFacturas([]);
      setCargando(false);
      return;
    }

    try {
      if (refrescar) {
        setActualizando(true);
      } else {
        setCargando(true);
      }

      const consulta = query(
        collection(db, 'facturas'),
        where('usuarioID', '==', usuario.uid)
      );

      const resultado = await getDocs(consulta);

      const registros: FacturaHistorial[] = resultado.docs.map((documento) => {
        const datos = documento.data();

        const items: ItemHistorial[] = Array.isArray(datos.items)
          ? datos.items
              .filter(
                (item: unknown): item is Record<string, unknown> =>
                  typeof item === 'object' && item !== null
              )
              .map((item) => ({
                nombre:
                  typeof item.nombre === 'string'
                    ? item.nombre
                    : 'Artículo sin nombre',
                tipo:
                  typeof item.tipo === 'string' ? item.tipo : undefined,
              }))
          : [];

        return {
          id: documento.id,
          creadoEn:
            datos.creadoEn instanceof Timestamp ||
            datos.creadoEn instanceof Date
              ? datos.creadoEn
              : null,
          items,
        };
      });

      registros.sort((a, b) => {
        const fechaA = obtenerFecha(a.creadoEn)?.getTime() ?? 0;
        const fechaB = obtenerFecha(b.creadoEn)?.getTime() ?? 0;

        return fechaB - fechaA;
      });

      setFacturas(registros);
    } catch (error) {
      console.error('Error al cargar historial:', error);

      Alert.alert(
        'Error',
        'No se pudo cargar tu historial. Verifica tu conexión y los permisos de Firestore.'
      );
    } finally {
      setCargando(false);
      setActualizando(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void cargarHistorial();
    }, [cargarHistorial])
  );

  const mesesDisponibles = useMemo<MesFiltro[]>(() => {
    const meses = new Map<string, string>();

    facturas.forEach((factura) => {
      const fecha = obtenerFecha(factura.creadoEn);

      if (fecha) {
        meses.set(claveMes(fecha), etiquetaMes(fecha));
      }
    });

    return Array.from(meses.entries())
      .map(([clave, etiqueta]) => ({ clave, etiqueta }))
      .sort((a, b) => b.clave.localeCompare(a.clave));
  }, [facturas]);

  const historialFiltrado = useMemo(() => {
    if (mesSeleccionado === 'todos') {
      return facturas;
    }

    return facturas.filter((factura) => {
      const fecha = obtenerFecha(factura.creadoEn);

      return fecha !== null && claveMes(fecha) === mesSeleccionado;
    });
  }, [facturas, mesSeleccionado]);

  const nombreMesSeleccionado =
    mesSeleccionado === 'todos'
      ? 'Todos los meses'
      : mesesDisponibles.find((mes) => mes.clave === mesSeleccionado)
          ?.etiqueta ?? 'Seleccionar mes';

  if (cargando) {
    return <Loading text="Cargando historial..." />;
  }

  return (
    <View style={styles.container}>
      <Header title="Mi historial" />

      <View style={styles.contenido}>
        <View style={styles.encabezado}>
          <Text style={styles.titulo}>Historial de servicios</Text>
          <Text style={styles.descripcion}>
            Consulta los servicios y productos registrados en tu cuenta.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.filtro}
          activeOpacity={0.8}
          onPress={() => setModalMes(true)}
        >
          <View>
            <Text style={styles.filtroEtiqueta}>Filtrar por mes</Text>
            <Text style={styles.filtroValor}>
              {nombreMesSeleccionado}
            </Text>
          </View>

          <Text style={styles.flecha}>⌄</Text>
        </TouchableOpacity>

        <FlatList
          data={historialFiltrado}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={actualizando}
              onRefresh={() => void cargarHistorial(true)}
              tintColor="#112250"
              colors={['#112250']}
            />
          }
          contentContainerStyle={[
            styles.lista,
            historialFiltrado.length === 0 && styles.listaVacia,
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.vacio}>
              <Text style={styles.iconoVacio}>📋</Text>
              <Text style={styles.vacioTitulo}>
                {facturas.length === 0
                  ? 'Tu historial está vacío'
                  : 'No hay registros este mes'}
              </Text>
              <Text style={styles.vacioDescripcion}>
                {facturas.length === 0
                  ? 'Cuando se registren facturas a tu nombre, sus servicios y productos aparecerán aquí.'
                  : 'Prueba seleccionando otro mes o consulta todos los meses.'}
              </Text>
            </View>
          }
          renderItem={({ item, index }) => {
            const fecha = obtenerFecha(item.creadoEn);

            return (
              <View style={styles.filaTiempo}>
                <View style={styles.lineaTiempo}>
                  <View style={styles.punto} />
                  {index < historialFiltrado.length - 1 && (
                    <View style={styles.linea} />
                  )}
                </View>

                <View style={styles.tarjeta}>
                  <Text style={styles.fecha}>
                    {fecha ? formatoFecha(fecha) : 'Fecha no disponible'}
                  </Text>

                  {fecha && (
                    <Text style={styles.hora}>
                      Registrado a las {formatoHora(fecha)}
                    </Text>
                  )}

                  <View style={styles.separador} />

                  <Text style={styles.subtitulo}>
                    Servicios y productos
                  </Text>

                  {item.items.length > 0 ? (
                    item.items.map((articulo, indice) => (
                      <View
                        key={`${item.id}-${indice}`}
                        style={styles.articulo}
                      >
                        <View style={styles.iconoArticulo}>
                          <Text style={styles.iconoArticuloTexto}>
                            {articulo.tipo === 'servicio' ? '✚' : '•'}
                          </Text>
                        </View>

                        <View style={styles.articuloContenido}>
                          <Text style={styles.nombreArticulo}>
                            {articulo.nombre}
                          </Text>
                          {articulo.tipo && (
                            <Text style={styles.tipoArticulo}>
                              {articulo.tipo === 'servicio'
                                ? 'Servicio'
                                : articulo.tipo === 'producto'
                                  ? 'Producto'
                                  : articulo.tipo}
                            </Text>
                          )}
                        </View>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.sinArticulos}>
                      No hay artículos registrados en esta factura.
                    </Text>
                  )}
                </View>
              </View>
            );
          }}
          ListFooterComponent={
            historialFiltrado.length > 0 ? (
              <Text style={styles.finHistorial}>
                Fin del historial
              </Text>
            ) : null
          }
        />
      </View>

      <Modal
        visible={modalMes}
        transparent
        animationType="fade"
        onRequestClose={() => setModalMes(false)}
      >
        <View style={styles.fondoModal}>
          <View style={styles.modal}>
            <Text style={styles.modalTitulo}>Filtrar historial</Text>

            <TouchableOpacity
              style={[
                styles.opcionMes,
                mesSeleccionado === 'todos' && styles.opcionSeleccionada,
              ]}
              onPress={() => {
                setMesSeleccionado('todos');
                setModalMes(false);
              }}
            >
              <Text
                style={[
                  styles.textoOpcion,
                  mesSeleccionado === 'todos' &&
                    styles.textoOpcionSeleccionada,
                ]}
              >
                Todos los meses
              </Text>
              {mesSeleccionado === 'todos' && (
                <Text style={styles.check}>✓</Text>
              )}
            </TouchableOpacity>

            {mesesDisponibles.map((mes) => {
              const seleccionado = mesSeleccionado === mes.clave;

              return (
                <TouchableOpacity
                  key={mes.clave}
                  style={[
                    styles.opcionMes,
                    seleccionado && styles.opcionSeleccionada,
                  ]}
                  onPress={() => {
                    setMesSeleccionado(mes.clave);
                    setModalMes(false);
                  }}
                >
                  <Text
                    style={[
                      styles.textoOpcion,
                      seleccionado && styles.textoOpcionSeleccionada,
                    ]}
                  >
                    {mes.etiqueta}
                  </Text>
                  {seleccionado && (
                    <Text style={styles.check}>✓</Text>
                  )}
                </TouchableOpacity>
              );
            })}

            {mesesDisponibles.length === 0 && (
              <Text style={styles.sinMeses}>
                Todavía no hay meses con registros.
              </Text>
            )}

            <TouchableOpacity
              style={styles.botonCerrar}
              onPress={() => setModalMes(false)}
            >
              <Text style={styles.textoBotonCerrar}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
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
  },
  encabezado: {
    paddingTop: 20,
    paddingBottom: 16,
  },
  titulo: {
    color: '#112250',
    fontSize: 23,
    fontWeight: 'bold',
  },
  descripcion: {
    color: '#445675',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  filtro: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 15,
    marginBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 2,
  },
  filtroEtiqueta: {
    color: '#667085',
    fontSize: 12,
    marginBottom: 4,
  },
  filtroValor: {
    color: '#112250',
    fontSize: 16,
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  flecha: {
    color: '#112250',
    fontSize: 25,
  },
  lista: {
    paddingBottom: 28,
  },
  listaVacia: {
    flexGrow: 1,
  },
  filaTiempo: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  lineaTiempo: {
    width: 28,
    alignItems: 'center',
  },
  punto: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#112250',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    marginTop: 22,
    zIndex: 1,
  },
  linea: {
    position: 'absolute',
    top: 32,
    bottom: -1,
    width: 2,
    backgroundColor: '#FFFFFF',
  },
  tarjeta: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  fecha: {
    color: '#112250',
    fontSize: 16,
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  hora: {
    color: '#667085',
    fontSize: 12,
    marginTop: 4,
  },
  separador: {
    height: 1,
    backgroundColor: '#E7ECF3',
    marginVertical: 13,
  },
  subtitulo: {
    color: '#667085',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 10,
  },
  articulo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 7,
  },
  iconoArticulo: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#EAF2FB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  iconoArticuloTexto: {
    color: '#112250',
    fontSize: 18,
    fontWeight: 'bold',
  },
  articuloContenido: {
    flex: 1,
  },
  nombreArticulo: {
    color: '#112250',
    fontSize: 14,
    fontWeight: '600',
  },
  tipoArticulo: {
    color: '#667085',
    fontSize: 12,
    marginTop: 3,
    textTransform: 'capitalize',
  },
  sinArticulos: {
    color: '#667085',
    fontSize: 13,
  },
  vacio: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 50,
  },
  iconoVacio: {
    fontSize: 42,
    marginBottom: 14,
  },
  vacioTitulo: {
    color: '#112250',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  vacioDescripcion: {
    color: '#445675',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 8,
  },
  finHistorial: {
    textAlign: 'center',
    color: '#445675',
    fontSize: 12,
    marginTop: 4,
    marginBottom: 12,
  },
  fondoModal: {
    flex: 1,
    backgroundColor: 'rgba(17, 34, 80, 0.45)',
    justifyContent: 'center',
    padding: 22,
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitulo: {
    color: '#112250',
    fontSize: 19,
    fontWeight: 'bold',
    marginBottom: 14,
  },
  opcionMes: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  opcionSeleccionada: {
    backgroundColor: '#EAF2FB',
  },
  textoOpcion: {
    color: '#344054',
    fontSize: 15,
    textTransform: 'capitalize',
  },
  textoOpcionSeleccionada: {
    color: '#112250',
    fontWeight: 'bold',
  },
  check: {
    color: '#112250',
    fontSize: 17,
    fontWeight: 'bold',
  },
  sinMeses: {
    color: '#667085',
    fontSize: 13,
    paddingVertical: 14,
  },
  botonCerrar: {
    alignItems: 'center',
    paddingVertical: 13,
    marginTop: 10,
    borderRadius: 10,
    backgroundColor: '#112250',
  },
  textoBotonCerrar: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
});
