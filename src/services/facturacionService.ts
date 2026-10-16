import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';

import { auth, db } from '../lib/firebase';

export type EstadoFactura =
  | 'pendiente'
  | 'pagada'
  | 'atrasada';

export type TipoItemFactura =
  | 'producto'
  | 'servicio';

export interface ItemFactura {
  tipo?: TipoItemFactura;
  productoID?: string;
  nombre: string;
  cantidad: number;
  precio: number;
  subtotal: number;
  categoria?: string;
  [key: string]: unknown;
}

export interface ItemFacturaInput {
  tipo?: TipoItemFactura;
  productoID?: string;
  productoId?: string;
  id?: string;
  nombre?: string;
  cantidad: number;
  precio?: number;
  categoria?: string;
  [key: string]: unknown;
}

export interface Factura {
  id: string;
  numero: string;
  Cliente: string;
  usuarioID: string;
  creadoEn?: Timestamp;
  fecha: Timestamp | Date | string;
  items: ItemFactura[];
  subtotal: number;
  total: number;
  estado: EstadoFactura;
}

export interface NuevaFactura {
  Cliente: string;
  usuarioID: string;
  fecha: Timestamp | Date | string;
  items: ItemFacturaInput[];
  subtotal?: number;
  total?: number;
}

const facturasRef = collection(db, 'facturas');
const inventarioRef = collection(db, 'inventario');

const contadorRef = doc(db, 'contadores', 'facturas');

/**
 * Crea una factura y descuenta los productos vendidos
 * dentro de una sola transacción de Firestore.
 *
 * Los servicios no descuentan inventario.
 * Los productos toman su precio y nombre del inventario.
 */
export const crearFacturaConInventario = async (
  datos: NuevaFactura
): Promise<string> => {
  const usuario = auth.currentUser;

  if (!usuario) {
    throw new Error('Debes iniciar sesión.');
  }

  if (!datos.Cliente?.trim()) {
    throw new Error('El nombre del cliente es obligatorio.');
  }

  if (!datos.usuarioID?.trim()) {
    throw new Error('Debes seleccionar al cliente de la factura.');
  }

  if (!Array.isArray(datos.items) || datos.items.length === 0) {
    throw new Error('La factura debe contener al menos un artículo.');
  }

  const productosNecesarios = new Map<string, number>();

  for (const item of datos.items) {
    if (!Number.isInteger(item.cantidad) || item.cantidad <= 0) {
      throw new Error('La cantidad de cada artículo debe ser un entero mayor que cero.');
    }

    const tipo = item.tipo ??
      ((item.productoID || item.productoId || item.id)
        ? 'producto'
        : 'servicio');

    if (tipo === 'producto') {
      const productoID =
        item.productoID ?? item.productoId ?? item.id;

      if (typeof productoID !== 'string' || !productoID.trim()) {
        throw new Error(
          `Falta el identificador del producto ${item.nombre ?? ''}.`
        );
      }

      productosNecesarios.set(
        productoID,
        (productosNecesarios.get(productoID) ?? 0) + item.cantidad
      );
    } else if (
      typeof item.nombre !== 'string' ||
      !item.nombre.trim() ||
      typeof item.precio !== 'number' ||
      !Number.isFinite(item.precio) ||
      item.precio < 0
    ) {
      throw new Error('Hay un servicio con datos o precio no válidos.');
    }
  }

  const facturaRef = doc(facturasRef);

  await runTransaction(db, async (transaction) => {
    // Primero se realizan todas las lecturas.
    const contadorSnap = await transaction.get(contadorRef);

    const referenciasProductos = Array.from(
      productosNecesarios.keys(),
      (productoID) => ({
        id: productoID,
        referencia: doc(inventarioRef, productoID),
      })
    );

    const snapshotsProductos = await Promise.all(
      referenciasProductos.map(({ referencia }) =>
        transaction.get(referencia)
      )
    );

    const productosActuales = new Map<
      string,
      {
        nombre: string;
        categoria: string;
        cantidad: number;
        precio: number;
      }
    >();

    snapshotsProductos.forEach((snapshot, index) => {
      const productoID = referenciasProductos[index].id;

      if (!snapshot.exists()) {
        throw new Error(
          `El producto ${productoID} ya no existe en el inventario.`
        );
      }

      const producto = snapshot.data();
      const cantidad = Number(producto.cantidad);
      const precio = Number(producto.precio);

      if (
        !Number.isFinite(cantidad) ||
        cantidad < 0 ||
        !Number.isFinite(precio) ||
        precio < 0
      ) {
        throw new Error(
          `El producto ${producto.nombre ?? productoID} tiene datos inválidos.`
        );
      }

      const cantidadSolicitada =
        productosNecesarios.get(productoID) ?? 0;

      if (cantidadSolicitada > cantidad) {
        throw new Error(
          `No hay suficiente inventario de ${producto.nombre}. ` +
          `Disponible: ${cantidad}. Solicitado: ${cantidadSolicitada}.`
        );
      }

      productosActuales.set(productoID, {
        nombre: String(producto.nombre ?? 'Producto'),
        categoria: String(producto.categoria ?? ''),
        cantidad,
        precio,
      });
    });

    const itemsCalculados: ItemFactura[] = datos.items.map((item) => {
      const tipo = item.tipo ??
        ((item.productoID || item.productoId || item.id)
          ? 'producto'
          : 'servicio');

      if (tipo === 'producto') {
        const productoID =
          item.productoID ?? item.productoId ?? item.id!;

        const producto = productosActuales.get(productoID);

        if (!producto) {
          throw new Error('No se pudo consultar un producto de la factura.');
        }

        return {
          tipo: 'producto',
          productoID,
          nombre: producto.nombre,
          categoria: producto.categoria,
          cantidad: item.cantidad,
          precio: producto.precio,
          subtotal: producto.precio * item.cantidad,
        };
      }

      return {
        tipo: 'servicio',
        nombre: item.nombre!.trim(),
        cantidad: item.cantidad,
        precio: item.precio!,
        subtotal: item.precio! * item.cantidad,
      };
    });

    const subtotalCalculado = itemsCalculados.reduce(
      (suma, item) => suma + item.subtotal,
      0
    );

    if (!Number.isFinite(subtotalCalculado) || subtotalCalculado <= 0) {
      throw new Error('El total de la factura debe ser mayor que cero.');
    }

    const ultimoNumero = contadorSnap.exists()
      ? Number(contadorSnap.data().ultimoNumero ?? 0)
      : 0;

    if (!Number.isSafeInteger(ultimoNumero) || ultimoNumero < 0) {
      throw new Error('El contador de facturas no es válido.');
    }

    const siguienteNumero = ultimoNumero + 1;
    const numero = `FAC-${String(siguienteNumero).padStart(3, '0')}`;

    // A partir de aquí comienzan las escrituras.
    transaction.set(contadorRef, {
      ultimoNumero: siguienteNumero,
    });

    for (const [productoID, cantidadVendida] of productosNecesarios) {
      const producto = productosActuales.get(productoID)!;
      const productoRef = doc(inventarioRef, productoID);

      transaction.update(productoRef, {
        cantidad: producto.cantidad - cantidadVendida,
      });
    }

    transaction.set(facturaRef, {
      Cliente: datos.Cliente.trim(),
      usuarioID: datos.usuarioID,
      fecha: serverTimestamp(),
      items: itemsCalculados,
      subtotal: subtotalCalculado,
      total: subtotalCalculado,
      numero,
      estado: 'pendiente',
      creadoEn: serverTimestamp(),
    });
  });

  return facturaRef.id;
};

/**
 * Alias para mantener compatibles las pantallas
 * que todavía llaman a crearFactura().
 */
export const crearFactura = crearFacturaConInventario;

/** Obtener todas las facturas para el panel del veterinario. */
export const obtenerFacturas = async (): Promise<Factura[]> => {
  if (!auth.currentUser) {
    throw new Error('Debes iniciar sesión.');
  }

  const consulta = query(
    facturasRef,
    orderBy('creadoEn', 'desc')
  );

  const resultado = await getDocs(consulta);

  return resultado.docs.map((documento) => ({
    id: documento.id,
    ...documento.data(),
  })) as Factura[];
};

/** Obtener únicamente las facturas del usuario autenticado. */
export const obtenerFacturasDeUsuario = async (): Promise<Factura[]> => {
  const usuario = auth.currentUser;

  if (!usuario) {
    throw new Error('Debes iniciar sesión.');
  }

  const consulta = query(
    facturasRef,
    where('usuarioID', '==', usuario.uid)
  );

  const resultado = await getDocs(consulta);

  return resultado.docs
    .map((documento) => ({
      id: documento.id,
      ...documento.data(),
    }) as Factura)
    .sort(
      (a, b) =>
        (b.creadoEn?.toMillis?.() ?? 0) -
        (a.creadoEn?.toMillis?.() ?? 0)
    );
};

/**
 * Se conserva para compatibilidad con código existente.
 * El flujo final de pagos y vencimientos deberá controlar
 * quién puede cambiar el estado de una factura.
 */
export const actualizarEstadoFactura = async (
  facturaID: string,
  estado: EstadoFactura
): Promise<void> => {
  if (!auth.currentUser) {
    throw new Error('Debes iniciar sesión.');
  }

  await updateDoc(doc(db, 'facturas', facturaID), { estado });
};
