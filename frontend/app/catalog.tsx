import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  TextInput,
  FlatList,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Model3D {
  id: string;
  name: string;
  description: string;
  category: string;
  material_type: string;
  estimated_print_time: number;
  price?: number;
  owner_name: string;
  likes: number;
  downloads: number;
  created_at: string;
}

export default function CatalogScreen() {
  const router = useRouter();
  const [models, setModels] = useState<Model3D[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);

  const categories = [
    'Все категории',
    'Игрушки',
    'Декор',
    'Инструменты',
    'Украшения',
    'Запчасти',
    'Прототипы',
    'Образование',
    'Медицина',
    'Другое'
  ];

  useEffect(() => {
    loadModels();
  }, [selectedCategory]);

  const loadModels = async (reset = true) => {
    try {
      if (reset) {
        setLoading(true);
        setPage(1);
      }

      const params = new URLSearchParams();
      params.append('skip', reset ? '0' : ((page - 1) * 20).toString());
      params.append('limit', '20');
      if (selectedCategory && selectedCategory !== 'Все категории') {
        params.append('category', selectedCategory);
      }

      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/models/catalog?${params}`);
      const data = await response.json();

      if (response.ok) {
        if (reset) {
          setModels(data.models);
        } else {
          setModels(prev => [...prev, ...data.models]);
        }
        setPage(prev => prev + 1);
      } else {
        Alert.alert('Ошибка', 'Не удалось загрузить каталог');
      }
    } catch (error) {
      console.error('Catalog loading error:', error);
      Alert.alert('Ошибка', 'Проблема с сетью');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadModels(true);
  };

  const loadMore = () => {
    if (!loading) {
      loadModels(false);
    }
  };

  const filteredModels = models.filter(model =>
    model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    model.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    model.owner_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const navigateToModel = (modelId: string) => {
    router.push(`/model/${modelId}` as any);
  };

  const renderModelCard = ({ item }: { item: Model3D }) => (
    <TouchableOpacity 
      style={styles.modelCard}
      onPress={() => navigateToModel(item.id)}
    >
      {/* Model Preview - Placeholder for 3D thumbnail */}
      <View style={styles.modelPreview}>
        <MaterialIcons name="view-in-ar" size={48} color="#00d4ff" />
        <Text style={styles.previewText}>3D модель</Text>
      </View>

      <View style={styles.modelInfo}>
        <Text style={styles.modelName} numberOfLines={2}>
          {item.name}
        </Text>
        
        <Text style={styles.modelDescription} numberOfLines={2}>
          {item.description}
        </Text>

        <View style={styles.modelMeta}>
          <View style={styles.categoryTag}>
            <Text style={styles.categoryText}>{item.category}</Text>
          </View>
          
          <View style={styles.materialTag}>
            <Text style={styles.materialText}>{item.material_type}</Text>
          </View>
        </View>

        <View style={styles.modelStats}>
          <View style={styles.statItem}>
            <MaterialIcons name="schedule" size={16} color="#888" />
            <Text style={styles.statText}>{item.estimated_print_time}ч</Text>
          </View>
          
          <View style={styles.statItem}>
            <MaterialIcons name="favorite" size={16} color="#888" />
            <Text style={styles.statText}>{item.likes}</Text>
          </View>
          
          <View style={styles.statItem}>
            <MaterialIcons name="download" size={16} color="#888" />
            <Text style={styles.statText}>{item.downloads}</Text>
          </View>
        </View>

        <View style={styles.modelFooter}>
          <Text style={styles.ownerName}>by {item.owner_name}</Text>
          {item.price ? (
            <Text style={styles.modelPrice}>{item.price} ₽</Text>
          ) : (
            <Text style={styles.freePrice}>Бесплатно</Text>
          )}
        </View>
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
        <Text style={styles.headerTitle}>Каталог 3D моделей</Text>
        <TouchableOpacity 
          style={styles.uploadButton}
          onPress={() => router.push('/upload' as any)}
        >
          <MaterialIcons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <MaterialIcons name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Поиск моделей..."
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Category Filter */}
      <View style={styles.categoryContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScrollContent}
        >
          {categories.map((category, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.categoryChip,
                selectedCategory === category && styles.categoryChipActive
              ]}
              onPress={() => setSelectedCategory(category === 'Все категории' ? '' : category)}
            >
              <Text style={[
                styles.categoryChipText,
                selectedCategory === category && styles.categoryChipTextActive
              ]}>
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Models List */}
      <FlatList
        data={filteredModels}
        keyExtractor={(item) => item.id}
        renderItem={renderModelCard}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.modelsContainer}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={onRefresh}
        onEndReached={loadMore}
        onEndReachedThreshold={0.1}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="view-in-ar" size={64} color="#333" />
            <Text style={styles.emptyText}>
              {loading ? 'Загрузка моделей...' : 'Модели не найдены'}
            </Text>
            <TouchableOpacity 
              style={styles.uploadEmptyButton}
              onPress={() => router.push('/upload' as any)}
            >
              <Text style={styles.uploadEmptyButtonText}>Добавить первую модель</Text>
            </TouchableOpacity>
          </View>
        )}
        ListFooterComponent={() => (
          loading && models.length > 0 ? (
            <View style={styles.loadingFooter}>
              <Text style={styles.loadingText}>Загрузка...</Text>
            </View>
          ) : null
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  uploadButton: {
    padding: 8,
    backgroundColor: '#00d4ff',
    borderRadius: 20,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#1a1a1a',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    color: '#fff',
    fontSize: 16,
  },
  categoryContainer: {
    backgroundColor: '#1a1a1a',
    paddingBottom: 16,
  },
  categoryScrollContent: {
    paddingHorizontal: 20,
  },
  categoryChip: {
    backgroundColor: '#333',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
  },
  categoryChipActive: {
    backgroundColor: '#00d4ff',
  },
  categoryChipText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  categoryChipTextActive: {
    color: '#000',
  },
  modelsContainer: {
    padding: 16,
  },
  row: {
    justifyContent: 'space-between',
  },
  modelCard: {
    width: '48%',
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333',
  },
  modelPreview: {
    height: 120,
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewText: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
  },
  modelInfo: {
    padding: 12,
  },
  modelName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  modelDescription: {
    fontSize: 12,
    color: '#888',
    marginBottom: 8,
  },
  modelMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  categoryTag: {
    backgroundColor: '#6c5ce7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 4,
    marginBottom: 4,
  },
  categoryText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '500',
  },
  materialTag: {
    backgroundColor: '#00cec9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 4,
    marginBottom: 4,
  },
  materialText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '500',
  },
  modelStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    color: '#888',
    fontSize: 12,
    marginLeft: 4,
  },
  modelFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ownerName: {
    color: '#666',
    fontSize: 11,
    flex: 1,
  },
  modelPrice: {
    color: '#00d4ff',
    fontSize: 14,
    fontWeight: '600',
  },
  freePrice: {
    color: '#00cec9',
    fontSize: 12,
    fontWeight: '500',
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
  uploadEmptyButton: {
    backgroundColor: '#00d4ff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  uploadEmptyButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingFooter: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    color: '#666',
    fontSize: 14,
  },
});