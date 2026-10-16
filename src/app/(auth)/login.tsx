import { auth } from '@/lib/firebase';
import { router } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useState } from 'react';
import {
  Alert,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const fondo = require('../../assets/images/fondo-huellas.png');

export default function Login() {
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!correo.trim() || !password) {
      Alert.alert(
        'Campos incompletos',
        'Ingresa tu correo electrónico y contraseña.'
      );
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(correo.trim())) {
      Alert.alert(
        'Correo inválido',
        'Ingresa un correo electrónico válido.'
      );
      return;
    }

    try {
      setLoading(true);

      const credential = await signInWithEmailAndPassword(
        auth,
        correo.trim(),
        password
      );

      console.log('Usuario autenticado:', credential.user.uid);

      Alert.alert(
        'Inicio de sesión correcto',
        'Has iniciado sesión correctamente.',
        [
          {
            text: 'Continuar',
            onPress: () => router.replace('/dashboard'),
          },
        ]
      );
    } catch (error: any) {
      console.error('Error al iniciar sesión:', error);

      if (
        error.code === 'auth/invalid-credential' ||
        error.code === 'auth/wrong-password' ||
        error.code === 'auth/user-not-found'
      ) {
        Alert.alert(
          'Datos incorrectos',
          'El correo o la contraseña son incorrectos.'
        );
      } else if (error.code === 'auth/invalid-email') {
        Alert.alert(
          'Correo inválido',
          'El correo electrónico no es válido.'
        );
      } else if (error.code === 'auth/too-many-requests') {
        Alert.alert(
          'Demasiados intentos',
          'Se han realizado demasiados intentos. Inténtalo nuevamente más tarde.'
        );
      } else {
        Alert.alert(
          'Error',
          'No fue posible iniciar sesión. Inténtalo nuevamente.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContainer}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.container}>
        <Text style={styles.title}>Bienvenido</Text>
        <Text style={styles.subtitle}>Usuario</Text>

        <ImageBackground source={fondo} style={styles.background} resizeMode="cover">
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#555555"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={correo}
              onChangeText={setCorreo}
            />

            <TextInput
              style={styles.input}
              placeholder="Contraseña"
              placeholderTextColor="#555555"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>
        </ImageBackground>

        <TouchableOpacity
          style={styles.forgotContainer}
          onPress={() =>
            Alert.alert(
              'Recuperar contraseña',
              'La recuperación de contraseña todavía no está implementada.'
            )
          }
        >
          <Text style={styles.linkText}>
            ¿Se te olvidó la Contraseña?
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Ingresando...' : 'Ingresar'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push('/register')}
          disabled={loading}
          style={styles.accountLink}
        >
          <Text style={styles.linkText}>
            No tienes cuenta aun?
          </Text>
        </TouchableOpacity>

        <Text style={styles.socialTitle}>O continua con:</Text>

        <View style={styles.socialRow}>
          <Text style={styles.socialIcon}>🌐</Text>
          <Text style={styles.socialIcon}>📘</Text>
          <Text style={styles.socialIcon}>🐦</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  background: {
  flex: 0.5,
  width: '100%',
  paddingHorizontal: 10,
  paddingVertical: 15,
  justifyContent: 'center',
},
  
  scrollContainer: {
    flexGrow: 1,
  },

  container: {
    flexGrow: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingVertical: 35,
  },
  
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#112250',
    textAlign: 'center',
    marginTop: 15,
  },

  subtitle: {
    fontSize: 21,
    fontWeight: '900',
    color: '#112250',
    textAlign: 'center',
    marginBottom: 8,
  },

  pawsBackground: {
    width: '100%',
    height: 180,
    justifyContent: 'center',
    marginTop: 0,
  },

  pawsImage: {
    opacity: 1,
  },

  form: {
  width: '100%',
  gap: 20,
},

  input: {
    height: 43,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5DADA',
    borderRadius: 7,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#222222',
  },

  forgotContainer: {
    alignSelf: 'center',
    marginTop: 3,
    marginBottom: 14,
  },

  linkText: {
    color: '#112250',
    fontSize: 12,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },

  button: {
    width: '58%',
    height: 39,
    backgroundColor: '#E97835',
    borderColor: '#D96326',
    borderWidth: 1,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  accountLink: {
    marginTop: 14,
    marginBottom: 10,
  },

  socialTitle: {
    color: '#E97835',
    fontSize: 12,
    fontWeight: '600',
    textDecorationLine: 'underline',
    marginBottom: 10,
  },

  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 25,
  },

  socialIcon: {
    color: '#262626',
    fontSize: 32,
    fontWeight: 'bold',
  },

  twitterIcon: {
    color: '#262626',
    fontSize: 28,
  },
});
