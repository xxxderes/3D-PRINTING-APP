import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function CalculatorScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [calculation, setCalculation] = useState({
    material_type: 'PLA',
    print_time_hours: '2',
    electricity_cost_per_hour: '5.0',
    model_complexity: 'medium',
    infill_percentage: '20',
    layer_height: '0.2'
  });
  const [result, setResult] = useState(null);

  const materialTypes = [
    { label: 'PLA - Полилактид (базовый)', value: 'PLA' },
    { label: 'ABS - Акрилонитрилбутадиенстирол', value: 'ABS' },
    { label: 'PETG - Полиэтиленгликоль', value: 'PETG' },
    { label: 'TPU - Термополиуретан (гибкий)', value: 'TPU' },
    { label: 'Wood - Дерево', value: 'Wood' },
    { label: 'Metal - Металл', value: 'Metal' }
  ];

  const complexityLevels = [
    { label: 'Простая - базовые формы', value: 'simple' },
    { label: 'Средняя - детали и углы', value: 'medium' },
    { label: 'Сложная - мелкие детали', value: 'complex' }
  ];

  const handleInputChange = (field: string, value: string) => {
    setCalculation(prev => ({ ...prev, [field]: value }));
  };

  const validateInputs = () => {
    const hours = parseFloat(calculation.print_time_hours);
    const electricity = parseFloat(calculation.electricity_cost_per_hour);
    const infill = parseInt(calculation.infill_percentage);
    const layerHeight = parseFloat(calculation.layer_height);

    if (hours <= 0 || hours > 100) {
      Alert.alert('Ошибка', 'Время печати должно быть от 0.1 до 100 часов');
      return false;
    }
    if (electricity < 0 || electricity > 50) {
      Alert.alert('Ошибка', 'Стоимость электричества должна быть от 0 до 50 руб/час');
      return false;
    }
    if (infill < 5 || infill > 100) {
      Alert.alert('Ошибка', 'Заполнение должно быть от 5% до 100%');
      return false;
    }
    if (layerHeight < 0.1 || layerHeight > 0.5) {
      Alert.alert('Ошибка', 'Высота слоя должна быть от 0.1 до 0.5 мм');
      return false;
    }
    return true;
  };

  const calculatePrice = async () => {
    if (!validateInputs()) return;

    setLoading(true);
    try {
      const payload = {
        material_type: calculation.material_type,
        print_time_hours: parseFloat(calculation.print_time_hours),
        electricity_cost_per_hour: parseFloat(calculation.electricity_cost_per_hour),
        model_complexity: calculation.model_complexity,
        infill_percentage: parseInt(calculation.infill_percentage),
        layer_height: parseFloat(calculation.layer_height)
      };

      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/calculator/estimate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
      } else {
        Alert.alert('Ошибка', data.detail || 'Не удалось рассчитать стоимость');
      }
    } catch (error) {
      console.error('Calculation error:', error);
      Alert.alert('Ошибка', 'Проблема с сетью. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

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
        <Text style={styles.headerTitle}>Калькулятор стоимости</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.formContainer}>
          <Text style={styles.sectionTitle}>Параметры печати</Text>

          {/* Material Type */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Тип материала</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={calculation.material_type}
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
            <Text style={styles.inputLabel}>Время печати (часы)</Text>
            <View style={styles.inputContainer}>
              <MaterialIcons name="schedule" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={calculation.print_time_hours}
                onChangeText={(value) => handleInputChange('print_time_hours', value)}
                keyboardType="decimal-pad"
                placeholder="2.5"
                placeholderTextColor="#666"
              />
            </View>
          </View>

          {/* Electricity Cost */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Стоимость электричества (руб/час)</Text>
            <View style={styles.inputContainer}>
              <MaterialIcons name="flash-on" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={calculation.electricity_cost_per_hour}
                onChangeText={(value) => handleInputChange('electricity_cost_per_hour', value)}
                keyboardType="decimal-pad"
                placeholder="5.0"
                placeholderTextColor="#666"
              />
            </View>
          </View>

          {/* Model Complexity */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Сложность модели</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={calculation.model_complexity}
                onValueChange={(value) => handleInputChange('model_complexity', value)}
                style={styles.picker}
                dropdownIconColor="#666"
              >
                {complexityLevels.map((level) => (
                  <Picker.Item 
                    key={level.value} 
                    label={level.label} 
                    value={level.value}
                    color="#fff"
                  />
                ))}
              </Picker>
            </View>
          </View>

          {/* Infill Percentage */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Процент заполнения (%)</Text>
            <View style={styles.inputContainer}>
              <MaterialIcons name="gradient" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={calculation.infill_percentage}
                onChangeText={(value) => handleInputChange('infill_percentage', value)}
                keyboardType="number-pad"
                placeholder="20"
                placeholderTextColor="#666"
              />
            </View>
          </View>

          {/* Layer Height */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Высота слоя (мм)</Text>
            <View style={styles.inputContainer}>
              <MaterialIcons name="layers" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={calculation.layer_height}
                onChangeText={(value) => handleInputChange('layer_height', value)}
                keyboardType="decimal-pad"
                placeholder="0.2"
                placeholderTextColor="#666"
              />
            </View>
          </View>

          {/* Calculate Button */}
          <TouchableOpacity 
            style={[styles.calculateButton, loading && styles.calculateButtonDisabled]}
            onPress={calculatePrice}
            disabled={loading}
          >
            <MaterialIcons name="calculate" size={24} color="#000" />
            <Text style={styles.calculateButtonText}>
              {loading ? 'Расчёт...' : 'Рассчитать стоимость'}
            </Text>
          </TouchableOpacity>

          {/* Results */}
          {result && (
            <View style={styles.resultsContainer}>
              <Text style={styles.resultsTitle}>Результат расчёта</Text>
              
              <View style={styles.resultCard}>
                <View style={styles.totalPriceContainer}>
                  <Text style={styles.totalPriceLabel}>Общая стоимость:</Text>
                  <Text style={styles.totalPrice}>{result.total_cost_rub} ₽</Text>
                </View>
                
                <View style={styles.breakdownContainer}>
                  <Text style={styles.breakdownTitle}>Детализация:</Text>
                  
                  <View style={styles.breakdownItem}>
                    <Text style={styles.breakdownLabel}>Электричество:</Text>
                    <Text style={styles.breakdownValue}>{result.breakdown.electricity_cost} ₽</Text>
                  </View>
                  
                  <View style={styles.breakdownItem}>
                    <Text style={styles.breakdownLabel}>Материал:</Text>
                    <Text style={styles.breakdownValue}>{result.breakdown.material_cost} ₽</Text>
                  </View>
                  
                  <View style={styles.breakdownItem}>
                    <Text style={styles.breakdownLabel}>Сервис (30%):</Text>
                    <Text style={styles.breakdownValue}>{result.breakdown.service_fee} ₽</Text>
                  </View>
                  
                  <View style={styles.breakdownItem}>
                    <Text style={styles.breakdownLabel}>Объём материала:</Text>
                    <Text style={styles.breakdownValue}>{result.breakdown.material_volume_cm3} см³</Text>
                  </View>
                  
                  <View style={styles.breakdownItem}>
                    <Text style={styles.breakdownLabel}>Коэффициент сложности:</Text>
                    <Text style={styles.breakdownValue}>×{result.breakdown.complexity_multiplier}</Text>
                  </View>
                </View>
                
                <View style={styles.estimationContainer}>
                  <Text style={styles.estimationTitle}>Время выполнения:</Text>
                  <Text style={styles.estimationText}>
                    {result.estimated_completion.hours} ч. (~{result.estimated_completion.days} дн.)
                  </Text>
                </View>
              </View>
            </View>
          )}
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
    fontSize: 20,
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
  calculateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00d4ff',
    borderRadius: 12,
    height: 56,
    marginTop: 24,
  },
  calculateButtonDisabled: {
    opacity: 0.6,
  },
  calculateButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  resultsContainer: {
    marginTop: 32,
  },
  resultsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  resultCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  totalPriceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    marginBottom: 16,
  },
  totalPriceLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  totalPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00d4ff',
  },
  breakdownContainer: {
    marginBottom: 16,
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  breakdownLabel: {
    fontSize: 14,
    color: '#888',
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  estimationContainer: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  estimationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  estimationText: {
    fontSize: 14,
    color: '#00d4ff',
  },
});

// Add Picker import for React Native
// Note: You'll need to install @react-native-picker/picker
// yarn add @react-native-picker/picker