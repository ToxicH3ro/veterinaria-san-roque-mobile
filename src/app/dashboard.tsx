import { auth } from '@/lib/firebase';
import { obtenerDocumento } from '@/lib/firestore';
import { router } from 'expo-router';
import { useEffect } from 'react';

export default function Dashboard() {
  useEffect(() => {
    cargarUsuario();
  }, []);

  const cargarUsuario = async () => {
    try {
      const usuario = auth.currentUser;

      if (!usuario) {
        router.replace('/(auth)/login');
        return;
      }

      const datosUsuario: any = await obtenerDocumento(
        'usuarios',
        usuario.uid
      );

      if (!datosUsuario) {
        console.error('No existe el usuario en Firestore');
        return;
      }

      console.log('Datos del usuario:', datosUsuario);
      console.log('Rol del usuario:', datosUsuario.rol);

      if (datosUsuario.rol === 'usuario') {
        router.replace('/(user)/inicio');
        return;
      }

      if (datosUsuario.rol === 'veterinario') {
        router.replace('/(admin)/inicio');
        return;
      }

      console.error(
        'Rol no reconocido:',
        datosUsuario.rol
      );

    } catch (error) {
      console.error(
        'Error al obtener el usuario:',
        error
      );
    }
  };

  return null;
}