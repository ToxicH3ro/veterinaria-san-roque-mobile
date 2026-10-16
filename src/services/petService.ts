import {
  addDoc,
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore';

import { db } from '../lib/firebase';

export interface Pet {
  id: string;
  nombre: string;
  especie: string;
  raza: string;
  usuarioId: string;
  propietarioNombre?: string;
}

export const obtenerPacientes = async (): Promise<Pet[]> => {
  const mascotasRef = collection(db, 'mascotas');
  const usuariosRef = collection(db, 'usuarios');

  // Obtener mascotas y clientes en paralelo.
  const [mascotasSnapshot, usuariosSnapshot] = await Promise.all([
    getDocs(mascotasRef),
    getDocs(query(usuariosRef, where('rol', '==', 'usuario'))),
  ]);

  // Relacionar el ID del documento de usuario con su nombre.
  const propietarios = new Map<string, string>();

  usuariosSnapshot.docs.forEach((documento) => {
    const datos = documento.data();

    const nombreCompleto = [
      datos.nombre,
      datos.apellido,
    ]
      .filter(
        (parte): parte is string =>
          typeof parte === 'string' && parte.trim().length > 0
      )
      .map((parte) => parte.trim())
      .join(' ');

    propietarios.set(documento.id, nombreCompleto);
  });

  return mascotasSnapshot.docs.map((documento) => {
    const datos = documento.data();
    const usuarioId = String(datos.usuarioId ?? '');

    return {
      id: documento.id,
      nombre: String(datos.nombre ?? ''),
      especie: String(datos.especie ?? ''),
      raza: String(datos.raza ?? ''),
      usuarioId,
      propietarioNombre:
        propietarios.get(usuarioId) || '',
    };
  });
};

export const obtenerMascotasDeUsuario = async (
  usuarioId: string
): Promise<Pet[]> => {
  const referencia = collection(db, 'mascotas');

  const consulta = query(
    referencia,
    where('usuarioId', '==', usuarioId)
  );

  const resultado = await getDocs(consulta);

  return resultado.docs.map((documento) => {
    const datos = documento.data();

    return {
      id: documento.id,
      nombre: datos.nombre ?? '',
      especie: datos.especie ?? '',
      raza: datos.raza ?? '',
      usuarioId: datos.usuarioId ?? '',
    };
  });
};

export const registrarMascota = async (
  mascota: Omit<Pet, 'id'>
): Promise<void> => {
  const referencia = collection(db, 'mascotas');

  await addDoc(referencia, {
    nombre: mascota.nombre.trim(),
    especie: mascota.especie.trim(),
    raza: mascota.raza.trim(),
    usuarioId: mascota.usuarioId,
  });
};
