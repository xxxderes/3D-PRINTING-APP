import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Переменная окружения
const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

// Интерфейсы
interface ModelData {
  name: string;
  description: string;
  category: string;
  material_type: string;
  estimated_print_time: string;
  price: string;
  is_public: boolean;
}

interface SelectedFile {
  uri: string;
  name: string;
  size?: number;
  format: string;
}

export default function UploadScreen() { // Убрано : JSX.Element — фикс TS2503
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [modelData, setModelData] = useState<ModelData>({
    name: '',
    description: '',
    category: 'Декор',
    material_type: 'PLA',
    estimated_print_time: '2',
    price: '',
    is_public: true,
  });

  // Списки для Picker
  const categories = [
    'Игрушки',
    'Декор',
    'Инструменты',
    'Украшения',
    'Запчасти',
    'Прототипы',
    'Образование',
    'Медицина',
    'Другое',
  ];

  const materialTypes = [
    { label: 'PLA - Полилактид', value: 'PLA' },
    { label: 'ABS - Акрилонитрилбутадиенстирол', value: 'ABS' },
    { label: 'PETG - Полиэтиленгликоль', value: 'PETG' },
    { label: 'TPU - Термополиуретан', value: 'TPU' },
    { label: 'Wood - Дерево', value: 'Wood' },
    { label: 'Metal - Металл', value: 'Metal' },
  ];

  // Обработчик изменения формы
  const handleInputChange = useCallback((field: keyof ModelData, value: string | boolean): void => {
    setModelData(prev => ({ ...prev, [field]: value }));
  }, []);

  // Выбор файла (исправлено: !result.canceled, result.assets[0] — устраняет ts(2339) для type, name, size, uri)
  const pickFile = async (): Promise<void> => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled) { // Изменено: вместо result.type === 'success'
        const fileAsset = result.assets[0]; // Доступ к assets[0]
        const fileExtension = fileAsset.name.split('.').pop()?.toLowerCase() || '';
        const supportedFormats = ['stl', 'obj', '3mf', 'gcode', 'ply'];

        if (!supportedFormats.includes(fileExtension)) {
          Alert.alert('Ошибка', 'Поддерживаются форматы: STL, OBJ, 3MF, GCODE, PLY');
          return;
        }

        if (fileAsset.size && fileAsset.size > 50 * 1024 * 1024) { // fileAsset.size вместо file.size
          Alert.alert('Ошибка', 'Размер файла не должен превышать 50MB');
          return;
        }

        setSelectedFile({
          uri: fileAsset.uri, // fileAsset.uri вместо file.uri
          name: fileAsset.name, // fileAsset.name вместо file.name
          size: fileAsset.size, // fileAsset.size вместо file.size
          format: fileExtension.toUpperCase(),
        });

        if (!modelData.name) {
          handleInputChange('name', fileAsset.name.replace(`.${fileExtension}`, '')); // fileAsset.name вместо file.name
        }
      }
    } catch {
      Alert.alert('Ошибка', 'Не удалось выбрать файл');
    }
  };

  // Валидация формы
  const validateForm = (): boolean => {
    if (!modelData.name.trim()) {
      Alert.alert('Ошибка', 'Введите название модели');
      return false;
    }
    if (!modelData.description.trim()) {
      Alert.alert('Ошибка', 'Введите описание модели');
      return false;
    }
    if (!selectedFile) {
      Alert.alert('Ошибка', 'Выберите файл 3D модели');
      return false;
    }
    const printTime = Number.parseFloat(modelData.estimated_print_time);
    if (isNaN(printTime) || printTime <= 0 || printTime > 100) {
      Alert.alert('Ошибка', 'Время печати должно быть числом от 0.1 до 100 часов');
      return false;
    }
    if (modelData.price && Number.parseFloat(modelData.price) < 0) {
      Alert.alert('Ошибка', 'Цена не может быть отрицательной');
      return false;
    }
    return true;
  };

  // Функция для извлечения сообщения из ошибки
  const getErrorMessage = (data: any): string => {
    if (typeof data === 'string') return data;
    if (data && data.detail) {
      if (Array.isArray(data.detail)) {
        // FastAPI-style: detail is array of {loc, msg, type}
        return data.detail.map((err: any) => err.msg || err).join('\n');
      }
      if (typeof data.detail === 'string') {
        return data.detail;
      }
      return JSON.stringify(data.detail);
    }
    return 'Не удалось загрузить модель';
  };

// --- заменяем uploadModel --- 
const uploadModel = async (): Promise<void> => {
  if (!validateForm()) return;
  setLoading(true);
  try {
    const token = await AsyncStorage.getItem('auth_token');
    if (!token) {
      Alert.alert('Ошибка', 'Необходимо войти в аккаунт');
      router.push('/auth');
      return;
    }

    if (!selectedFile) {
      Alert.alert('Ошибка', 'Выберите файл модели');
      return;
    }

    const formData = new FormData();
    formData.append('file', {
      uri: selectedFile.uri,
      name: selectedFile.name,
      type: 'application/octet-stream', // можно уточнить по расширению
    } as any);

    formData.append('name', modelData.name.trim());
    formData.append('description', modelData.description.trim());
    formData.append('category', modelData.category);
    formData.append('material_type', modelData.material_type);
    formData.append('estimated_print_time', modelData.estimated_print_time);
    formData.append('price', modelData.price || '0');
    formData.append('is_public', modelData.is_public ? 'true' : 'false');

    const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/models/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        // ВАЖНО: не ставим Content-Type вручную, fetch сам выставит boundary
      },
      body: formData,
    });

    const text = await response.text();
console.log("Server raw response:", text);

let data: any;
try {
  data = JSON.parse(text);
} catch {
  data = { detail: text };
}

if (response.ok) {
  Alert.alert('Успех', 'Модель успешно загружена!');
  router.push('/catalog');
} else {
  const errorMsg = getErrorMessage(data);
  Alert.alert('Ошибка', errorMsg);
}

  } catch (error) {
    console.error('Upload error:', error);
    Alert.alert('Ошибка', 'Проблема с сетью. Попробуйте позже.');
  } finally {
    setLoading(false);
  }
};

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <MaterialIcons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Загрузить 3D модель</Text>
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.sectionTitle}>Добавление модели</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Файл модели</Text>
              <TouchableOpacity style={styles.filePicker} onPress={pickFile}>
                <MaterialIcons name="attach-file" size={24} color="#666" />
                <View style={styles.filePickerText}>
                  <Text
                    style={[styles.filePickerLabel, selectedFile && styles.filePickerLabelSelected]}
                  >
                    {selectedFile ? selectedFile.name : 'Выберите файл модели'}
                  </Text>
                  {selectedFile && (
                    <Text style={styles.filePickerFormat}>{selectedFile.format}</Text>
                  )}
                  <Text style={styles.filePickerHint}>Форматы: STL, OBJ, 3MF, GCODE, PLY</Text>
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Название модели</Text>
              <View style={styles.inputContainer}>
                <MaterialIcons name="title" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Название модели"
                  placeholderTextColor="#666"
                  value={modelData.name}
                  onChangeText={(value) => handleInputChange('name', value)}
                  maxLength={100}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Описание</Text>
              <View style={styles.textAreaContainer}>
                <TextInput
                  style={styles.textArea}
                  placeholder="Опишите вашу модель"
                  placeholderTextColor="#666"
                  value={modelData.description}
                  onChangeText={(value) => handleInputChange('description', value)}
                  multiline
                  numberOfLines={4}
                  maxLength={500}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Категория</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={modelData.category}
                  onValueChange={(value) => handleInputChange('category', value)}
                  style={styles.picker}
                  dropdownIconColor="#666"
                >
                  {categories.map((category) => (
                    <Picker.Item
                      key={category}
                      label={category}
                      value={category}
                      color="#fff"
                    />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Тип материала</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={modelData.material_type}
                  onValueChange={(value) => handleInputChange('material_type', value)}
                  style={styles.picker}
                  dropdownIconColor="#666"
                >
                  {materialTypes.map((material) => (
                    <Picker.Item
                      key={material.value}
                      label={material.label}
                      value={material.value}
                      color="#fff"
                    />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Время печати (часы)</Text>
              <View style={styles.inputContainer}>
                <MaterialIcons name="schedule" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="2"
                  placeholderTextColor="#666"
                  value={modelData.estimated_print_time}
                  onChangeText={(value) => handleInputChange('estimated_print_time', value)}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Цена (₽, опционально)</Text>
              <View style={styles.inputContainer}>
                <MaterialIcons name="attach-money" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  placeholderTextColor="#666"
                  value={modelData.price}
                  onChangeText={(value) => handleInputChange('price', value)}
                  keyboardType="numeric"
                />
                <Text style={styles.currencyLabel}>₽</Text>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.toggleContainer}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleLabel}>Публичная модель</Text>
                  <Text style={styles.toggleDescription}>
                    Доступна для всех пользователей в каталоге
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.toggle, modelData.is_public && styles.toggleActive]}
                  onPress={() => handleInputChange('is_public', !modelData.is_public)}
                >
                  <View
                    style={[styles.toggleThumb, modelData.is_public && styles.toggleThumbActive]}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.uploadButton, loading && styles.uploadButtonDisabled]}
              onPress={uploadModel}
              disabled={loading}
            >
              <MaterialIcons name="cloud-upload" size={24} color="#000" />
              <Text style={styles.uploadButtonText}>
                {loading ? 'Загрузка...' : 'Загрузить модель'}
              </Text>
            </TouchableOpacity>

            <View style={styles.infoContainer}>
              <MaterialIcons name="info" size={20} color="#666" />
              <Text style={styles.infoText}>
                За загрузку модели вы получите 50 баллов! Модель будет проверена модераторами перед публикацией.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  keyboardView: {
    flex: 1,
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
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  formContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 24,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  filePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#333',
    borderStyle: 'dashed',
  },
  filePickerText: {
    marginLeft: 12,
    flex: 1,
  },
  filePickerLabel: {
    fontSize: 16,
    color: '#666',
  },
  filePickerLabelSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  filePickerFormat: {
    fontSize: 12,
    color: '#00d4ff',
    marginTop: 2,
  },
  filePickerHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 56,
    color: '#fff',
    fontSize: 16,
  },
  currencyLabel: {
    color: '#666',
    fontSize: 16,
    marginLeft: 8,
  },
  textAreaContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  textArea: {
    color: '#fff',
    fontSize: 16,
    minHeight: 100,
  },
  pickerContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  picker: {
    height: 56,
    color: '#fff',
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleInfo: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  toggleDescription: {
    fontSize: 14,
    color: '#888',
    marginTop: 2,
  },
  toggle: {
    width: 56,
    height: 32,
    backgroundColor: '#333',
    borderRadius: 16,
    padding: 4,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: '#00d4ff',
  },
  toggleThumb: {
    width: 24,
    height: 24,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00d4ff',
    borderRadius: 12,
    height: 56,
    marginTop: 24,
    marginBottom: 16,
  },
  uploadButtonDisabled: {
    opacity: 0.6,
  },
  uploadButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  infoContainer: {
    flexDirection: 'row',
    backgroundColor: '#1a2a3a',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#00d4ff',
  },
  infoText: {
    color: '#ccc',
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
});