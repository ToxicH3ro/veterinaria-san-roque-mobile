import {
    createUserWithEmailAndPassword,
    deleteUser,
    GoogleAuthProvider,
    signInWithCredential,
    signInWithEmailAndPassword,
    signOut,
    type UserCredential,
} from 'firebase/auth';

import {
    doc,
    getDoc,
    setDoc,
} from 'firebase/firestore';

import {
    GoogleSignin,
} from '@react-native-google-signin/google-signin';

import { auth, db } from '@/lib/firebase';

// =====================================================
// CONFIGURACIÓN DE GOOGLE SIGN-IN
// =====================================================

GoogleSignin.configure({
  webClientId:
    '358287432264-p8c2ndtgdvvhv9g4o5qqdbf28r0npih1.apps.googleusercontent.com',
});

// =====================================================
// INICIAR SESIÓN CON CORREO
// =====================================================

export const iniciarSesionConCorreo = async (
  correo: string,
  contrasena: string
): Promise<UserCredential> => {
  return await signInWithEmailAndPassword(
    auth,
    correo.trim(),
    contrasena
  );
};

// =====================================================
// REGISTRAR USUARIO CON CORREO
// =====================================================

interface DatosRegistro {
  nombre: string;
  apellido: string;
  correo: string;
  telefono: string;
  direccion: string;
  contrasena: string;
}

export const registrarConCorreo = async (
  datos: DatosRegistro
): Promise<UserCredential> => {
  const credencial = await createUserWithEmailAndPassword(
    auth,
    datos.correo.trim(),
    datos.contrasena
  );

  try {
    await setDoc(doc(db, 'usuarios', credencial.user.uid), {
      nombre: datos.nombre.trim(),
      apellido: datos.apellido.trim(),
      correo: datos.correo.trim(),
      telefono: datos.telefono.trim(),
      direccion: datos.direccion.trim(),
      rol: 'usuario',
    });

    return credencial;
  } catch (error) {
    // Si falla la creación del perfil, eliminamos
    // la cuenta recién creada para evitar registros incompletos.
    await deleteUser(credencial.user);
    throw error;
  }
};

// =====================================================
// INICIAR SESIÓN CON GOOGLE
// =====================================================

export const iniciarSesionConGoogle = async (): Promise<UserCredential | null> => {
  await GoogleSignin.hasPlayServices({
    showPlayServicesUpdateDialog: true,
  });

  const respuesta = await GoogleSignin.signIn();

  // El usuario canceló el proceso.
  if (respuesta.type !== 'success') {
    return null;
  }

  const idToken = respuesta.data.idToken;

  if (!idToken) {
    throw new Error('Google no proporcionó un token de autenticación.');
  }

  const credencialGoogle = GoogleAuthProvider.credential(idToken);

  const credencialFirebase = await signInWithCredential(
    auth,
    credencialGoogle
  );

  // Crear perfil únicamente si todavía no existe.
  const usuarioRef = doc(
    db,
    'usuarios',
    credencialFirebase.user.uid
  );

  const usuarioExistente = await getDoc(usuarioRef);

  if (!usuarioExistente.exists()) {
    const nombreCompleto =
      credencialFirebase.user.displayName || 'Usuario';

    const partesNombre = nombreCompleto.trim().split(/\s+/);

    const nombre = partesNombre.shift() || 'Usuario';
    const apellido = partesNombre.join(' ');

    await setDoc(usuarioRef, {
      nombre,
      apellido,
      correo: credencialFirebase.user.email || '',
      telefono: credencialFirebase.user.phoneNumber || '',
      direccion: '',
      rol: 'usuario',
    });
  }

  return credencialFirebase;
};

// =====================================================
// CERRAR SESIÓN
// =====================================================

export const cerrarSesion = async (): Promise<void> => {
  await signOut(auth);

  try {
    await GoogleSignin.signOut();
  } catch {
    // La sesión de Firebase ya fue cerrada.
  }
};
