import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    orderBy,
    query,
    serverTimestamp,
    updateDoc,
} from 'firebase/firestore';

import { db } from '@/lib/firebase';

const inventarioRef = collection(db, 'inventario');

// Modelo de un producto del inventario.
export interface ProductoInventario {
  id: string;
  nombre: string;
  categoria?: string;
  cantidad: number;
  precio: number;
  proveedor?: string;
  creadoEn?: unknown;
}

// Datos necesarios para crear un producto.
export interface ProductoInput {
  nombre: string;
  categoria?: string;
  cantidad: number;
  precio: number;
  proveedor?: string;
}

// Datos permitidos al actualizar un producto.
export interface ProductoActualizarInput {
  nombre: string;
  categoria?: string;
  cantidad: number;
  precio: number;
  proveedor?: string;
}

// Crear producto.
export const crearProducto = async (
  producto: ProductoInput
): Promise<ProductoInventario> => {
  const nuevoProducto = {
    ...producto,
    cantidad: Number(producto.cantidad),
    precio: Number(producto.precio),
    creadoEn: serverTimestamp(),
  };

  const documento = await addDoc(
    inventarioRef,
    nuevoProducto
  );

  return {
    id: documento.id,
    nombre: nuevoProducto.nombre,
    categoria: nuevoProducto.categoria,
    cantidad: nuevoProducto.cantidad,
    precio: nuevoProducto.precio,
    proveedor: nuevoProducto.proveedor,
    creadoEn: nuevoProducto.creadoEn,
  };
};

// Obtener todos los productos ordenados por nombre.
export const obtenerProductos =
  async (): Promise<ProductoInventario[]> => {
    const consulta = query(
      inventarioRef,
      orderBy('nombre')
    );

    const snapshot = await getDocs(consulta);

    return snapshot.docs.map((documento) => {
      const datos = documento.data();

      return {
        id: documento.id,
        nombre: String(datos.nombre ?? ''),
        categoria:
          typeof datos.categoria === 'string'
            ? datos.categoria
            : undefined,
        cantidad: Number(datos.cantidad ?? 0),
        precio: Number(datos.precio ?? 0),
        proveedor:
          typeof datos.proveedor === 'string'
            ? datos.proveedor
            : undefined,
        creadoEn: datos.creadoEn,
      };
    });
  };

// Actualizar producto.
export const actualizarProducto = async (
  productoId: string,
  producto: ProductoActualizarInput
): Promise<ProductoInventario> => {
  if (!productoId.trim()) {
    throw new Error(
      'No se especificó el producto que se desea actualizar.'
    );
  }

  const referencia = doc(
    db,
    'inventario',
    productoId
  );

  const documento = await getDoc(referencia);

  if (!documento.exists()) {
    throw new Error(
      'El producto no existe en el inventario.'
    );
  }

  const cantidad = Number(producto.cantidad);
  const precio = Number(producto.precio);

  if (!Number.isFinite(cantidad) || cantidad < 0) {
    throw new Error(
      'La cantidad debe ser un número válido igual o mayor que cero.'
    );
  }

  if (!Number.isFinite(precio) || precio < 0) {
    throw new Error(
      'El precio debe ser un número válido igual o mayor que cero.'
    );
  }

  const productoActualizado = {
    nombre: producto.nombre.trim(),
    categoria: producto.categoria ?? '',
    cantidad,
    precio,
    proveedor: producto.proveedor ?? '',
  };

  if (!productoActualizado.nombre) {
    throw new Error(
      'El nombre del producto es obligatorio.'
    );
  }

  await updateDoc(
    referencia,
    productoActualizado
  );

  return {
    id: productoId,
    ...productoActualizado,
  };
};

// Descontar unidades del inventario.
export const descontarProducto = async (
  productoId: string,
  cantidad: number
): Promise<{
  id: string;
  nombre: string;
  cantidadAnterior: number;
  cantidadDescontada: number;
  cantidadNueva: number;
}> => {
  if (!productoId.trim()) {
    throw new Error(
      'No se especificó el producto.'
    );
  }

  if (
    !Number.isFinite(cantidad) ||
    cantidad <= 0
  ) {
    throw new Error(
      'La cantidad a descontar debe ser mayor que 0.'
    );
  }

  const referencia = doc(
    db,
    'inventario',
    productoId
  );

  const documento = await getDoc(referencia);

  if (!documento.exists()) {
    throw new Error(
      'El producto no existe en el inventario.'
    );
  }

  const producto = documento.data();

  const cantidadActual =
    Number(producto.cantidad ?? 0);

  if (
    !Number.isFinite(cantidadActual) ||
    cantidadActual < 0
  ) {
    throw new Error(
      'La cantidad registrada en el inventario no es válida.'
    );
  }

  if (cantidad > cantidadActual) {
    throw new Error(
      `No hay suficiente inventario de ${producto.nombre}. Disponible: ${cantidadActual}.`
    );
  }

  const nuevaCantidad =
    cantidadActual - cantidad;

  await updateDoc(referencia, {
    cantidad: nuevaCantidad,
  });

  return {
    id: productoId,
    nombre: String(producto.nombre ?? ''),
    cantidadAnterior: cantidadActual,
    cantidadDescontada: cantidad,
    cantidadNueva: nuevaCantidad,
  };
};

// Eliminar producto.
export const eliminarProducto = async (
  productoId: string
): Promise<{ id: string }> => {
  if (!productoId.trim()) {
    throw new Error(
      'No se especificó el producto que se desea eliminar.'
    );
  }

  const referencia = doc(
    db,
    'inventario',
    productoId
  );

  const documento = await getDoc(referencia);

  if (!documento.exists()) {
    throw new Error(
      'El producto no existe en el inventario.'
    );
  }

  await deleteDoc(referencia);

  return {
    id: productoId,
  };
};