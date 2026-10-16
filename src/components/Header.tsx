import { useState } from 'react';
import {
  Image,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface HeaderProps {
  title: string;
  onSettings?: () => void;
  onLogout?: () => void;
}

export default function Header({
  title,
  onSettings,
  onLogout,
}: HeaderProps) {
  const insets = useSafeAreaInsets();

  const [menuVisible, setMenuVisible] = useState(false);
  const [notificaciones, setNotificaciones] = useState(true);

  const logo = require('../assets/images/logo-veterinario.png');

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.container,
          { paddingTop: insets.top + 8 },
        ]}
      >
        {/* Botón de configuración */}
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => setMenuVisible(!menuVisible)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Abrir configuración"
          accessibilityState={{ expanded: menuVisible }}
        >
          <Text style={styles.icon}>⚙️</Text>
        </TouchableOpacity>

        {/* Logo y título centrados */}
        <View style={styles.center}>
          <Image
            source={logo}
            style={styles.logo}
            resizeMode="contain"
            accessibilityLabel="Logo de Veterinaria San Roque"
          />

          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        </View>

        {/* Botón de cerrar sesión */}
        <TouchableOpacity
          style={styles.iconButton}
          onPress={onLogout}
          disabled={!onLogout}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Cerrar sesión"
        >
          <Text style={styles.icon}>🚪</Text>
        </TouchableOpacity>
      </View>

      {/* Menú de configuración */}
      {menuVisible && (
        <View style={styles.menu}>
          <Text style={styles.menuTitle}>
            Configuración
          </Text>

          <View style={styles.option}>
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>
                Notificaciones
              </Text>

              <Text style={styles.optionDescription}>
                {notificaciones
                  ? 'Notificaciones activadas'
                  : 'Notificaciones desactivadas'}
              </Text>
            </View>

            <Switch
              value={notificaciones}
              onValueChange={setNotificaciones}
              trackColor={{
                false: '#D5D9E2',
                true: '#A8B9E5',
              }}
              thumbColor={
                notificaciones ? '#112250' : '#FFFFFF'
              }
              accessibilityLabel="Activar o desactivar notificaciones"
            />
          </View>

          {onSettings && (
            <TouchableOpacity
              style={styles.profileOption}
              onPress={() => {
                setMenuVisible(false);
                onSettings();
              }}
              activeOpacity={0.7}
              accessibilityRole="button"
            >
              <Text style={styles.profileOptionText}>
                👤  Mi perfil
              </Text>

              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setMenuVisible(false)}
            activeOpacity={0.7}
            accessibilityRole="button"
          >
            <Text style={styles.closeText}>
              Cerrar menú
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#FFFFFF',
    zIndex: 100,
    elevation: 8,
  },

  container: {
    minHeight: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingBottom: 12,
    backgroundColor: '#112250',
  },

  iconButton: {
    width: 44,
    height: 44,
    flexShrink: 0,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },

  icon: {
    fontSize: 21,
    textAlign: 'center',
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },

  logo: {
    width: 40,
    height: 40,
    marginBottom: 3,
  },

  title: {
    width: '100%',
    textAlign: 'center',
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },

  menu: {
    paddingHorizontal: 18,
    paddingTop: 17,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    borderTopWidth: 1,
    borderTopColor: '#EEF1F6',
  },

  menuTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#112250',
    marginBottom: 15,
  },

  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },

  optionText: {
    flex: 1,
    marginRight: 12,
  },

  optionTitle: {
    color: '#112250',
    fontSize: 15,
    fontWeight: '600',
  },

  optionDescription: {
    color: '#737D91',
    fontSize: 12,
    marginTop: 4,
  },

  profileOption: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#EEF1F6',
    marginTop: 5,
    paddingVertical: 10,
  },

  profileOptionText: {
    color: '#112250',
    fontSize: 14,
    fontWeight: '600',
  },

  arrow: {
    color: '#112250',
    fontSize: 25,
  },

  closeButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    marginTop: 5,
    borderRadius: 10,
    backgroundColor: '#F0F3F9',
  },

  closeText: {
    color: '#112250',
    fontSize: 14,
    fontWeight: '600',
  },
});