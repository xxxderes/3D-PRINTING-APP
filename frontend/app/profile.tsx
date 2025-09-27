import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        router.replace('/auth');
        return;
      }

      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/user/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        // Update local storage
        await AsyncStorage.setItem('user_data', JSON.stringify(userData));
      } else {
        // Token might be expired
        await AsyncStorage.removeItem('auth_token');
        await AsyncStorage.removeItem('user_data');
        router.replace('/auth');
      }
    } catch (error) {
      console.error('Profile loading error:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить профиль');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Выход',
      'Вы уверены, что хотите выйти?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Выйти',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('auth_token');
              await AsyncStorage.removeItem('user_data');
              router.replace('/');
            } catch (error) {
              console.error('Logout error:', error);
            }
          },
        },
      ]
    );
  };

  const navigateToScreen = (screen: string) => {
    router.push(screen as any);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.loadingText}>Загрузка профиля...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Профиль не найден</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Профиль</Text>
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <MaterialIcons name="logout" size={24} color="#ff4757" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* User Info */}
        <View style={styles.userInfoContainer}>
          <View style={styles.avatarContainer}>
            <MaterialIcons name="account-circle" size={80} color="#00d4ff" />
          </View>
          
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
          
          <View style={styles.joinDateContainer}>
            <MaterialIcons name="calendar-today" size={16} color="#888" />
            <Text style={styles.joinDate}>
              Регистрация: {new Date(user.created_at).toLocaleDateString('ru')}
            </Text>
          </View>
        </View>

        {/* User Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <MaterialIcons name="stars" size={32} color="#fdcb6e" />
            <Text style={styles.statValue}>{user.points}</Text>
            <Text style={styles.statLabel}>Баллы</Text>
          </View>
          
          <View style={styles.statCard}>
            <MaterialIcons name="receipt" size={32} color="#00d4ff" />
            <Text style={styles.statValue}>{user.orders_count}</Text>
            <Text style={styles.statLabel}>Заказы</Text>
          </View>
          
          <View style={styles.statCard}>
            <MaterialIcons name="view-in-ar" size={32} color="#6c5ce7" />
            <Text style={styles.statValue}>{user.models_count}</Text>
            <Text style={styles.statLabel}>Модели</Text>
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => navigateToScreen('/orders')}
          >
            <View style={styles.menuItemLeft}>
              <MaterialIcons name="receipt" size={24} color="#00d4ff" />
              <Text style={styles.menuItemText}>Мои заказы</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => navigateToScreen('/my-models')}
          >
            <View style={styles.menuItemLeft}>
              <MaterialIcons name="view-in-ar" size={24} color="#6c5ce7" />
              <Text style={styles.menuItemText}>Мои модели</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => navigateToScreen('/bonus-history')}
          >
            <View style={styles.menuItemLeft}>
              <MaterialIcons name="stars" size={24} color="#fdcb6e" />
              <Text style={styles.menuItemText}>История баллов</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => Alert.alert('Уведомления', 'Функция будет добавлена в следующих версиях')}
          >
            <View style={styles.menuItemLeft}>
              <MaterialIcons name="notifications" size={24} color="#00cec9" />
              <Text style={styles.menuItemText}>Уведомления</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => Alert.alert('Настройки', 'Функция будет добавлена в следующих версиях')}
          >
            <View style={styles.menuItemLeft}>
              <MaterialIcons name="settings" size={24} color="#888" />
              <Text style={styles.menuItemText}>Настройки</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => Alert.alert('Помощь', 'Свяжитесь с нами по email: support@3dprint.ru')}
          >
            <View style={styles.menuItemLeft}>
              <MaterialIcons name="help" size={24} color="#ff7675" />
              <Text style={styles.menuItemText}>Помощь и поддержка</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Bonus Section */}
        <View style={styles.bonusContainer}>
          <Text style={styles.bonusTitle}>Как заработать баллы?</Text>
          
          <View style={styles.bonusItem}>
            <MaterialIcons name="cloud-upload" size={20} color="#00d4ff" />
            <Text style={styles.bonusText}>+50 баллов за загрузку модели</Text>
          </View>
          
          <View style={styles.bonusItem}>
            <MaterialIcons name="shopping-cart" size={20} color="#00cec9" />
            <Text style={styles.bonusText}>+1 балл за каждые 100₽ заказа</Text>
          </View>
          
          <View style={styles.bonusItem}>
            <MaterialIcons name="videocam" size={20} color="#fdcb6e" />
            <Text style={styles.bonusText}>+10 баллов за просмотр рекламы</Text>
          </View>
          
          <View style={styles.bonusItem}>
            <MaterialIcons name="favorite" size={20} color="#ff4757" />
            <Text style={styles.bonusText}>+5 баллов за лайк модели</Text>
          </View>
        </View>
      </ScrollView>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  logoutButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
  },
  errorText: {
    color: '#666',
    fontSize: 18,
  },
  userInfoContainer: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#1a1a1a',
    marginBottom: 20,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: '#888',
    marginBottom: 12,
  },
  joinDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  joinDate: {
    fontSize: 14,
    color: '#888',
    marginLeft: 6,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  menuContainer: {
    backgroundColor: '#1a1a1a',
    marginHorizontal: 20,
    borderRadius: 16,
    marginBottom: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuItemText: {
    fontSize: 16,
    color: '#fff',
    marginLeft: 16,
  },
  bonusContainer: {
    backgroundColor: '#1a1a1a',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
  },
  bonusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  bonusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  bonusText: {
    fontSize: 14,
    color: '#ccc',
    marginLeft: 12,
  },
});