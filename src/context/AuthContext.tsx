import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from 'react';

import {
    onAuthStateChanged,
    type User,
} from 'firebase/auth';

import {
    doc,
    getDoc,
} from 'firebase/firestore';

import { auth, db } from '@/lib/firebase';

// =====================================================
// INTERFAZ DEL PERFIL DE FIRESTORE
// =====================================================

export interface UsuarioPerfil {
  nombre?: string;
  apellido?: string;
  correo?: string;
  telefono?: string;
  direccion?: string;
  rol?: string;
}

// =====================================================
// INTERFAZ DEL CONTEXTO
// =====================================================

interface AuthContextType {
  usuario: User | null;
  perfil: UsuarioPerfil | null;
  cargando: boolean;
  autenticado: boolean;
}

// =====================================================
// CREACIÓN DEL CONTEXTO
// =====================================================

const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

// =====================================================
// PROVEEDOR DE AUTENTICACIÓN
// =====================================================

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [usuario, setUsuario] = useState<User | null>(null);
  const [perfil, setPerfil] = useState<UsuarioPerfil | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activo = true;
    let revision = 0;

    const cancelarSuscripcion = onAuthStateChanged(
      auth,
      async (usuarioFirebase) => {
        const revisionActual = ++revision;

        if (!activo) return;

        setUsuario(usuarioFirebase);
        setPerfil(null);

        if (!usuarioFirebase) {
          setCargando(false);
          return;
        }

        setCargando(true);

        try {
          const usuarioRef = doc(
            db,
            'usuarios',
            usuarioFirebase.uid
          );

          const documento = await getDoc(usuarioRef);

          if (!activo || revisionActual !== revision) return;

          if (documento.exists()) {
            setPerfil(documento.data() as UsuarioPerfil);
          } else {
            console.warn(
              'El usuario autenticado no tiene un perfil en Firestore.'
            );

            setPerfil(null);
          }
        } catch (error) {
          console.error(
            'Error al obtener el perfil del usuario:',
            error
          );

          if (activo && revisionActual === revision) {
            setPerfil(null);
          }
        } finally {
          if (activo && revisionActual === revision) {
            setCargando(false);
          }
        }
      }
    );

    return () => {
      activo = false;
      cancelarSuscripcion();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        usuario,
        perfil,
        cargando,
        autenticado: usuario !== null,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// =====================================================
// HOOK PERSONALIZADO
// =====================================================

export const useAuth = (): AuthContextType => {
  const contexto = useContext(AuthContext);

  if (!contexto) {
    throw new Error(
      'useAuth debe utilizarse dentro de un AuthProvider.'
    );
  }

  return contexto;
};
