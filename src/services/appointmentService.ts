import {
  addDoc,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface Appointment {
  id: string;
  creadoEn?: unknown;
  estado: string;
  fecha: string;
  hora: string;
  mascota: string;
  tipo: string;
  usuarioID: string;
}

const COLECCION_CITAS = 'citas';

/**
 * Obtener todas las citas registradas.
 */
export const obtenerCitas = async (): Promise<Appointment[]> => {
  const referencia = collection(db, COLECCION_CITAS);

  const consulta = query(
    referencia,
    orderBy('creadoEn', 'desc')
  );

  const resultado = await getDocs(consulta);

  return resultado.docs.map((documento) => ({
    id: documento.id,
    ...documento.data(),
  })) as Appointment[];
};

/**
 * Registrar una nueva cita.
 */
export const crearCita = async (
  datos: Omit<Appointment, 'id' | 'creadoEn'>
) => {
  const referencia = collection(db, COLECCION_CITAS);

  const documento = await addDoc(referencia, {
    ...datos,
    creadoEn: serverTimestamp(),
  });

  return documento.id;
};

/**
 * Actualizar el estado de una cita.
 */
export const actualizarEstadoCita = async (
  id: string,
  estado: string
) => {
  const referencia = doc(db, COLECCION_CITAS, id);

  await updateDoc(referencia, { estado });
};

/**
 * Obtener únicamente las citas de un usuario.
 */
export const obtenerCitasDeUsuario = async (
  usuarioID: string
): Promise<Appointment[]> => {
  const referencia = collection(db, COLECCION_CITAS);

  const consulta = query(
    referencia,
    where('usuarioID', '==', usuarioID)
  );

  const resultado = await getDocs(consulta);

  return resultado.docs
    .map((documento) => ({
      id: documento.id,
      ...documento.data(),
    }) as Appointment)
    .sort((a, b) =>
      `${b.fecha} ${b.hora}`.localeCompare(`${a.fecha} ${a.hora}`)
    );
};