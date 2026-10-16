import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface PetCardProps {
  nombre: string;
  especie: string;
  raza?: string;
  onPress?: () => void;
}

export default function PetCard({
  nombre,
  especie,
  raza,
  onPress,
}: PetCardProps) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>🐶</Text>
      </View>

      <View style={styles.info}>
        <Text style={styles.name}>
          {nombre}
        </Text>

        <Text style={styles.details}>
          {especie}
          {raza ? ` • ${raza}` : ''}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 5,

    elevation: 2,
  },

  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F0F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },

  icon: {
    fontSize: 26,
  },

  info: {
    marginLeft: 14,
    flex: 1,
  },

  name: {
    color: '#112250',
    fontSize: 17,
    fontWeight: 'bold',
  },

  details: {
    color: '#666',
    fontSize: 14,
    marginTop: 4,
  },
});