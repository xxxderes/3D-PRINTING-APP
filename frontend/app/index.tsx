import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';

// Интерфейс для типизации user (устраняет ошибки ts(2339))
interface User {
  name: string;
  points: number;
  ordersCount: number;
  modelsCount: number;
}

export default function HomeScreen() {
  const router = useRouter();
  // Типизация user: User | null (устраняет never и ts(2339))
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const userData = await AsyncStorage.getItem('user_data');
      if (userData) {
        setUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    } finally {
      setLoading(false);
    }
  };

  const navigateToScreen = (screen: string) => {
    router.push(screen as any);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.loadingText}>Загрузка...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>3D Печать</Text>
        {user ? (
          <TouchableOpacity 
            style={styles.profileButton}
            onPress={() => navigateToScreen('/profile')}
          >
            <MaterialIcons name="account-circle" size={32} color="#00d4ff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={styles.loginButton}
            onPress={() => navigateToScreen('/auth')}
          >
            <Text style={styles.loginButtonText}>Войти</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        <Text style={styles.welcomeText}>
          {user ? `Добро пожаловать, ${user.name}!` : 'Добро пожаловать в мир 3D печати!'}
        </Text>
        
        {/* Main Action Buttons */}
        <View style={styles.actionsGrid}>
          <TouchableOpacity 
            style={[styles.actionCard, styles.primaryCard]}
            onPress={() => navigateToScreen('/calculator')}
          >
            <MaterialIcons name="calculate" size={48} color="#fff" />
            <Text style={styles.actionTitle}>Калькулятор</Text>
            <Text style={styles.actionSubtitle}>Рассчитать стоимость печати</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionCard, styles.secondaryCard]}
            onPress={() => navigateToScreen('/catalog')}
          >
            <MaterialIcons name="view-in-ar" size={48} color="#fff" />
            <Text style={styles.actionTitle}>Каталог</Text>
            <Text style={styles.actionSubtitle}>Готовые 3D модели</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionCard, styles.accentCard]}
            onPress={() => navigateToScreen('/upload')}
          >
            <MaterialIcons name="cloud-upload" size={48} color="#fff" />
            <Text style={styles.actionTitle}>Загрузить</Text>
            <Text style={styles.actionSubtitle}>Добавить свою модель</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionCard, styles.warningCard]}
            onPress={() => navigateToScreen('/orders')}
          >
            <MaterialIcons name="receipt" size={48} color="#fff" />
            <Text style={styles.actionTitle}>Заказы</Text>
            <Text style={styles.actionSubtitle}>История заказов</Text>
          </TouchableOpacity>
        </View>

        {/* User Stats */}
        {user && (
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{user.points || 0}</Text>
              <Text style={styles.statLabel}>Баллы</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{user.ordersCount || 0}</Text>
              <Text style={styles.statLabel}>Заказы</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{user.modelsCount || 0}</Text>
              <Text style={styles.statLabel}>Модели</Text>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  profileButton: {
    padding: 4,
  },
  loginButton: {
    backgroundColor: '#00d4ff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  loginButtonText: {
    color: '#000',
    fontWeight: '600',
    fontSize: 14,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  welcomeText: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 32,
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  actionCard: {
    width: '48%',
    aspectRatio: 1.2,
    borderRadius: 16,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  primaryCard: {
    backgroundColor: '#00d4ff',
  },
  secondaryCard: {
    backgroundColor: '#6c5ce7',
  },
  accentCard: {
    backgroundColor: '#00cec9',
  },
  warningCard: {
    backgroundColor: '#fdcb6e',
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 12,
    textAlign: 'center',
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.9,
    textAlign: 'center',
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00d4ff',
  },
  statLabel: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },
});