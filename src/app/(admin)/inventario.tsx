import { useFocusEffect } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { useCallback, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

import Header from '@/components/Header';
import { auth, db } from '@/lib/firebase';
import {
    actualizarProducto,
    crearProducto,
    eliminarProducto,
    obtenerProductos,
    type ProductoInventario,
} from '@/services/inventarioService';

const CATEGORIAS = [
  'Medicamentos',
  'Alimentos',
  'Accesorios',
  'Higiene',
  'Vacunacion',
  'Otros',
];

const COLORES = {
  azul: '#112250',
  naranja: '#E57A3A',
  celeste: '#8FBFE3',
  fondo: '#F5F7FA',
  blanco: '#FFFFFF',
  texto: '#263248',
  gris: '#687386',
  borde: '#D5D9E2',
  rojo: '#DC4545',
  verde: '#238653',
};

interface FormularioProducto {
  nombre: string;
  categoria: string;
  cantidad: string;
  precio: string;
  proveedor: string;
}

const FORMULARIO_VACIO: FormularioProducto = {
  nombre: '',
  categoria: '',
  cantidad: '',
  precio: '',
  proveedor: '',
};

export default function InventarioScreen() {
  const [productos, setProductos] = useState<
    ProductoInventario[]
  >([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [esVeterinario, setEsVeterinario] = useState(false);

  const [modalRegistro, setModalRegistro] = useState(false);
  const [modalEdicion, setModalEdicion] = useState(false);

  const [formulario, setFormulario] =
    useState<FormularioProducto>(FORMULARIO_VACIO);

  const [productoEditando, setProductoEditando] =
    useState<ProductoInventario | null>(null);

  const [formularioEdicion, setFormularioEdicion] =
    useState<FormularioProducto>(FORMULARIO_VACIO);

  const [guardando, setGuardando] = useState(false);
  const [eliminandoId, setEliminandoId] = useState<string | null>(
    null,
  );

  const cargarInventario = useCallback(async (
    mostrarCarga = true,
  ) => {
    if (mostrarCarga) {
      setCargando(true);
    }

    try {
      const usuario = auth.currentUser;

      if (!usuario) {
        setProductos([]);
        setEsVeterinario(false);
        return;
      }

      const referenciaUsuario = doc(
        db,
        'usuarios',
        usuario.uid,
      );
      const documentoUsuario = await getDoc(referenciaUsuario);

      const veterinario =
        documentoUsuario.exists() &&
        documentoUsuario.data().rol === 'veterinario';

      setEsVeterinario(veterinario);

      const datos = await obtenerProductos();
      setProductos(datos);
    } catch (error) {
      console.error('Error al cargar inventario:', error);
      Alert.alert(
        'Error',
        'No se pudo cargar el inventario. Comprueba tu conexión e inténtalo de nuevo.',
      );
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void cargarInventario();
    }, [cargarInventario]),
  );

  const productosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLocaleLowerCase();

    if (!texto) {
      return productos;
    }

    return productos.filter((producto) =>
      [
        producto.nombre,
        producto.categoria ?? '',
        producto.proveedor ?? '',
      ].some((campo) =>
        campo.toLocaleLowerCase().includes(texto),
      ),
    );
  }, [productos, busqueda]);

  const totalUnidades = useMemo(
    () =>
      productos.reduce(
        (total, producto) =>
          total + (Number(producto.cantidad) || 0),
        0,
      ),
    [productos],
  );

  const productosStockBajo = useMemo(
    () =>
      productos.filter(
        (producto) => Number(producto.cantidad) <= 5,
      ).length,
    [productos],
  );

  const cambiarCampo = (
    campo: keyof FormularioProducto,
    valor: string,
  ) => {
    setFormulario((actual) => ({
      ...actual,
      [campo]: valor,
    }));
  };

  const cambiarCampoEdicion = (
    campo: keyof FormularioProducto,
    valor: string,
  ) => {
    setFormularioEdicion((actual) => ({
      ...actual,
      [campo]: valor,
    }));
  };

  const validarFormulario = (
    datos: FormularioProducto,
  ): string | null => {
    if (!datos.nombre.trim()) {
      return 'Escribe el nombre del producto.';
    }

    if (!datos.categoria) {
      return 'Selecciona una categoría.';
    }

    if (
      datos.cantidad.trim() === '' ||
      !Number.isFinite(Number(datos.cantidad)) ||
      Number(datos.cantidad) < 0 ||
      !Number.isInteger(Number(datos.cantidad))
    ) {
      return 'La cantidad debe ser un número entero igual o mayor que cero.';
    }

    if (
      datos.precio.trim() === '' ||
      !Number.isFinite(Number(datos.precio)) ||
      Number(datos.precio) < 0
    ) {
      return 'El precio debe ser un número válido igual o mayor que cero.';
    }

    if (!datos.proveedor.trim()) {
      return 'Escribe el nombre del proveedor.';
    }

    return null;
  };

  const registrarProducto = async () => {
    if (!esVeterinario) {
      Alert.alert(
        'Acceso denegado',
        'Solo el veterinario puede registrar productos.',
      );
      return;
    }

    const errorValidacion = validarFormulario(formulario);

    if (errorValidacion) {
      Alert.alert('Revisa los datos', errorValidacion);
      return;
    }

    try {
      setGuardando(true);

      const nuevoProducto = await crearProducto({
        nombre: formulario.nombre.trim(),
        categoria: formulario.categoria,
        cantidad: Number(formulario.cantidad),
        precio: Number(formulario.precio),
        proveedor: formulario.proveedor.trim(),
      });

      setProductos((actuales) =>
        [...actuales, nuevoProducto].sort((a, b) =>
          a.nombre.localeCompare(b.nombre),
        ),
      );

      setFormulario(FORMULARIO_VACIO);
      setModalRegistro(false);

      Alert.alert(
        'Producto registrado',
        'El producto se agregó correctamente al inventario.',
      );
    } catch (error) {
      console.error('Error al registrar producto:', error);

      Alert.alert(
        'No se pudo registrar',
        error instanceof Error
          ? error.message
          : 'Ocurrió un error al registrar el producto.',
      );
    } finally {
      setGuardando(false);
    }
  };

  const abrirEdicion = (producto: ProductoInventario) => {
    if (!esVeterinario) {
      Alert.alert(
        'Acceso denegado',
        'Solo el veterinario puede modificar productos.',
      );
      return;
    }

    setProductoEditando(producto);
    setFormularioEdicion({
      nombre: producto.nombre,
      categoria: producto.categoria ?? '',
      cantidad: String(producto.cantidad),
      precio: String(producto.precio),
      proveedor: producto.proveedor ?? '',
    });
    setModalEdicion(true);
  };

  const guardarEdicion = async () => {
    if (!esVeterinario || !productoEditando) {
      return;
    }

    const errorValidacion = validarFormulario(formularioEdicion);

    if (errorValidacion) {
      Alert.alert('Revisa los datos', errorValidacion);
      return;
    }

    try {
      setGuardando(true);

      const actualizado = await actualizarProducto(
        productoEditando.id,
        {
          nombre: formularioEdicion.nombre.trim(),
          categoria: formularioEdicion.categoria,
          cantidad: Number(formularioEdicion.cantidad),
          precio: Number(formularioEdicion.precio),
          proveedor: formularioEdicion.proveedor.trim(),
        },
      );

      setProductos((actuales) =>
        actuales.map((producto) =>
          producto.id === actualizado.id
            ? actualizado
            : producto,
        ).sort((a, b) => a.nombre.localeCompare(b.nombre)),
      );

      setModalEdicion(false);
      setProductoEditando(null);

      Alert.alert(
        'Cambios guardados',
        'El producto se actualizó correctamente.',
      );
    } catch (error) {
      console.error('Error al actualizar producto:', error);

      Alert.alert(
        'No se pudo actualizar',
        error instanceof Error
          ? error.message
          : 'Ocurrió un error al actualizar el producto.',
      );
    } finally {
      setGuardando(false);
    }
  };

  const confirmarEliminacion = (
    producto: ProductoInventario,
  ) => {
    if (!esVeterinario) {
      Alert.alert(
        'Acceso denegado',
        'Solo el veterinario puede eliminar productos.',
      );
      return;
    }

    Alert.alert(
      'Eliminar producto',
      `¿Estás seguro de que deseas eliminar "${producto.nombre}" del inventario? Esta acción no se puede deshacer.`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            void ejecutarEliminacion(producto);
          },
        },
      ],
    );
  };

  const ejecutarEliminacion = async (
    producto: ProductoInventario,
  ) => {
    if (!esVeterinario) {
      return;
    }

    try {
      setEliminandoId(producto.id);

      await eliminarProducto(producto.id);

      setProductos((actuales) =>
        actuales.filter((item) => item.id !== producto.id),
      );

      Alert.alert(
        'Producto eliminado',
        'El producto se eliminó correctamente.',
      );
    } catch (error) {
      console.error('Error al eliminar producto:', error);

      Alert.alert(
        'No se pudo eliminar',
        error instanceof Error
          ? error.message
          : 'Ocurrió un error al eliminar el producto.',
      );
    } finally {
      setEliminandoId(null);
    }
  };

  const abrirRegistro = () => {
    if (!esVeterinario) {
      Alert.alert(
        'Acceso denegado',
        'Solo el veterinario puede registrar productos.',
      );
      return;
    }

    setFormulario(FORMULARIO_VACIO);
    setModalRegistro(true);
  };

  const renderCampo = (
    etiqueta: string,
    campo: keyof FormularioProducto,
    datos: FormularioProducto,
    cambiar: (campo: keyof FormularioProducto, valor: string) => void,
    opciones?: {
      teclado?: 'default' | 'numeric' | 'decimal-pad';
      placeholder?: string;
    },
  ) => (
    <View style={styles.campoContainer}>
      <Text style={styles.label}>{etiqueta}</Text>
      <TextInput
        style={styles.input}
        value={datos[campo]}
        onChangeText={(valor) => cambiar(campo, valor)}
        placeholder={opciones?.placeholder ?? etiqueta}
        placeholderTextColor="#9299A5"
        keyboardType={opciones?.teclado ?? 'default'}
        editable={!guardando}
        autoCapitalize={campo === 'nombre' || campo === 'proveedor' ? 'sentences' : 'none'}
      />
    </View>
  );

  const renderCategorias = (
    categoriaSeleccionada: string,
    seleccionar: (categoria: string) => void,
  ) => (
    <View style={styles.campoContainer}>
      <Text style={styles.label}>Categoría</Text>
      <View style={styles.categorias}>
        {CATEGORIAS.map((categoria) => {
          const seleccionada = categoriaSeleccionada === categoria;

          return (
            <TouchableOpacity
              key={categoria}
              style={[
                styles.categoriaChip,
                seleccionada && styles.categoriaChipActiva,
              ]}
              onPress={() => seleccionar(categoria)}
              disabled={guardando}
              accessibilityRole="button"
              accessibilityState={{ selected: seleccionada }}
            >
              <Text
                style={[
                  styles.categoriaTexto,
                  seleccionada && styles.categoriaTextoActivo,
                ]}
              >
                {categoria === 'Vacunacion' ? 'Vacunación' : categoria}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderFormulario = (
    editar: boolean,
  ) => {
    const datos = editar ? formularioEdicion : formulario;
    const cambiar = editar ? cambiarCampoEdicion : cambiarCampo;

    return (
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.formularioContenido}
      >
        {renderCampo(
          'Nombre del producto',
          'nombre',
          datos,
          cambiar,
          { placeholder: 'Ej. Vacuna antirrábica' },
        )}

        {renderCategorias(datos.categoria, (categoria) =>
          cambiar('categoria', categoria),
        )}

        <View style={styles.filaCampos}>
          <View style={styles.campoMitad}>
            {renderCampo(
              editar ? 'Cantidad / stock' : 'Cantidad',
              'cantidad',
              datos,
              cambiar,
              { teclado: 'numeric', placeholder: '0' },
            )}
          </View>

          <View style={styles.campoMitad}>
            {renderCampo(
              'Precio ($)',
              'precio',
              datos,
              cambiar,
              { teclado: 'decimal-pad', placeholder: '0.00' },
            )}
          </View>
        </View>

        {editar && (
          <Text style={styles.ayuda}>
            Introduce la nueva cantidad total disponible.
          </Text>
        )}

        {renderCampo(
          'Proveedor',
          'proveedor',
          datos,
          cambiar,
          { placeholder: 'Ej. VetPharma' },
        )}

        <View style={styles.botonesFormulario}>
          <TouchableOpacity
            style={[styles.botonSecundario, styles.botonMitad]}
            onPress={() => {
              if (guardando) return;
              setModalRegistro(false);
              setModalEdicion(false);
              setProductoEditando(null);
            }}
            disabled={guardando}
          >
            <Text style={styles.textoBotonSecundario}>Cancelar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.botonPrincipal,
              styles.botonMitad,
              guardando && styles.botonDeshabilitado,
            ]}
            onPress={() => {
              void (editar ? guardarEdicion() : registrarProducto());
            }}
            disabled={guardando}
          >
            {guardando ? (
              <ActivityIndicator color={COLORES.blanco} />
            ) : (
              <Text style={styles.textoBotonPrincipal}>
                {editar ? 'Guardar cambios' : 'Guardar producto'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  const renderProducto = ({
    item,
  }: {
    item: ProductoInventario;
  }) => {
    const stockBajo = Number(item.cantidad) <= 5;
    const eliminando = eliminandoId === item.id;

    return (
      <View style={styles.productoCard}>
        <View style={styles.productoEncabezado}>
          <View style={styles.productoIcono}>
            <Text style={styles.productoEmoji}>📦</Text>
          </View>

          <View style={styles.productoInfo}>
            <Text style={styles.productoNombre}>{item.nombre}</Text>
            <Text style={styles.productoCategoria}>
              {item.categoria || 'Sin categoría'}
            </Text>
          </View>

          <View
            style={[
              styles.estadoChip,
              stockBajo ? styles.estadoBajo : styles.estadoDisponible,
            ]}
          >
            <Text
              style={[
                styles.estadoTexto,
                stockBajo ? styles.estadoTextoBajo : styles.estadoTextoDisponible,
              ]}
            >
              {stockBajo ? 'Stock bajo' : 'Disponible'}
            </Text>
          </View>
        </View>

        <View style={styles.separador} />

        <View style={styles.detallesProducto}>
          <View style={styles.detalle}>
            <Text style={styles.detalleEtiqueta}>Existencias</Text>
            <Text
              style={[
                styles.detalleValor,
                stockBajo && styles.valorAlerta,
              ]}
            >
              {item.cantidad} unidades
            </Text>
          </View>

          <View style={styles.detalle}>
            <Text style={styles.detalleEtiqueta}>Precio</Text>
            <Text style={styles.precioValor}>
              ${Number(item.precio).toFixed(2)}
            </Text>
          </View>
        </View>

        <View style={styles.proveedorFila}>
          <Text style={styles.detalleEtiqueta}>Proveedor: </Text>
          <Text style={styles.proveedorTexto}>
            {item.proveedor || 'No especificado'}
          </Text>
        </View>

        {esVeterinario && (
          <View style={styles.accionesProducto}>
            <TouchableOpacity
              style={styles.botonEditar}
              onPress={() => abrirEdicion(item)}
              disabled={eliminando}
            >
              <Text style={styles.textoBotonEditar}>✏️ Editar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.botonEliminar,
                eliminando && styles.botonDeshabilitado,
              ]}
              onPress={() => confirmarEliminacion(item)}
              disabled={eliminando}
            >
              {eliminando ? (
                <ActivityIndicator color={COLORES.blanco} size="small" />
              ) : (
                <Text style={styles.textoBotonEliminar}>
                  🗑️ Eliminar
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (cargando) {
    return (
      <View style={styles.pantalla}>
        <Header title="Inventario" />
        <View style={styles.centro}>
          <ActivityIndicator size="large" color={COLORES.azul} />
          <Text style={styles.textoCargando}>
            Cargando inventario...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.pantalla}>
      <Header title="Inventario" />

      <FlatList
        data={productosFiltrados}
        keyExtractor={(item) => item.id}
        renderItem={renderProducto}
        contentContainerStyle={styles.listaContenido}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refrescando}
            onRefresh={() => {
              setRefrescando(true);
              void cargarInventario(false);
            }}
            colors={[COLORES.azul]}
            tintColor={COLORES.azul}
          />
        }
        ListHeaderComponent={
          <View>
            <View style={styles.encabezadoPagina}>
              <View style={styles.encabezadoTexto}>
                <Text style={styles.titulo}>📦 Inventario</Text>
                <Text style={styles.subtitulo}>
                  Gestión de productos y existencias
                </Text>
              </View>
            </View>

            {esVeterinario && (
              <TouchableOpacity
                style={styles.botonRegistrar}
                onPress={abrirRegistro}
              >
                <Text style={styles.textoBotonRegistrar}>
                  ＋ Registrar producto
                </Text>
              </TouchableOpacity>
            )}

            {!esVeterinario && (
              <View style={styles.avisoLectura}>
                <Text style={styles.avisoTexto}>
                  Modo de consulta. Las modificaciones están reservadas al veterinario.
                </Text>
              </View>
            )}

            <View style={styles.estadisticas}>
              <View style={[styles.estadisticaCard, styles.bordeAzulClaro]}>
                <Text style={styles.estadisticaIcono}>🧾</Text>
                <Text style={styles.estadisticaEtiqueta}>Productos</Text>
                <Text style={styles.estadisticaNumero}>
                  {productos.length}
                </Text>
              </View>

              <View style={[styles.estadisticaCard, styles.bordeNaranja]}>
                <Text style={styles.estadisticaIcono}>📦</Text>
                <Text style={styles.estadisticaEtiqueta}>Unidades</Text>
                <Text style={styles.estadisticaNumero}>
                  {totalUnidades}
                </Text>
              </View>

              <View style={[styles.estadisticaCard, styles.bordeRojo]}>
                <Text style={styles.estadisticaIcono}>⚠️</Text>
                <Text style={styles.estadisticaEtiqueta}>Stock bajo</Text>
                <Text style={[styles.estadisticaNumero, styles.numeroAlerta]}>
                  {productosStockBajo}
                </Text>
              </View>
            </View>

            <View style={styles.buscadorCard}>
              <Text style={styles.buscadorTitulo}>Buscar productos</Text>
              <TextInput
                style={styles.buscadorInput}
                value={busqueda}
                onChangeText={setBusqueda}
                placeholder="🔎 Nombre, categoría o proveedor..."
                placeholderTextColor="#9299A5"
                returnKeyType="search"
                autoCapitalize="none"
              />
              <Text style={styles.resultadosTexto}>
                {productosFiltrados.length}{' '}
                {productosFiltrados.length === 1
                  ? 'producto encontrado'
                  : 'productos encontrados'}
              </Text>
            </View>

            <Text style={styles.seccionTitulo}>Productos registrados</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.vacioCard}>
            <Text style={styles.vacioEmoji}>
              {busqueda ? '🔎' : '📦'}
            </Text>
            <Text style={styles.vacioTitulo}>
              {busqueda
                ? 'No encontramos coincidencias'
                : 'No hay productos registrados'}
            </Text>
            <Text style={styles.vacioTexto}>
              {busqueda
                ? 'Prueba con otro nombre, categoría o proveedor.'
                : esVeterinario
                  ? 'Registra el primer producto para comenzar a gestionar el inventario.'
                  : 'Los productos aparecerán aquí cuando estén registrados.'}
            </Text>
          </View>
        }
        ListFooterComponent={<View style={styles.pieLista} />}
      />

      <Modal
        visible={modalRegistro}
        animationType="slide"
        transparent
        onRequestClose={() => {
          if (!guardando) setModalRegistro(false);
        }}
      >
        <KeyboardAvoidingView
          style={styles.fondoModal}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalEncabezado}>
              <View style={styles.modalTituloContainer}>
                <Text style={styles.modalTitulo}>Registrar producto</Text>
                <Text style={styles.modalSubtitulo}>
                  Agrega un producto al inventario.
                </Text>
              </View>

              <TouchableOpacity
                style={styles.cerrarModal}
                onPress={() => setModalRegistro(false)}
                disabled={guardando}
              >
                <Text style={styles.cerrarModalTexto}>✕</Text>
              </TouchableOpacity>
            </View>

            {renderFormulario(false)}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={modalEdicion}
        animationType="slide"
        transparent
        onRequestClose={() => {
          if (!guardando) {
            setModalEdicion(false);
            setProductoEditando(null);
          }
        }}
      >
        <KeyboardAvoidingView
          style={styles.fondoModal}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalEncabezado}>
              <View style={styles.modalTituloContainer}>
                <Text style={styles.modalTitulo}>✏️ Editar producto</Text>
                <Text style={styles.modalSubtitulo}>
                  Modifica los datos o actualiza el stock.
                </Text>
              </View>

              <TouchableOpacity
                style={styles.cerrarModal}
                onPress={() => {
                  if (guardando) return;
                  setModalEdicion(false);
                  setProductoEditando(null);
                }}
                disabled={guardando}
              >
                <Text style={styles.cerrarModalTexto}>✕</Text>
              </TouchableOpacity>
            </View>

            {renderFormulario(true)}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: COLORES.fondo,
  },
  listaContenido: {
    padding: 16,
    paddingBottom: 28,
    flexGrow: 1,
  },
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  textoCargando: {
    marginTop: 12,
    color: COLORES.gris,
    fontSize: 15,
  },
  encabezadoPagina: {
    marginBottom: 16,
  },
  encabezadoTexto: {
    flex: 1,
  },
  titulo: {
    fontSize: 27,
    fontWeight: '800',
    color: COLORES.azul,
  },
  subtitulo: {
    fontSize: 14,
    color: COLORES.gris,
    marginTop: 5,
    lineHeight: 20,
  },
  botonRegistrar: {
    minHeight: 50,
    borderRadius: 12,
    backgroundColor: COLORES.naranja,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginBottom: 18,
  },
  textoBotonRegistrar: {
    color: COLORES.blanco,
    fontWeight: '800',
    fontSize: 15,
  },
  avisoLectura: {
    padding: 12,
    backgroundColor: '#EAF2FC',
    borderRadius: 10,
    marginBottom: 16,
  },
  avisoTexto: {
    color: COLORES.azul,
    fontSize: 13,
    lineHeight: 19,
  },
  estadisticas: {
    flexDirection: 'row',
    gap: 9,
    marginBottom: 18,
  },
  estadisticaCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: COLORES.blanco,
    padding: 12,
    borderRadius: 13,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  bordeAzulClaro: {
    borderLeftColor: COLORES.celeste,
  },
  bordeNaranja: {
    borderLeftColor: COLORES.naranja,
  },
  bordeRojo: {
    borderLeftColor: COLORES.rojo,
  },
  estadisticaIcono: {
    fontSize: 19,
    marginBottom: 7,
  },
  estadisticaEtiqueta: {
    color: COLORES.gris,
    fontSize: 11,
    fontWeight: '600',
  },
  estadisticaNumero: {
    color: COLORES.azul,
    fontSize: 25,
    fontWeight: '800',
    marginTop: 5,
  },
  numeroAlerta: {
    color: COLORES.rojo,
  },
  buscadorCard: {
    backgroundColor: COLORES.blanco,
    borderRadius: 14,
    padding: 15,
    marginBottom: 22,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  buscadorTitulo: {
    color: COLORES.azul,
    fontWeight: '700',
    fontSize: 15,
    marginBottom: 10,
  },
  buscadorInput: {
    borderWidth: 1,
    borderColor: COLORES.borde,
    backgroundColor: '#FCFCFD',
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORES.texto,
  },
  resultadosTexto: {
    color: COLORES.gris,
    fontSize: 12,
    marginTop: 9,
  },
  seccionTitulo: {
    color: COLORES.azul,
    fontSize: 19,
    fontWeight: '800',
    marginBottom: 12,
  },
  productoCard: {
    backgroundColor: COLORES.blanco,
    padding: 15,
    borderRadius: 15,
    marginBottom: 13,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  productoEncabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  productoIcono: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#EDF2FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productoEmoji: {
    fontSize: 23,
  },
  productoInfo: {
    flex: 1,
  },
  productoNombre: {
    color: COLORES.azul,
    fontSize: 15,
    fontWeight: '800',
  },
  productoCategoria: {
    color: COLORES.gris,
    fontSize: 12,
    marginTop: 4,
  },
  estadoChip: {
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  estadoBajo: {
    backgroundColor: '#FDEBEC',
  },
  estadoDisponible: {
    backgroundColor: '#E7F6ED',
  },
  estadoTexto: {
    fontSize: 10,
    fontWeight: '800',
  },
  estadoTextoBajo: {
    color: COLORES.rojo,
  },
  estadoTextoDisponible: {
    color: COLORES.verde,
  },
  separador: {
    height: 1,
    backgroundColor: '#EDF0F4',
    marginVertical: 14,
  },
  detallesProducto: {
    flexDirection: 'row',
    gap: 12,
  },
  detalle: {
    flex: 1,
  },
  detalleEtiqueta: {
    color: COLORES.gris,
    fontSize: 12,
  },
  detalleValor: {
    color: COLORES.texto,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 5,
  },
  valorAlerta: {
    color: COLORES.rojo,
  },
  precioValor: {
    color: COLORES.azul,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 3,
  },
  proveedorFila: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 14,
  },
  proveedorTexto: {
    color: COLORES.texto,
    fontSize: 12,
    flexShrink: 1,
  },
  accionesProducto: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 15,
  },
  botonEditar: {
    flex: 1,
    backgroundColor: '#E5F1FB',
    borderRadius: 9,
    minHeight: 43,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  textoBotonEditar: {
    color: COLORES.azul,
    fontSize: 13,
    fontWeight: '800',
  },
  botonEliminar: {
    flex: 1,
    backgroundColor: COLORES.rojo,
    borderRadius: 9,
    minHeight: 43,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  textoBotonEliminar: {
    color: COLORES.blanco,
    fontSize: 13,
    fontWeight: '800',
  },
  vacioCard: {
    backgroundColor: COLORES.blanco,
    borderRadius: 15,
    padding: 25,
    alignItems: 'center',
    marginTop: 4,
  },
  vacioEmoji: {
    fontSize: 38,
    marginBottom: 12,
  },
  vacioTitulo: {
    color: COLORES.azul,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  vacioTexto: {
    color: COLORES.gris,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
  },
  pieLista: {
    height: 15,
  },
  fondoModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: COLORES.blanco,
    borderRadius: 18,
    padding: 20,
    maxHeight: '90%',
    width: '100%',
    alignSelf: 'center',
  },
  modalEncabezado: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  modalTituloContainer: {
    flex: 1,
    paddingRight: 8,
  },
  modalTitulo: {
    color: COLORES.azul,
    fontSize: 21,
    fontWeight: '800',
  },
  modalSubtitulo: {
    color: COLORES.gris,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
  },
  cerrarModal: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F0F2F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cerrarModalTexto: {
    color: COLORES.gris,
    fontSize: 18,
    fontWeight: '700',
  },
  formularioContenido: {
    paddingBottom: 4,
  },
  campoContainer: {
    marginBottom: 15,
  },
  label: {
    color: COLORES.azul,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 7,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORES.borde,
    backgroundColor: '#FCFCFD',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORES.texto,
  },
  categorias: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoriaChip: {
    borderWidth: 1,
    borderColor: COLORES.borde,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: COLORES.blanco,
  },
  categoriaChipActiva: {
    backgroundColor: COLORES.azul,
    borderColor: COLORES.azul,
  },
  categoriaTexto: {
    color: COLORES.texto,
    fontSize: 12,
    fontWeight: '600',
  },
  categoriaTextoActivo: {
    color: COLORES.blanco,
  },
  filaCampos: {
    flexDirection: 'row',
    gap: 12,
  },
  campoMitad: {
    flex: 1,
    minWidth: 0,
  },
  ayuda: {
    color: COLORES.gris,
    fontSize: 12,
    lineHeight: 17,
    marginTop: -8,
    marginBottom: 14,
  },
  botonesFormulario: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 5,
  },
  botonMitad: {
    flex: 1,
  },
  botonPrincipal: {
    backgroundColor: COLORES.naranja,
    borderRadius: 10,
    minHeight: 47,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  textoBotonPrincipal: {
    color: COLORES.blanco,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  botonSecundario: {
    borderWidth: 1,
    borderColor: COLORES.borde,
    borderRadius: 10,
    minHeight: 47,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  textoBotonSecundario: {
    color: COLORES.texto,
    fontSize: 13,
    fontWeight: '700',
  },
  botonDeshabilitado: {
    opacity: 0.6,
  },
});
