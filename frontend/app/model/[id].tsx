import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import * as THREE from 'three';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface Model3D {
  id: string;
  name: string;
  description: string;
  category: string;
  material_type: string;
  estimated_print_time: number;
  file_data: string;
  file_format: string;
  price?: number;
  owner_name: string;
  likes: number;
  downloads: number;
  created_at: string;
}

export default function ModelViewScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [model, setModel] = useState<Model3D | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [liked, setLiked] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);

  useEffect(() => {
    loadModel();
    checkUser();
  }, [id]);

  const loadModel = async () => {
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/models/${id}`);
      const data = await response.json();

      if (response.ok) {
        setModel(data);
      } else {
        Alert.alert('Ошибка', 'Модель не найдена');
        router.back();
      }
    } catch (error) {
      console.error('Model loading error:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить модель');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const checkUser = async () => {
    try {
      const userData = await AsyncStorage.getItem('user_data');
      if (userData) {
        setUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error('User check error:', error);
    }
  };

  const create3DScene = (gl: any) => {
    const renderer = new Renderer({ gl });
    renderer.setSize(screenWidth, 300);
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(75, screenWidth / 300, 0.1, 1000);
    camera.position.z = 5;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    scene.add(directionalLight);

    // Create a placeholder geometry (since we can't parse STL in this demo)
    const geometry = new THREE.BoxGeometry(2, 2, 2);
    const material = new THREE.MeshLambertMaterial({ 
      color: 0x00d4ff,
      wireframe: false 
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    meshRef.current = mesh;
    scene.add(mesh);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      
      if (meshRef.current) {
        meshRef.current.rotation.x += 0.01;
        meshRef.current.rotation.y += 0.01;
      }
      
      renderer.render(scene, camera);
      gl.endFrameEXP();
    };
    
    animate();
  };

  const handleLike = () => {
    // Toggle like (placeholder)
    setLiked(!liked);
    Alert.alert('Лайк', liked ? 'Лайк удалён' : 'Лайк добавлен');
  };

  const handleDownload = () => {
    if (!user) {
      Alert.alert('Авторизация', 'Войдите в аккаунт для скачивания');
      router.push('/auth');
      return;
    }
    Alert.alert('Скачивание', 'Функция скачивания будет добавлена в следующих версиях');
  };

  const handleOrder = () => {
    if (!user) {
      Alert.alert('Авторизация', 'Войдите в аккаунт для заказа');
      router.push('/auth');
      return;
    }
    
    if (!model) return;

    // Navigate to order screen with model data
    router.push({
      pathname: '/order',
      params: { 
        modelId: model.id,
        modelName: model.name,
        estimatedTime: model.estimated_print_time.toString()
      }
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00d4ff" />
          <Text style={styles.loadingText}>Загрузка модели...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!model) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error" size={64} color="#666" />
          <Text style={styles.errorText}>Модель не найдена</Text>
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
        <Text style={styles.headerTitle} numberOfLines={1}>
          {model.name}
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.headerActionButton}
            onPress={handleLike}
          >
            <MaterialIcons 
              name={liked ? "favorite" : "favorite-border"} 
              size={24} 
              color={liked ? "#ff4757" : "#fff"} 
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* 3D Viewer */}
        <View style={styles.viewerContainer}>
          <GLView
            style={styles.glView}
            onContextCreate={create3DScene}
          />
          <View style={styles.viewerOverlay}>
            <Text style={styles.viewerHint}>Поворачивайте для просмотра</Text>
          </View>
        </View>

        {/* Model Info */}
        <View style={styles.infoContainer}>
          <View style={styles.titleSection}>
            <Text style={styles.modelTitle}>{model.name}</Text>
            <View style={styles.ownerInfo}>
              <MaterialIcons name="person" size={16} color="#888" />
              <Text style={styles.ownerText}>by {model.owner_name}</Text>
            </View>
          </View>

          <Text style={styles.modelDescription}>
            {model.description}
          </Text>

          {/* Model Tags */}
          <View style={styles.tagsContainer}>
            <View style={styles.tag}>
              <MaterialIcons name="category" size={16} color="#6c5ce7" />
              <Text style={styles.tagText}>{model.category}</Text>
            </View>
            <View style={styles.tag}>
              <MaterialIcons name="build" size={16} color="#00cec9" />
              <Text style={styles.tagText}>{model.material_type}</Text>
            </View>
            <View style={styles.tag}>
              <MaterialIcons name="schedule" size={16} color="#fdcb6e" />
              <Text style={styles.tagText}>{model.estimated_print_time}ч</Text>
            </View>
          </View>

          {/* Model Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <MaterialIcons name="favorite" size={20} color="#ff4757" />
              <Text style={styles.statValue}>{model.likes}</Text>
              <Text style={styles.statLabel}>Лайки</Text>
            </View>
            <View style={styles.statItem}>
              <MaterialIcons name="download" size={20} color="#00d4ff" />
              <Text style={styles.statValue}>{model.downloads}</Text>
              <Text style={styles.statLabel}>Скачивания</Text>
            </View>
            <View style={styles.statItem}>
              <MaterialIcons name="date-range" size={20} color="#888" />
              <Text style={styles.statValue}>
                {new Date(model.created_at).toLocaleDateString('ru')}
              </Text>
              <Text style={styles.statLabel}>Создано</Text>
            </View>
          </View>

          {/* Price */}
          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>Стоимость модели:</Text>
            <Text style={styles.priceValue}>
              {model.price ? `${model.price} ₽` : 'Бесплатно'}
            </Text>
          </View>

          {/* Actions */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity 
              style={styles.downloadButton}
              onPress={handleDownload}
            >
              <MaterialIcons name="download" size={20} color="#fff" />
              <Text style={styles.downloadButtonText}>Скачать</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.orderButton}
              onPress={handleOrder}
            >
              <MaterialIcons name="print" size={20} color="#000" />
              <Text style={styles.orderButtonText}>Заказать печать</Text>
            </TouchableOpacity>
          </View>

          {/* Technical Details */}
          <View style={styles.technicalContainer}>
            <Text style={styles.technicalTitle}>Технические характеристики</Text>
            
            <View style={styles.technicalRow}>
              <Text style={styles.technicalLabel}>Формат файла:</Text>
              <Text style={styles.technicalValue}>{model.file_format.toUpperCase()}</Text>
            </View>
            
            <View style={styles.technicalRow}>
              <Text style={styles.technicalLabel}>Рекомендуемый материал:</Text>
              <Text style={styles.technicalValue}>{model.material_type}</Text>
            </View>
            
            <View style={styles.technicalRow}>
              <Text style={styles.technicalLabel}>Время печати:</Text>
              <Text style={styles.technicalValue}>~{model.estimated_print_time} часов</Text>
            </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#666',
    fontSize: 18,
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    padding: 8,
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerActionButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  viewerContainer: {
    height: 300,
    backgroundColor: '#1a1a1a',
    position: 'relative',
  },
  glView: {
    flex: 1,
  },
  viewerOverlay: {
    position: 'absolute',
    bottom: 16,
    right: 16,
  },
  viewerHint: {
    color: '#888',
    fontSize: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  infoContainer: {
    padding: 20,
  },
  titleSection: {
    marginBottom: 16,
  },
  modelTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  ownerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ownerText: {
    color: '#888',
    fontSize: 14,
    marginLeft: 6,
  },
  modelDescription: {
    color: '#ccc',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 6,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  priceLabel: {
    fontSize: 16,
    color: '#fff',
  },
  priceValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#00d4ff',
  },
  actionsContainer: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  downloadButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#333',
    borderRadius: 12,
    padding: 16,
    marginRight: 8,
  },
  downloadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  orderButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00d4ff',
    borderRadius: 12,
    padding: 16,
    marginLeft: 8,
  },
  orderButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  technicalContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
  },
  technicalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  technicalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  technicalLabel: {
    color: '#888',
    fontSize: 14,
  },
  technicalValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});