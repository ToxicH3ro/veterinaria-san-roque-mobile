import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from 'firebase/firestore';

import { auth, db } from '../lib/firebase';

export type EstadoPago =
  | 'pendiente_verificacion'
  | 'confirmado'
  | 'rechazado';

export interface Pago {
  id: string;
  facturaID: string;
  usuarioID: string;
  monto: number;
  metodo: string;
  estado: EstadoPago;
  creadoEn?: unknown;
  verificadoEn?: unknown;
  rechazadoEn?: unknown;
}

const pagosRef = collection(db, 'pagos');

// El usuario solicita pagar una factura propia.
export const solicitarPago = async (
  facturaID: string,
  metodo: string
): Promise<string> => {
  const usuario = auth.currentUser;

  if (!usuario) {
    throw new Error('Debes iniciar sesión.');
  }

  if (!metodo.trim()) {
    throw new Error('Selecciona un método de pago.');
  }

  const facturaRef = doc(db, 'facturas', facturaID);
  const facturaSnap = await getDoc(facturaRef);

  if (!facturaSnap.exists()) {
    throw new Error('La factura no existe.');
  }

  const factura = facturaSnap.data();

  if (factura.usuarioID !== usuario.uid) {
    throw new Error('No puedes pagar una factura ajena.');
  }

  if (!['pendiente', 'atrasada'].includes(factura.estado)) {
    throw new Error('Esta factura no está pendiente de pago.');
  }

  const monto = factura.total;

  if (typeof monto !== 'number' || monto <= 0) {
    throw new Error('El monto de la factura no es válido.');
  }

  const pagoRef = await addDoc(pagosRef, {
    facturaID,
    usuarioID: usuario.uid,
    monto,
    metodo,
    estado: 'pendiente_verificacion',
    creadoEn: serverTimestamp(),
  });

  return pagoRef.id;
};

// Consultar las solicitudes de pago del usuario actual.
export const obtenerPagosDeUsuario = async (): Promise<Pago[]> => {
  const usuario = auth.currentUser;

  if (!usuario) {
    throw new Error('Debes iniciar sesión.');
  }

  const consulta = query(
    pagosRef,
    where('usuarioID', '==', usuario.uid)
  );

  const resultado = await getDocs(consulta);

  return resultado.docs.map((documento) => ({
    id: documento.id,
    ...documento.data(),
  })) as Pago[];
};

// Consultar todas las solicitudes para administración.
export const obtenerPagos = async (): Promise<Pago[]> => {
  if (!auth.currentUser) {
    throw new Error('Debes iniciar sesión.');
  }

  const consulta = query(
    pagosRef,
    orderBy('creadoEn', 'desc')
  );

  const resultado = await getDocs(consulta);

  return resultado.docs.map((documento) => ({
    id: documento.id,
    ...documento.data(),
  })) as Pago[];
};

// El veterinario confirma o rechaza una solicitud.
export const procesarPago = async (
  pagoID: string,
  decision: 'confirmado' | 'rechazado'
): Promise<void> => {
  if (!auth.currentUser) {
    throw new Error('Debes iniciar sesión.');
  }

  const pagoRef = doc(db, 'pagos', pagoID);

  await runTransaction(db, async (transaction) => {
    const pagoSnap = await transaction.get(pagoRef);

    if (!pagoSnap.exists()) {
      throw new Error('La solicitud de pago no existe.');
    }

    const pago = pagoSnap.data();

    if (pago.estado !== 'pendiente_verificacion') {
      throw new Error('Esta solicitud ya fue procesada.');
    }

    if (decision === 'rechazado') {
      transaction.update(pagoRef, {
        estado: 'rechazado',
        rechazadoEn: serverTimestamp(),
      });

      return;
    }

    const facturaRef = doc(db, 'facturas', pago.facturaID);
    const facturaSnap = await transaction.get(facturaRef);

    if (!facturaSnap.exists()) {
      throw new Error('No se encontró la factura asociada.');
    }

    const factura = facturaSnap.data();

    if (factura.usuarioID !== pago.usuarioID) {
      throw new Error('El propietario de la factura no coincide.');
    }

    if (factura.total !== pago.monto) {
      throw new Error('El monto del pago no coincide con la factura.');
    }

    if (!['pendiente', 'atrasada'].includes(factura.estado)) {
      throw new Error('La factura ya no admite este pago.');
    }

    transaction.update(pagoRef, {
      estado: 'confirmado',
      verificadoEn: serverTimestamp(),
    });

    transaction.update(facturaRef, {
      estado: 'pagada',
    });
  });
};