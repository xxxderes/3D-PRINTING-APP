import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Order {
  id: string;
  model_name: string;
  total_price: number;
  status: string;
  payment_status: string;
  created_at: string;
  estimated_completion?: string;
}

export default function OrdersScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        router.replace('/auth');
        return;
      }

      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/orders/my`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders);
      } else {
        Alert.alert('Ошибка', 'Не удалось загрузить заказы');
      }
    } catch (error) {
      console.error('Orders loading error:', error);
      Alert.alert('Ошибка', 'Проблема с сетью');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#fdcb6e';
      case 'confirmed': return '#00d4ff';
      case 'printing': return '#6c5ce7';
      case 'completed': return '#00cec9';
      case 'cancelled': return '#ff7675';
      default: return '#888';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Ожидает';
      case 'confirmed': return 'Подтверждён';
      case 'printing': return 'Печатается';
      case 'completed': return 'Завершён';
      case 'cancelled': return 'Отменён';
      default: return status;
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#fdcb6e';
      case 'paid': return '#00cec9';
      case 'failed': return '#ff7675';
      default: return '#888';
    }
  };

  const getPaymentStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Ожидает оплаты';
      case 'paid': return 'Оплачено';
      case 'failed': return 'Ошибка оплаты';
      default: return status;
    }
  };

  const renderOrderCard = ({ item }: { item: Order }) => (
    <TouchableOpacity style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <Text style={styles.modelName} numberOfLines={2}>
          {item.model_name}
        </Text>
        <Text style={styles.orderPrice}>{item.total_price} ₽</Text>
      </View>

      <View style={styles.orderMeta}>
        <View style={styles.statusContainer}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
          </View>
          
          <View style={[styles.paymentBadge, { backgroundColor: getPaymentStatusColor(item.payment_status) }]}>
            <Text style={styles.paymentText}>{getPaymentStatusText(item.payment_status)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.orderFooter}>
        <View style={styles.dateContainer}>
          <MaterialIcons name="date-range" size={16} color="#888" />
          <Text style={styles.dateText}>
            {new Date(item.created_at).toLocaleDateString('ru')}
          </Text>
        </View>

        {item.estimated_completion && (
          <View style={styles.completionContainer}>
            <MaterialIcons name="schedule" size={16} color="#888" />
            <Text style={styles.completionText}>
              До: {new Date(item.estimated_completion).toLocaleDateString('ru')}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.orderActions}>
        {item.status === 'pending' && (
          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={() => Alert.alert('Отмена заказа', 'Функция будет добавлена в следующих версиях')}
          >
            <Text style={styles.cancelButtonText}>Отменить</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity 
          style={styles.detailsButton}
          onPress={() => Alert.alert('Детали заказа', `ID заказа: ${item.id}`)}
        >
          <Text style={styles.detailsButtonText}>Подробнее</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

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
        <Text style={styles.headerTitle}>Мои заказы</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Orders List */}
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        renderItem={renderOrderCard}
        contentContainerStyle={styles.ordersContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#00d4ff']}
            tintColor="#00d4ff"
          />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="receipt" size={64} color="#333" />
            <Text style={styles.emptyText}>
              {loading ? 'Загрузка заказов...' : 'У вас пока нет заказов'}
            </Text>
            {!loading && (
              <TouchableOpacity 
                style={styles.browseButton}
                onPress={() => router.push('/catalog')}
              >
                <Text style={styles.browseButtonText}>Просмотреть каталог</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
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
  ordersContainer: {
    padding: 16,
  },
  orderCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  modelName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
    marginRight: 12,
  },
  orderPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#00d4ff',
  },
  orderMeta: {
    marginBottom: 12,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  paymentBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  paymentText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    color: '#888',
    fontSize: 14,
    marginLeft: 6,
  },
  completionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  completionText: {
    color: '#888',
    fontSize: 14,
    marginLeft: 6,
  },
  orderActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  cancelButton: {
    backgroundColor: '#ff7675',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    marginRight: 8,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  detailsButton: {
    backgroundColor: '#333',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  detailsButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  browseButton: {
    backgroundColor: '#00d4ff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  browseButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
});