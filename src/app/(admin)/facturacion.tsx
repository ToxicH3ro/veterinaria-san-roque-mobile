import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

import {
    crearFacturaConInventario,
    obtenerFacturas,
    type Factura,
    type ItemFacturaInput,
    type TipoItemFactura,
} from '@/services/facturacionService';

import {
    obtenerPagos,
    procesarPago,
    type Pago,
} from '@/services/paymentservice';

import {
    obtenerClientes,
    type Cliente as ClienteUsuario,
} from '@/services/userService';

import {
    obtenerProductos,
    type ProductoInventario,
} from '@/services/inventarioService';

const SERVICIOS = [
  'Consulta General',
  'Vacunación',
  'Revisión',
  'Desparasitación',
  'Emergencia',
];

type ArticuloFormulario = {
  tipo: TipoItemFactura;
  nombre: string;
  productoID: string;
  cantidad: string;
  precio: string;
};

type FiltroFactura = 'todas' | 'pendiente' | 'pagada' | 'atrasada';

const articuloVacio = (): ArticuloFormulario => ({
  tipo: 'servicio',
  nombre: SERVICIOS[0],
  productoID: '',
  cantidad: '1',
  precio: '',
});

const dinero = (valor: number) =>
  `$${valor.toFixed(2)}`;

const fechaTexto = (fecha: Factura['fecha']) => {
  if (!fecha) return 'Sin fecha';

  try {
    const date =
      typeof fecha === 'string'
        ? new Date(fecha)
        : fecha instanceof Date
          ? fecha
          : 'toDate' in fecha && typeof fecha.toDate === 'function'
            ? fecha.toDate()
            : null;

    if (!date || Number.isNaN(date.getTime())) return 'Sin fecha';

    return date.toLocaleDateString();
  } catch {
    return 'Sin fecha';
  }
};

const nombreCompleto = (cliente: ClienteUsuario) =>
  `${cliente.nombre} ${cliente.apellido}`.trim();

export default function FacturacionScreen() {
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [clientes, setClientes] = useState<ClienteUsuario[]>([]);
  const [productos, setProductos] = useState<ProductoInventario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState<FiltroFactura>('todas');
  const [modalCrear, setModalCrear] = useState(false);
  const [modalClientes, setModalClientes] = useState(false);
  const [modalProductos, setModalProductos] = useState(false);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [procesandoPago, setProcesandoPago] = useState<string | null>(null);
  const [facturaDetalle, setFacturaDetalle] = useState<Factura | null>(null);

  const [clienteSeleccionado, setClienteSeleccionado] =
    useState<ClienteUsuario | null>(null);

  const [articulos, setArticulos] = useState<ArticuloFormulario[]>([
    articuloVacio(),
  ]);

  const [indiceArticulo, setIndiceArticulo] = useState<number | null>(null);
  const [busquedaCliente, setBusquedaCliente] = useState('');

  const cargarDatos = useCallback(async () => {
    try {
      setCargando(true);

      const [
        listaFacturas,
        listaClientes,
        listaProductos,
        listaPagos,
        ] = await Promise.all([
        obtenerFacturas(),
        obtenerClientes(),
        obtenerProductos(),
        obtenerPagos(),
    ]);
        setFacturas(listaFacturas);
        setClientes(listaClientes);
        setProductos(listaProductos);
        setPagos(listaPagos);
    } catch (error) {
      console.error('Error al cargar facturación:', error);

      Alert.alert(
        'Error',
        'No se pudo cargar la información de facturación. Verifica tu sesión y los permisos de Firebase.'
      );
    } finally {
      setCargando(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargarDatos();
    }, [cargarDatos])
  );

  const facturasFiltradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return facturas.filter((factura) => {
      const coincideTexto =
        !texto ||
        (factura.Cliente ?? '').toLowerCase().includes(texto) ||
        (factura.numero ?? '').toLowerCase().includes(texto);

      const coincideEstado =
        filtro === 'todas' || factura.estado === filtro;

      return coincideTexto && coincideEstado;
    });
  }, [facturas, busqueda, filtro]);

  const totalFacturado = useMemo(
    () =>
      facturas.reduce(
        (suma, factura) => suma + (Number(factura.total) || 0),
        0
      ),
    [facturas]
  );

  const facturasPagadas = facturas.filter(
    (factura) => factura.estado === 'pagada'
  ).length;

  const actualizarArticulo = (
    indice: number,
    cambios: Partial<ArticuloFormulario>
  ) => {
    setArticulos((actuales) =>
      actuales.map((articulo, i) =>
        i === indice ? { ...articulo, ...cambios } : articulo
      )
    );
  };

  const seleccionarTipo = (
    indice: number,
    tipo: TipoItemFactura
  ) => {
    actualizarArticulo(indice, {
      tipo,
      nombre: tipo === 'servicio' ? SERVICIOS[0] : '',
      productoID: '',
      precio: '',
      cantidad: '1',
    });
  };

  const seleccionarProducto = (producto: ProductoInventario) => {
    if (indiceArticulo === null) return;

    actualizarArticulo(indiceArticulo, {
      tipo: 'producto',
      nombre: producto.nombre,
      productoID: producto.id,
      precio: String(producto.precio),
    });

    setModalProductos(false);
    setIndiceArticulo(null);
  };

  const agregarArticulo = () => {
    setArticulos((actuales) => [...actuales, articuloVacio()]);
  };

  const eliminarArticulo = (indice: number) => {
    setArticulos((actuales) =>
      actuales.filter((_, i) => i !== indice)
    );
  };

  const totalFormulario = useMemo(
    () =>
      articulos.reduce((suma, articulo) => {
        const cantidad = Number(articulo.cantidad);
        const precio = Number(articulo.precio);

        if (
          Number.isFinite(cantidad) &&
          Number.isFinite(precio) &&
          cantidad > 0 &&
          precio >= 0
        ) {
          return suma + cantidad * precio;
        }

        return suma;
      }, 0),
    [articulos]
  );

  const reiniciarFormulario = () => {
    setClienteSeleccionado(null);
    setArticulos([articuloVacio()]);
    setBusquedaCliente('');
  };

  const abrirCrearFactura = () => {
    reiniciarFormulario();
    setModalCrear(true);
  };

  const guardarFactura = async () => {
    if (!clienteSeleccionado) {
      Alert.alert('Falta el cliente', 'Selecciona un cliente registrado.');
      return;
    }

    if (articulos.length === 0) {
      Alert.alert('Factura vacía', 'Agrega al menos un artículo.');
      return;
    }

    const items: ItemFacturaInput[] = [];

    for (let i = 0; i < articulos.length; i++) {
      const articulo = articulos[i];
      const cantidad = Number(articulo.cantidad);

      if (
        !Number.isInteger(cantidad) ||
        cantidad <= 0
      ) {
        Alert.alert(
          'Cantidad inválida',
          `Revisa la cantidad del artículo ${i + 1}. Debe ser un entero mayor que cero.`
        );
        return;
      }

      if (articulo.tipo === 'producto') {
        if (!articulo.productoID) {
          Alert.alert(
            'Falta el producto',
            `Selecciona el producto del artículo ${i + 1}.`
          );
          return;
        }

        items.push({
          tipo: 'producto',
          productoID: articulo.productoID,
          nombre: articulo.nombre,
          cantidad,
        });
      } else {
        const precio = Number(articulo.precio);

        if (
          !articulo.nombre.trim() ||
          articulo.nombre.trim() === '' ||
          !Number.isFinite(precio) ||
          precio < 0
        ) {
          Alert.alert(
            'Datos inválidos',
            `Revisa el servicio y su precio en el artículo ${i + 1}.`
          );
          return;
        }

        items.push({
          tipo: 'servicio',
          nombre: articulo.nombre.trim(),
          cantidad,
          precio,
        });
      }
    }

    if (totalFormulario <= 0) {
      Alert.alert(
        'Total inválido',
        'El total de la factura debe ser mayor que cero.'
      );
      return;
    }

    Alert.alert(
      'Crear factura',
      `Cliente: ${nombreCompleto(clienteSeleccionado)}\nTotal: ${dinero(totalFormulario)}\n\n¿Deseas crear esta factura?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Crear factura',
          onPress: async () => {
            try {
              setGuardando(true);

              const nuevaFactura = {
                Cliente: nombreCompleto(clienteSeleccionado),
                usuarioID: clienteSeleccionado.id,
                fecha: new Date(),
                items,
                subtotal: totalFormulario,
                total: totalFormulario,
              };

              await crearFacturaConInventario(nuevaFactura);

              setModalCrear(false);
              reiniciarFormulario();

              await cargarDatos();

              Alert.alert(
                'Factura creada',
                'La factura se creó correctamente y el inventario fue actualizado.'
              );
            } catch (error) {
              console.error('Error al crear factura:', error);

              const mensaje =
                error instanceof Error
                  ? error.message
                  : 'No se pudo crear la factura.';

              Alert.alert('No se pudo crear la factura', mensaje);
            } finally {
              setGuardando(false);
            }
          },
        },
      ]
    );
  };

  const clientesFiltrados = clientes.filter((cliente) =>
    nombreCompleto(cliente)
      .toLowerCase()
      .includes(busquedaCliente.trim().toLowerCase())
  );

  const etiquetaEstado = (estado: Factura['estado']) => {
    switch (estado) {
      case 'pagada':
        return 'Pagada';
      case 'atrasada':
        return 'Atrasada';
      default:
        return 'Pendiente';
    }
  };

  const colorEstado = (estado: Factura['estado']) => {
    switch (estado) {
      case 'pagada':
        return '#218838';
      case 'atrasada':
        return '#C0392B';
      default:
        return '#B7791F';
    }
  };

const revisarPago = (
  pago: Pago,
  decision: 'confirmado' | 'rechazado'
) => {
  const accion =
    decision === 'confirmado' ? 'confirmar' : 'rechazar';

  Alert.alert(
    decision === 'confirmado' ? 'Confirmar pago' : 'Rechazar pago',
    `Factura: ${pago.facturaID}\nMonto: ${dinero(Number(pago.monto) || 0)}\nMétodo: ${pago.metodo}\n\n¿Deseas ${accion} esta solicitud de pago?`,
    [
      {
        text: 'Cancelar',
        style: 'cancel',
      },
      {
        text: decision === 'confirmado' ? 'Confirmar' : 'Rechazar',
        style: decision === 'rechazado' ? 'destructive' : 'default',
        onPress: async () => {
          try {
            setProcesandoPago(pago.id);

            await procesarPago(pago.id, decision);

            // Recargar facturas y pagos con sus estados actualizados.
            await cargarDatos();

            // Actualizar el detalle abierto con la factura más reciente.
            if (facturaDetalle) {
              const facturasActualizadas = await obtenerFacturas();

              const actualizada = facturasActualizadas.find(
                (factura) => factura.id === facturaDetalle.id
              );

              if (actualizada) {
                setFacturaDetalle(actualizada);
              }
            }

            Alert.alert(
              decision === 'confirmado'
                ? 'Pago confirmado'
                : 'Pago rechazado',
              decision === 'confirmado'
                ? 'El pago fue confirmado y la factura ahora aparece como pagada.'
                : 'La solicitud fue rechazada. La factura conserva su estado actual.'
            );
          } catch (error) {
            console.error('Error al procesar el pago:', error);

            Alert.alert(
              'Error',
              error instanceof Error
                ? error.message
                : 'No se pudo procesar el pago.'
            );
          } finally {
            setProcesandoPago(null);
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
          Cargando facturación...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.contenedor}>
      <ScrollView
        contentContainerStyle={styles.contenido}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.encabezado}>
          <TouchableOpacity
            style={styles.botonVolver}
            onPress={() => router.back()}
          >
            <Text style={styles.textoVolver}>‹ Volver</Text>
          </TouchableOpacity>

          <Text style={styles.titulo}>Facturación</Text>
          <Text style={styles.subtitulo}>
            Administra las facturas y los servicios de la veterinaria.
          </Text>
        </View>

        <View style={styles.resumen}>
          <View style={styles.tarjetaResumen}>
            <Text style={styles.resumenEtiqueta}>Facturas</Text>
            <Text style={styles.resumenNumero}>{facturas.length}</Text>
          </View>

          <View style={styles.tarjetaResumen}>
            <Text style={styles.resumenEtiqueta}>Pagadas</Text>
            <Text style={styles.resumenNumero}>{facturasPagadas}</Text>
          </View>

          <View style={styles.tarjetaResumen}>
            <Text style={styles.resumenEtiqueta}>Total facturado</Text>
            <Text style={styles.resumenMonto}>
              {dinero(totalFacturado)}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.botonPrincipal}
          onPress={abrirCrearFactura}
        >
          <Text style={styles.textoBotonPrincipal}>
            + Crear factura
          </Text>
        </TouchableOpacity>

        <Text style={styles.tituloSeccion}>Listado de facturas</Text>

        <TextInput
          style={styles.input}
          placeholder="Buscar por cliente o número..."
          placeholderTextColor="#888"
          value={busqueda}
          onChangeText={setBusqueda}
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtros}
        >
          {(
            [
              ['todas', 'Todas'],
              ['pendiente', 'Pendientes'],
              ['pagada', 'Pagadas'],
              ['atrasada', 'Atrasadas'],
            ] as [FiltroFactura, string][]
          ).map(([valor, etiqueta]) => (
            <TouchableOpacity
              key={valor}
              style={[
                styles.filtro,
                filtro === valor && styles.filtroActivo,
              ]}
              onPress={() => setFiltro(valor)}
            >
              <Text
                style={[
                  styles.textoFiltro,
                  filtro === valor && styles.textoFiltroActivo,
                ]}
              >
                {etiqueta}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {facturasFiltradas.length === 0 ? (
          <View style={styles.vacio}>
            <Text style={styles.vacioTitulo}>
              No hay facturas para mostrar
            </Text>
            <Text style={styles.vacioTexto}>
              Prueba con otro filtro o crea una factura nueva.
            </Text>
          </View>
        ) : (
          facturasFiltradas.map((factura) => (
            <TouchableOpacity
              key={factura.id}
              style={styles.tarjetaFactura}
              onPress={() => setFacturaDetalle(factura)}
              activeOpacity={0.8}
            >
              <View style={styles.filaEntre}>
                <Text style={styles.numeroFactura}>
                  {factura.numero || 'Sin número'}
                </Text>

                <View
                  style={[
                    styles.etiquetaEstado,
                    {
                      backgroundColor: `${colorEstado(factura.estado)}18`,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.textoEstado,
                      { color: colorEstado(factura.estado) },
                    ]}
                  >
                    {etiquetaEstado(factura.estado)}
                  </Text>
                </View>
              </View>

              <Text style={styles.nombreCliente}>
                {factura.Cliente || 'Cliente sin nombre'}
              </Text>

              <Text style={styles.detalleFactura}>
                Fecha: {fechaTexto(factura.fecha)}
              </Text>

              <View style={styles.filaEntre}>
                <Text style={styles.detalleFactura}>
                  {(factura.items ?? []).length} artículo(s)
                </Text>
                <Text style={styles.totalFactura}>
                  {dinero(Number(factura.total) || 0)}
                </Text>
              </View>

              <Text style={styles.verDetalle}>Ver detalle ›</Text>
            </TouchableOpacity>
          ))
        )}

        <TouchableOpacity
          style={styles.botonActualizar}
          onPress={cargarDatos}
        >
          <Text style={styles.textoBotonActualizar}>
            Actualizar información
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Crear factura */}
      <Modal
        visible={modalCrear}
        animationType="slide"
        onRequestClose={() => {
          if (!guardando) setModalCrear(false);
        }}
      >
        <View style={styles.modalPantalla}>
          <View style={styles.modalEncabezado}>
            <Text style={styles.modalTitulo}>Nueva factura</Text>
            <TouchableOpacity
              disabled={guardando}
              onPress={() => setModalCrear(false)}
            >
              <Text style={styles.cerrar}>Cerrar</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.modalContenido}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.etiquetaCampo}>Cliente registrado</Text>

            <TouchableOpacity
              style={styles.selector}
              onPress={() => {
                setBusquedaCliente('');
                setModalClientes(true);
              }}
            >
              <Text
                style={[
                  styles.textoSelector,
                  !clienteSeleccionado && styles.placeholder,
                ]}
              >
                {clienteSeleccionado
                  ? nombreCompleto(clienteSeleccionado)
                  : 'Seleccionar cliente...'}
              </Text>
              <Text style={styles.flecha}>⌄</Text>
            </TouchableOpacity>

            {clienteSeleccionado && (
              <View style={styles.infoCliente}>
                <Text style={styles.infoClienteTexto}>
                  Correo: {clienteSeleccionado.correo || 'No registrado'}
                </Text>
                <Text style={styles.infoClienteTexto}>
                  Teléfono: {clienteSeleccionado.telefono || 'No registrado'}
                </Text>
                <Text style={styles.infoClienteTexto}>
                  El ID del usuario se guardará automáticamente.
                </Text>
              </View>
            )}

            <View style={styles.filaTituloArticulos}>
              <Text style={styles.tituloSeccion}>Artículos</Text>
              <TouchableOpacity onPress={agregarArticulo}>
                <Text style={styles.agregarTexto}>+ Agregar</Text>
              </TouchableOpacity>
            </View>

            {articulos.map((articulo, indice) => (
              <View key={indice} style={styles.articuloCard}>
                <View style={styles.filaEntre}>
                  <Text style={styles.articuloTitulo}>
                    Artículo {indice + 1}
                  </Text>
                  {articulos.length > 1 && (
                    <TouchableOpacity
                      onPress={() => eliminarArticulo(indice)}
                    >
                      <Text style={styles.eliminarTexto}>Eliminar</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.filaTipo}>
                  {(['servicio', 'producto'] as TipoItemFactura[]).map(
                    (tipo) => (
                      <TouchableOpacity
                        key={tipo}
                        style={[
                          styles.tipoBoton,
                          articulo.tipo === tipo && styles.tipoBotonActivo,
                        ]}
                        onPress={() => seleccionarTipo(indice, tipo)}
                      >
                        <Text
                          style={[
                            styles.tipoTexto,
                            articulo.tipo === tipo && styles.tipoTextoActivo,
                          ]}
                        >
                          {tipo === 'servicio' ? 'Servicio' : 'Producto'}
                        </Text>
                      </TouchableOpacity>
                    )
                  )}
                </View>

                {articulo.tipo === 'servicio' ? (
                  <>
                    <Text style={styles.etiquetaCampo}>Servicio</Text>
                    <View style={styles.serviciosLista}>
                      {SERVICIOS.map((servicio) => (
                        <TouchableOpacity
                          key={servicio}
                          style={[
                            styles.servicioOpcion,
                            articulo.nombre === servicio &&
                              styles.servicioOpcionActivo,
                          ]}
                          onPress={() =>
                            actualizarArticulo(indice, {
                              nombre: servicio,
                            })
                          }
                        >
                          <Text
                            style={[
                              styles.servicioTexto,
                              articulo.nombre === servicio &&
                                styles.servicioTextoActivo,
                            ]}
                          >
                            {servicio}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Text style={styles.etiquetaCampo}>Precio unitario</Text>
                    <TextInput
                      style={styles.input}
                      value={articulo.precio}
                      onChangeText={(valor) =>
                        actualizarArticulo(indice, { precio: valor })
                      }
                      placeholder="Ej. 25.00"
                      placeholderTextColor="#888"
                      keyboardType="decimal-pad"
                    />
                  </>
                ) : (
                  <>
                    <Text style={styles.etiquetaCampo}>Producto</Text>
                    <TouchableOpacity
                      style={styles.selector}
                      onPress={() => {
                        setIndiceArticulo(indice);
                        setModalProductos(true);
                      }}
                    >
                      <Text
                        style={[
                          styles.textoSelector,
                          !articulo.productoID && styles.placeholder,
                        ]}
                      >
                        {articulo.productoID
                          ? articulo.nombre
                          : 'Seleccionar del inventario...'}
                      </Text>
                      <Text style={styles.flecha}>⌄</Text>
                    </TouchableOpacity>

                    {articulo.productoID && (
                      <Text style={styles.ayuda}>
                        Precio del inventario: {dinero(Number(articulo.precio) || 0)}
                      </Text>
                    )}
                  </>
                )}

                <Text style={styles.etiquetaCampo}>Cantidad</Text>
                <TextInput
                  style={styles.input}
                  value={articulo.cantidad}
                  onChangeText={(valor) =>
                    actualizarArticulo(indice, { cantidad: valor })
                  }
                  placeholder="1"
                  placeholderTextColor="#888"
                  keyboardType="number-pad"
                />

                <View style={styles.subtotalArticulo}>
                  <Text style={styles.subtotalEtiqueta}>Subtotal</Text>
                  <Text style={styles.subtotalMonto}>
                    {dinero(
                      Math.max(0, Number(articulo.cantidad) || 0) *
                        Math.max(0, Number(articulo.precio) || 0)
                    )}
                  </Text>
                </View>
              </View>
            ))}

            <View style={styles.totalFormulario}>
              <Text style={styles.totalFormularioEtiqueta}>Total</Text>
              <Text style={styles.totalFormularioMonto}>
                {dinero(totalFormulario)}
              </Text>
            </View>

            <Text style={styles.notaPago}>
              La factura se creará como pendiente. El pago simulado se gestiona
              por separado y deberá verificarse antes de marcarla como pagada.
            </Text>

            <TouchableOpacity
              style={[
                styles.botonPrincipal,
                guardando && styles.botonDeshabilitado,
              ]}
              disabled={guardando}
              onPress={guardarFactura}
            >
              {guardando ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.textoBotonPrincipal}>
                  Crear factura
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Selector de clientes */}
        <Modal
          visible={modalClientes}
          animationType="slide"
          onRequestClose={() => setModalClientes(false)}
        >
          <View style={styles.modalPantalla}>
            <View style={styles.modalEncabezado}>
              <Text style={styles.modalTitulo}>Seleccionar cliente</Text>
              <TouchableOpacity onPress={() => setModalClientes(false)}>
                <Text style={styles.cerrar}>Cerrar</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Buscar cliente..."
              placeholderTextColor="#888"
              value={busquedaCliente}
              onChangeText={setBusquedaCliente}
            />

            <FlatList
              data={clientesFiltrados}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.listaModal}
              ListEmptyComponent={
                <Text style={styles.vacioTexto}>
                  No hay clientes registrados que coincidan con la búsqueda.
                </Text>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.opcionLista}
                  onPress={() => {
                    setClienteSeleccionado(item);
                    setModalClientes(false);
                  }}
                >
                  <Text style={styles.opcionTitulo}>
                    {nombreCompleto(item) || 'Cliente sin nombre'}
                  </Text>
                  <Text style={styles.opcionSubtitulo}>
                    {item.correo || 'Sin correo registrado'}
                  </Text>
                  <Text style={styles.opcionSubtitulo}>
                    {item.telefono || 'Sin teléfono registrado'}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </Modal>

        {/* Selector de productos */}
        <Modal
          visible={modalProductos}
          animationType="slide"
          onRequestClose={() => {
            setModalProductos(false);
            setIndiceArticulo(null);
          }}
        >
          <View style={styles.modalPantalla}>
            <View style={styles.modalEncabezado}>
              <Text style={styles.modalTitulo}>Inventario</Text>
              <TouchableOpacity
                onPress={() => {
                  setModalProductos(false);
                  setIndiceArticulo(null);
                }}
              >
                <Text style={styles.cerrar}>Cerrar</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={productos}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listaModal}
              ListEmptyComponent={
                <Text style={styles.vacioTexto}>
                  No hay productos registrados.
                </Text>
              }
              renderItem={({ item }) => {
                const agotado = Number(item.cantidad) <= 0;

                return (
                  <TouchableOpacity
                    style={[
                      styles.opcionLista,
                      agotado && styles.opcionDeshabilitada,
                    ]}
                    disabled={agotado}
                    onPress={() => seleccionarProducto(item)}
                  >
                    <View style={styles.filaEntre}>
                      <Text style={styles.opcionTitulo}>
                        {item.nombre}
                      </Text>
                      <Text style={styles.opcionPrecio}>
                        {dinero(Number(item.precio) || 0)}
                      </Text>
                    </View>
                    <Text style={styles.opcionSubtitulo}>
                      Disponible: {item.cantidad}
                    </Text>
                    {agotado && (
                      <Text style={styles.eliminarTexto}>Agotado</Text>
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </Modal>
      </Modal>

      {/* Detalle de factura */}
      <Modal
        visible={facturaDetalle !== null}
        animationType="slide"
        onRequestClose={() => setFacturaDetalle(null)}
      >
        <View style={styles.modalPantalla}>
          <View style={styles.modalEncabezado}>
            <Text style={styles.modalTitulo}>Detalle de factura</Text>
            <TouchableOpacity onPress={() => setFacturaDetalle(null)}>
              <Text style={styles.cerrar}>Cerrar</Text>
            </TouchableOpacity>
          </View>

          {facturaDetalle && (
            <ScrollView contentContainerStyle={styles.modalContenido}>
              <Text style={styles.numeroDetalle}>
                {facturaDetalle.numero}
              </Text>
              <Text style={styles.nombreCliente}>
                {facturaDetalle.Cliente}
              </Text>
              <Text style={styles.detalleFactura}>
                Fecha: {fechaTexto(facturaDetalle.fecha)}
              </Text>

              <View style={styles.detalleEstadoFila}>
                <Text style={styles.etiquetaCampo}>Estado</Text>
                <Text
                  style={[
                    styles.textoEstado,
                    { color: colorEstado(facturaDetalle.estado) },
                  ]}
                >
                  {etiquetaEstado(facturaDetalle.estado)}
                </Text>
              </View>

              <Text style={styles.tituloSeccion}>Artículos</Text>

              {(facturaDetalle.items ?? []).map((item, indice) => (
                <View
                  key={`${facturaDetalle.id}-${indice}`}
                  style={styles.itemDetalle}
                >
                  <View style={styles.filaEntre}>
                    <Text style={styles.itemDetalleNombre}>
                      {item.nombre}
                    </Text>
                    <Text style={styles.itemDetalleSubtotal}>
                      {dinero(Number(item.subtotal) || 0)}
                    </Text>
                  </View>
                  <Text style={styles.detalleFactura}>
                    {item.tipo === 'producto' ? 'Producto' : 'Servicio'} ·{' '}
                    {item.cantidad} × {dinero(Number(item.precio) || 0)}
                  </Text>
                </View>
              ))}

              <View style={styles.totalFormulario}>
                <Text style={styles.totalFormularioEtiqueta}>Total</Text>
                <Text style={styles.totalFormularioMonto}>
                  {dinero(Number(facturaDetalle.total) || 0)}
                </Text>
              </View>

<Text style={styles.tituloSeccion}>
  Solicitudes de pago
</Text>

{pagos.filter(
  (pago) => pago.facturaID === facturaDetalle.id
).length === 0 ? (
  <View style={styles.itemDetalle}>
    <Text style={styles.detalleFactura}>
      Este cliente todavía no ha enviado una solicitud de pago.
    </Text>
  </View>
) : (
  pagos
    .filter((pago) => pago.facturaID === facturaDetalle.id)
    .map((pago) => {
      const pendiente =
        pago.estado === 'pendiente_verificacion';

      const confirmado = pago.estado === 'confirmado';

      const colorPago = confirmado
        ? '#218838'
        : pendiente
          ? '#B7791F'
          : '#C0392B';

      const textoPago = confirmado
        ? 'Confirmado'
        : pendiente
          ? 'Pendiente de verificación'
          : 'Rechazado';

      const procesando = procesandoPago === pago.id;

      return (
        <View key={pago.id} style={styles.itemDetalle}>
          <View style={styles.filaEntre}>
            <Text style={styles.itemDetalleNombre}>
              {pago.metodo}
            </Text>

            <Text
              style={[
                styles.textoEstado,
                { color: colorPago },
              ]}
            >
              {textoPago}
            </Text>
          </View>

          <Text style={styles.detalleFactura}>
            Monto: {dinero(Number(pago.monto) || 0)}
          </Text>

          <Text style={styles.detalleFactura}>
            ID del pago: {pago.id}
          </Text>

          {pendiente && (
            <View style={{ marginTop: 14, gap: 9 }}>
              <TouchableOpacity
                style={[
                  styles.botonPrincipal,
                  { marginBottom: 0 },
                  procesando && styles.botonDeshabilitado,
                ]}
                disabled={procesando || procesandoPago !== null}
                onPress={() => revisarPago(pago, 'confirmado')}
              >
                {procesando ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.textoBotonPrincipal}>
                    Confirmar pago
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.botonActualizar,
                  {
                    backgroundColor: '#FCE8E6',
                    borderRadius: 10,
                  },
                  procesando && styles.botonDeshabilitado,
                ]}
                disabled={procesando || procesandoPago !== null}
                onPress={() => revisarPago(pago, 'rechazado')}
              >
                <Text
                  style={[
                    styles.textoBotonActualizar,
                    { color: '#C0392B' },
                  ]}
                >
                  Rechazar pago
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      );
    })
)}

              <Text style={styles.notaPago}>
                El estado de pago solo cambia cuando se procesa y confirma la
                solicitud correspondiente.
              </Text>
            </ScrollView>
          )}
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
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4F6FA',
  },
  textoCargando: {
    marginTop: 12,
    color: '#112250',
  },
  encabezado: {
    marginBottom: 20,
  },
  botonVolver: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    marginBottom: 8,
  },
  textoVolver: {
    color: '#112250',
    fontWeight: '600',
    fontSize: 15,
  },
  titulo: {
    color: '#112250',
    fontSize: 29,
    fontWeight: '800',
  },
  subtitulo: {
    color: '#687386',
    fontSize: 14,
    marginTop: 5,
    lineHeight: 20,
  },
  resumen: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 18,
  },
  tarjetaResumen: {
    flexGrow: 1,
    flexBasis: '28%',
    minWidth: 95,
    backgroundColor: '#FFFFFF',
    padding: 13,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E9F0',
  },
  resumenEtiqueta: {
    color: '#687386',
    fontSize: 12,
  },
  resumenNumero: {
    color: '#112250',
    fontSize: 25,
    fontWeight: '800',
    marginTop: 7,
  },
  resumenMonto: {
    color: '#112250',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 10,
  },
  botonPrincipal: {
    backgroundColor: '#112250',
    paddingVertical: 15,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  textoBotonPrincipal: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  botonDeshabilitado: {
    opacity: 0.65,
  },
  tituloSeccion: {
    fontSize: 19,
    fontWeight: '800',
    color: '#112250',
    marginBottom: 12,
    marginTop: 5,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCE2EC',
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1F2937',
    marginBottom: 12,
  },
  filtros: {
    marginBottom: 14,
    flexGrow: 0,
  },
  filtro: {
    paddingHorizontal: 15,
    paddingVertical: 9,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DCE2EC',
    marginRight: 8,
  },
  filtroActivo: {
    backgroundColor: '#112250',
    borderColor: '#112250',
  },
  textoFiltro: {
    color: '#536078',
    fontWeight: '600',
    fontSize: 13,
  },
  textoFiltroActivo: {
    color: '#FFFFFF',
  },
  tarjetaFactura: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E9F0',
    marginBottom: 12,
  },
  filaEntre: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  numeroFactura: {
    fontSize: 16,
    fontWeight: '800',
    color: '#112250',
  },
  etiquetaEstado: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  textoEstado: {
    fontSize: 12,
    fontWeight: '800',
  },
  nombreCliente: {
    fontSize: 16,
    fontWeight: '700',
    color: '#273449',
    marginTop: 12,
  },
  detalleFactura: {
    color: '#687386',
    fontSize: 13,
    marginTop: 6,
  },
  totalFactura: {
    fontSize: 19,
    color: '#112250',
    fontWeight: '800',
    marginTop: 12,
  },
  verDetalle: {
    alignSelf: 'flex-end',
    color: '#E57A3A',
    fontWeight: '700',
    marginTop: 8,
  },
  vacio: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 25,
    alignItems: 'center',
    marginTop: 4,
  },
  vacioTitulo: {
    fontWeight: '700',
    color: '#112250',
    fontSize: 16,
    textAlign: 'center',
  },
  vacioTexto: {
    color: '#687386',
    textAlign: 'center',
    lineHeight: 21,
    padding: 16,
  },
  botonActualizar: {
    padding: 14,
    alignItems: 'center',
  },
  textoBotonActualizar: {
    color: '#112250',
    fontWeight: '700',
  },
  modalPantalla: {
    flex: 1,
    backgroundColor: '#F4F6FA',
  },
  modalEncabezado: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 15,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E9F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalTitulo: {
    color: '#112250',
    fontSize: 22,
    fontWeight: '800',
    flexShrink: 1,
  },
  cerrar: {
    color: '#E57A3A',
    fontWeight: '700',
    fontSize: 14,
  },
  modalContenido: {
    padding: 18,
    paddingBottom: 40,
  },
  etiquetaCampo: {
    color: '#273449',
    fontWeight: '700',
    fontSize: 14,
    marginBottom: 8,
    marginTop: 8,
  },
  selector: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCE2EC',
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  textoSelector: {
    flex: 1,
    color: '#273449',
    fontSize: 14,
  },
  placeholder: {
    color: '#888',
  },
  flecha: {
    color: '#112250',
    fontSize: 19,
  },
  infoCliente: {
    backgroundColor: '#EAF0FA',
    borderRadius: 10,
    padding: 12,
    marginBottom: 15,
    gap: 5,
  },
  infoClienteTexto: {
    color: '#344565',
    fontSize: 12,
  },
  filaTituloArticulos: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  agregarTexto: {
    color: '#E57A3A',
    fontWeight: '800',
  },
  articuloCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 13,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E1E6EF',
    marginBottom: 14,
  },
  articuloTitulo: {
    color: '#112250',
    fontWeight: '800',
    fontSize: 16,
  },
  eliminarTexto: {
    color: '#C0392B',
    fontWeight: '700',
    fontSize: 13,
  },
  filaTipo: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 13,
    marginBottom: 8,
  },
  tipoBoton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#DCE2EC',
    backgroundColor: '#FFFFFF',
  },
  tipoBotonActivo: {
    backgroundColor: '#112250',
    borderColor: '#112250',
  },
  tipoTexto: {
    color: '#536078',
    fontWeight: '700',
  },
  tipoTextoActivo: {
    color: '#FFFFFF',
  },
  serviciosLista: {
    gap: 7,
    marginBottom: 8,
  },
  servicioOpcion: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DCE2EC',
    backgroundColor: '#FFFFFF',
  },
  servicioOpcionActivo: {
    borderColor: '#112250',
    backgroundColor: '#EAF0FA',
  },
  servicioTexto: {
    color: '#536078',
    fontSize: 13,
    fontWeight: '600',
  },
  servicioTextoActivo: {
    color: '#112250',
    fontWeight: '800',
  },
  ayuda: {
    color: '#687386',
    fontSize: 12,
    marginBottom: 8,
  },
  subtotalArticulo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#E5E9F0',
    paddingTop: 12,
    marginTop: 5,
  },
  subtotalEtiqueta: {
    color: '#687386',
    fontWeight: '600',
  },
  subtotalMonto: {
    color: '#112250',
    fontWeight: '800',
  },
  totalFormulario: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCE2EC',
    borderRadius: 12,
    padding: 17,
    marginVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalFormularioEtiqueta: {
    color: '#112250',
    fontWeight: '800',
    fontSize: 17,
  },
  totalFormularioMonto: {
    color: '#112250',
    fontWeight: '900',
    fontSize: 23,
  },
  notaPago: {
    color: '#687386',
    fontSize: 12,
    lineHeight: 19,
    marginBottom: 16,
  },
  listaModal: {
    padding: 16,
    paddingBottom: 35,
  },
  opcionLista: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E1E6EF',
    padding: 15,
    marginBottom: 10,
  },
  opcionTitulo: {
    color: '#112250',
    fontSize: 15,
    fontWeight: '800',
    flexShrink: 1,
  },
  opcionSubtitulo: {
    color: '#687386',
    fontSize: 12,
    marginTop: 5,
  },
  opcionPrecio: {
    color: '#112250',
    fontWeight: '800',
    fontSize: 15,
  },
  opcionDeshabilitada: {
    opacity: 0.45,
  },
  numeroDetalle: {
    color: '#112250',
    fontSize: 25,
    fontWeight: '900',
  },
  detalleEstadoFila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 18,
    padding: 13,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
  },
  itemDetalle: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 13,
    marginBottom: 9,
  },
  itemDetalleNombre: {
    color: '#273449',
    fontWeight: '700',
    flex: 1,
  },
  itemDetalleSubtotal: {
    color: '#112250',
    fontWeight: '800',
  },
});
