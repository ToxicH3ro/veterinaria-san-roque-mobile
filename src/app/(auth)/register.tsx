import { auth, db } from '@/lib/firebase';
import { router } from 'expo-router';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
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

export default function Register() {
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [correo, setCorreo] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (
      !nombre.trim() ||
      !apellido.trim() ||
      !correo.trim() ||
      !telefono.trim() ||
      !direccion.trim() ||
      !password ||
      !confirmPassword
    ) {
      Alert.alert(
        'Campos incompletos',
        'Por favor completa todos los campos.'
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

    if (password.length < 6) {
      Alert.alert(
        'Contraseña inválida',
        'La contraseña debe tener al menos 6 caracteres.'
      );
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert(
        'Contraseñas diferentes',
        'Las contraseñas no coinciden.'
      );
      return;
    }

    try {
      setLoading(true);

      const credential = await createUserWithEmailAndPassword(
        auth,
        correo.trim(),
        password
      );

      const uid = credential.user.uid;

      await setDoc(doc(db, 'usuarios', uid), {
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        correo: correo.trim(),
        telefono: telefono.trim(),
        direccion: direccion.trim(),
        rol: 'usuario',
      });

      Alert.alert(
        'Cuenta creada',
        'Tu cuenta ha sido creada correctamente.',
        [
          {
            text: 'Continuar',
            onPress: () => router.replace('/login'),
          },
        ]
      );
    } catch (error: any) {
      console.error('Error al registrar usuario:', error);

      if (error.code === 'auth/email-already-in-use') {
        Alert.alert(
          'Correo registrado',
          'Ya existe una cuenta con este correo electrónico.'
        );
      } else if (error.code === 'auth/invalid-email') {
        Alert.alert(
          'Correo inválido',
          'El correo electrónico no es válido.'
        );
      } else if (error.code === 'auth/weak-password') {
        Alert.alert(
          'Contraseña débil',
          'La contraseña debe tener al menos 6 caracteres.'
        );
      } else {
        Alert.alert(
          'Error',
          'No fue posible crear la cuenta. Inténtalo nuevamente.'
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
        <Text style={styles.title}>Crear Cuenta</Text>

        <ImageBackground source={fondo} style={styles.background} resizeMode="cover">
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Nombre"
              placeholderTextColor="#555555"
              autoCapitalize="words"
              value={nombre}
              onChangeText={setNombre}
            />

            <TextInput
              style={styles.input}
              placeholder="Apellido"
              placeholderTextColor="#555555"
              autoCapitalize="words"
              value={apellido}
              onChangeText={setApellido}
            />

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
              placeholder="Teléfono"
              placeholderTextColor="#555555"
              keyboardType="phone-pad"
              value={telefono}
              onChangeText={setTelefono}
            />

            <TextInput
              style={styles.input}
              placeholder="Dirección"
              placeholderTextColor="#555555"
              autoCapitalize="sentences"
              value={direccion}
              onChangeText={setDireccion}
            />

            <TextInput
              style={styles.input}
              placeholder="Contraseña"
              placeholderTextColor="#555555"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            <TextInput
              style={styles.input}
              placeholder="Confirmar contraseña"
              placeholderTextColor="#555555"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
          </View>
        </ImageBackground>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Creando cuenta...' : 'Registrarse'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.replace('/login')}
          disabled={loading}
          style={styles.accountLink}
        >
          <Text style={styles.linkText}>
            Ya tienes cuenta?
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
  flex: 0.1,
  width: '100%',
  alignSelf: 'stretch',
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
    paddingVertical: 25,
  },

  title: {
    fontSize: 29,
    fontWeight: '900',
    color: '#112250',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 12,
  },

  pawsBackground: {
    width: '100%',
    minHeight: 350,
    justifyContent: 'center',
  },

  pawsImage: {
    opacity: 1,
  },

  form: {
  width: '100%',
  gap: 10,
},

  input: {
    height: 37,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5DADA',
    borderRadius: 7,
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#222222',
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
    marginTop: 5,
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
    marginTop: 12,
    marginBottom: 10,
  },

  linkText: {
    color: '#112250',
    fontSize: 12,
    textAlign: 'center',
    textDecorationLine: 'underline',
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
