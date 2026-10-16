import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';

import { db } from '../lib/firebase';

// Modelo de los clientes
export interface Cliente {
  id: string;
  nombre: string;
  apellido: string;
  correo: string;
  direccion: string;
  telefono: string;
}

// Modelo del perfil del veterinario
export interface PerfilUsuario {
  id: string;
  nombre: string;
  apellido: string;
  correo: string;
  telefono: string;
  direccion: string;
  rol: string;
}

// Obtener clientes
export const obtenerClientes = async (): Promise<Cliente[]> => {
  const referencia = collection(db, 'usuarios');

  const consulta = query(
    referencia,
    where('rol', '==', 'usuario')
  );

  const resultado = await getDocs(consulta);

  return resultado.docs.map((documento) => {
    const datos = documento.data();

    return {
      id: documento.id,
      nombre: datos.nombre ?? '',
      apellido: datos.apellido ?? '',
      correo: datos.correo ?? datos.email ?? '',
      direccion: datos.direccion ?? '',
      telefono: datos.telefono ?? '',
    };
  });
};

// Obtener perfil por UID
export const obtenerPerfil = async (
  usuarioId: string
): Promise<PerfilUsuario> => {
  const referencia = doc(db, 'usuarios', usuarioId);
  const resultado = await getDoc(referencia);

  if (!resultado.exists()) {
    throw new Error('No se encontró el perfil del usuario.');
  }

  const datos = resultado.data();

  return {
    id: resultado.id,
    nombre: datos.nombre ?? '',
    apellido: datos.apellido ?? '',
    correo: datos.correo ?? datos.email ?? '',
    telefono: datos.telefono ?? '',
    direccion: datos.direccion ?? '',
    rol: datos.rol ?? '',
  };
};

// Actualizar datos del perfil
export const actualizarPerfil = async (
  usuarioId: string,
  datos: Pick<
    PerfilUsuario,
    'nombre' | 'apellido' | 'telefono' | 'direccion'
  >
): Promise<void> => {
  const referencia = doc(db, 'usuarios', usuarioId);

  await updateDoc(referencia, {
    nombre: datos.nombre.trim(),
    apellido: datos.apellido.trim(),
    telefono: datos.telefono.trim(),
    direccion: datos.direccion.trim(),
  });
};
