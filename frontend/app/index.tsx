import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

export default function Index() {
  const router = useRouter();

  const navigateToHome = () => {
    router.push('/screens/HomeScreen');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
      
      <View style={styles.content}>
        <Text style={styles.welcomeText}>Добро пожаловать в 3D Printing App!</Text>
        <Text style={styles.subtitle}>
          Создавайте, просматривайте и заказывайте 3D-модели для печати
        </Text>
        
        <TouchableOpacity style={styles.startButton} onPress={navigateToHome}>
          <MaterialIcons name="arrow-forward" size={24} color="#000" />
          <Text style={styles.startButtonText}>Начать</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginBottom: 32,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00d4ff',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginLeft: 8,
  },
});