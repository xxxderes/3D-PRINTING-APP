import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
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

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function UploadScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [modelData, setModelData] = useState({
    name: '',
    description: '',
    category: 'Декор',
    material_type: 'PLA',
    estimated_print_time: '2',
    price: '',
    is_public: true
  });

  const categories = [
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

  const materialTypes = [
    { label: 'PLA - Полилактид', value: 'PLA' },
    { label: 'ABS - Акрилонитрилбутадиенстирол', value: 'ABS' },
    { label: 'PETG - Полиэтиленгликоль', value: 'PETG' },
    { label: 'TPU - Термополиуретан', value: 'TPU' },
    { label: 'Wood - Дерево', value: 'Wood' },
    { label: 'Metal - Металл', value: 'Metal' }
  ];

  const handleInputChange = (field: string, value: string) => {
    setModelData(prev => ({ ...prev, [field]: value }));
  };

  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        
        // Check file format
        const supportedFormats = ['.stl', '.obj', '.3mf', '.gcode', '.ply'];
        const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
        
        if (!supportedFormats.includes(fileExtension)) {
          Alert.alert(
            'Неподдерживаемый формат',
            'Поддерживаются форматы: STL, OBJ, 3MF, GCODE, PLY'
          );
          return;
        }

        // Check file size (limit to 50MB)
        if (file.size && file.size > 50 * 1024 * 1024) {
          Alert.alert('Ошибка', 'Размер файла не должен превышать 50MB');
          return;
        }

        setSelectedFile({
          ...file,
          format: fileExtension.replace('.', '').toUpperCase()
        });

        // Auto-fill name if empty
        if (!modelData.name) {
          const nameWithoutExtension = file.name.replace(fileExtension, '');
          handleInputChange('name', nameWithoutExtension);
        }
      }
    } catch (error) {
      console.error('File picker error:', error);
      Alert.alert('Ошибка', 'Не удалось выбрать файл');
    }
  };

  const convertFileToBase64 = async (fileUri: string): Promise<string> => {
    try {
      // For Expo, we need to read the file as base64
      const response = await fetch(fileUri);
      const blob = await response.blob();
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result as string;
          // Remove data:mime;base64, prefix if present
          const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      throw new Error('Не удалось прочитать файл');
    }
  };

  const validateForm = () => {
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
    const printTime = parseFloat(modelData.estimated_print_time);
    if (printTime <= 0 || printTime > 100) {
      Alert.alert('Ошибка', 'Время печати должно быть от 0.1 до 100 часов');
      return false;
    }
    if (modelData.price && parseFloat(modelData.price) < 0) {
      Alert.alert('Ошибка', 'Цена не может быть отрицательной');
      return false;
    }
    return true;
  };

  const uploadModel = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Check if user is logged in
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        Alert.alert('Ошибка', 'Необходимо войти в аккаунт');
        router.push('/auth');
        return;
      }

      // Convert file to base64
      const fileBase64 = await convertFileToBase64(selectedFile.uri);

      const payload = {
        name: modelData.name.trim(),
        description: modelData.description.trim(),
        category: modelData.category,
        material_type: modelData.material_type,
        estimated_print_time: parseInt(modelData.estimated_print_time),
        file_data: fileBase64,
        file_format: selectedFile.format.toLowerCase(),
        price: modelData.price ? parseFloat(modelData.price) : null,
        is_public: modelData.is_public
      };

      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/models/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert(
          'Успешно!',
          `Модель загружена! Получено ${data.points_earned} баллов`,
          [
            {
              text: 'OK',
              onPress: () => {
                router.back();
              },
            },
          ]
        );
      } else {
        Alert.alert('Ошибка', data.detail || 'Не удалось загрузить модель');
      }
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Ошибка', 'Проблема с сетью. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <MaterialIcons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Загрузить 3D модель</Text>
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.formContainer}>
            <Text style={styles.sectionTitle}>Информация о модели</Text>

            {/* File Picker */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Файл 3D модели</Text>
              <TouchableOpacity 
                style={styles.filePicker}
                onPress={pickFile}
              >
                <MaterialIcons 
                  name={selectedFile ? "check-circle" : "cloud-upload"} 
                  size={24} 
                  color={selectedFile ? "#00d4ff" : "#666"} 
                />
                <View style={styles.filePickerText}>
                  <Text style={[styles.filePickerLabel, selectedFile && styles.filePickerLabelSelected]}>
                    {selectedFile ? selectedFile.name : 'Выберите файл'}
                  </Text>
                  {selectedFile && (
                    <Text style={styles.filePickerFormat}>
                      {selectedFile.format} • {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </Text>
                  )}
                  {!selectedFile && (
                    <Text style={styles.filePickerHint}>
                      Поддержка: STL, OBJ, 3MF, GCODE, PLY
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            </View>

            {/* Model Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Название модели *</Text>
              <View style={styles.inputContainer}>
                <MaterialIcons name="title" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={modelData.name}
                  onChangeText={(value) => handleInputChange('name', value)}
                  placeholder="Например: Декоративная ваза"
                  placeholderTextColor="#666"
                />
              </View>
            </View>

            {/* Model Description */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Описание модели *</Text>
              <View style={styles.textAreaContainer}>
                <TextInput
                  style={styles.textArea}
                  value={modelData.description}
                  onChangeText={(value) => handleInputChange('description', value)}
                  placeholder="Опишите вашу модель: назначение, особенности, инструкции по печати..."
                  placeholderTextColor="#666"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </View>

            {/* Category */}
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

            {/* Material Type */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Рекомендуемый материал</Text>
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

            {/* Print Time */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Примерное время печати (часы)</Text>
              <View style={styles.inputContainer}>
                <MaterialIcons name="schedule" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={modelData.estimated_print_time}
                  onChangeText={(value) => handleInputChange('estimated_print_time', value)}
                  keyboardType="decimal-pad"
                  placeholder="2.5"
                  placeholderTextColor="#666"
                />
              </View>
            </View>

            {/* Price (Optional) */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Цена модели (необязательно)</Text>
              <View style={styles.inputContainer}>
                <MaterialIcons name="attach-money" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={modelData.price}
                  onChangeText={(value) => handleInputChange('price', value)}
                  keyboardType="decimal-pad"
                  placeholder="Оставьте пустым для бесплатной модели"
                  placeholderTextColor="#666"
                />
                <Text style={styles.currencyLabel}>₽</Text>
              </View>
            </View>

            {/* Public/Private Toggle */}
            <View style={styles.inputGroup}>
              <View style={styles.toggleContainer}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleLabel}>Публичная модель</Text>
                  <Text style={styles.toggleDescription}>
                    Модель будет доступна всем пользователям в каталоге
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.toggle, modelData.is_public && styles.toggleActive]}
                  onPress={() => handleInputChange('is_public', (!modelData.is_public).toString())}
                >
                  <View style={[styles.toggleThumb, modelData.is_public && styles.toggleThumbActive]} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Upload Button */}
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

            {/* Info */}
            <View style={styles.infoContainer}>
              <MaterialIcons name="info" size={20} color="#666" />
              <Text style={styles.infoText}>
                За загрузку модели вы получите 50 баллов! Модель будет проверена модераторами перед публикацией.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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