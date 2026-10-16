import {
    ActivityIndicator,
    StyleSheet,
    Text,
    View,
} from 'react-native';

interface LoadingProps {
  text?: string;
}

export default function Loading({
  text = 'Cargando...',
}: LoadingProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator
        size="large"
        color="#112250"
      />

      <Text style={styles.text}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },

  text: {
    marginTop: 12,
    color: '#555',
    fontSize: 15,
  },
});