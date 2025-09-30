import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  SafeAreaView, 
  KeyboardAvoidingView, 
  Platform,
  Alert,
  ScrollView 
} from 'react-native';
import { useRouter } from 'expo-router';  
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';

// Определяем тип для extra
type ExtraType = {
  EXPO_PUBLIC_BACKEND_URL: string;
};

// Достаём extra безопасно
const extra = (Constants.expoConfig?.extra || {}) as ExtraType;
const EXPO_PUBLIC_BACKEND_URL = extra.EXPO_PUBLIC_BACKEND_URL;

export default function AuthScreen() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.email.trim()) {
      Alert.alert('Ошибка', 'Введите email');
      return false;
    }
    if (!formData.password.trim()) {
      Alert.alert('Ошибка', 'Введите пароль');
      return false;
    }
    if (!isLogin) {
      if (!formData.name.trim()) {
        Alert.alert('Ошибка', 'Введите имя');
        return false;
      }
      if (formData.password !== formData.confirmPassword) {
        Alert.alert('Ошибка', 'Пароли не совпадают');
        return false;
      }
      if (formData.password.length < 6) {
        Alert.alert('Ошибка', 'Пароль должен быть не менее 6 символов');
        return false;
      }
    }
    return true;
  };

  const handleAuth = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const payload = isLogin 
        ? { email: formData.email, password: formData.password }
        : { 
            name: formData.name, 
            email: formData.email, 
            password: formData.password,
            provider: 'email' 
          };

      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Server Error:", errorText);
        throw new Error(errorText);
      }

      const data = await response.json();

      if (response.ok) {
        await AsyncStorage.setItem('auth_token', data.token);
        await AsyncStorage.setItem('user_data', JSON.stringify(data.user));
        
        Alert.alert('Успешно', data.message);
        router.replace('/');
      } else {
        Alert.alert('Ошибка', data.detail || 'Что-то пошло не так');
      }
    } catch (error) {
      console.error('Auth error:', error);
      Alert.alert('Ошибка', 'Проблема с сетью. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialAuth = (provider: string) => {
    Alert.alert(
      'Социальная авторизация',
      `Авторизация через ${provider} будет добавлена в следующих версиях`
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <MaterialIcons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {isLogin ? 'Вход' : 'Регистрация'}
            </Text>
          </View>

          {/* Form */}
          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>
              {isLogin ? 'Добро пожаловать!' : 'Создать аккаунт'}
            </Text>
            <Text style={styles.formSubtitle}>
              {isLogin ? 'Войдите в свой аккаунт' : 'Зарегистрируйтесь для продолжения'}
            </Text>

            {/* Name field */}
            {!isLogin && (
              <View style={styles.inputContainer}>
                <MaterialIcons name="person" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Имя"
                  placeholderTextColor="#666"
                  value={formData.name}
                  onChangeText={(value) => handleInputChange('name', value)}
                  autoCapitalize="words"
                />
              </View>
            )}

            {/* Email field */}
            <View style={styles.inputContainer}>
              <MaterialIcons name="email" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#666"
                value={formData.email}
                onChangeText={(value) => handleInputChange('email', value)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>

            {/* Password field */}
            <View style={styles.inputContainer}>
              <MaterialIcons name="lock" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Пароль"
                placeholderTextColor="#666"
                value={formData.password}
                onChangeText={(value) => handleInputChange('password', value)}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            {/* Confirm Password */}
            {!isLogin && (
              <View style={styles.inputContainer}>
                <MaterialIcons name="lock-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Подтвердите пароль"
                  placeholderTextColor="#666"
                  value={formData.confirmPassword}
                  onChangeText={(value) => handleInputChange('confirmPassword', value)}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>
            )}

            {/* Submit Button */}
            <TouchableOpacity 
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleAuth}
              disabled={loading}
            >
              <Text style={styles.submitButtonText}>
                {loading ? 'Загрузка...' : (isLogin ? 'Войти' : 'Зарегистрироваться')}
              </Text>
            </TouchableOpacity>

            {/* Toggle Auth */}
            <TouchableOpacity 
              style={styles.toggleButton}
              onPress={() => setIsLogin(!isLogin)}
            >
              <Text style={styles.toggleText}>
                {isLogin ? 'Нет аккаунта? ' : 'Уже есть аккаунт? '}
                <Text style={styles.toggleLink}>
                  {isLogin ? 'Зарегистрироваться' : 'Войти'}
                </Text>
              </Text>
            </TouchableOpacity>

            {/* Social Auth */}
            <View style={styles.socialContainer}>
              <Text style={styles.socialTitle}>Или войти через:</Text>
              <View style={styles.socialButtons}>
                <TouchableOpacity 
                  style={[styles.socialButton, styles.googleButton]}
                  onPress={() => handleSocialAuth('Google')}
                >
                  <MaterialIcons name="login" size={20} color="#fff" />
                  <Text style={styles.socialButtonText}>Google</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.socialButton, styles.vkButton]}
                  onPress={() => handleSocialAuth('ВКонтакте')}
                >
                  <MaterialIcons name="login" size={20} color="#fff" />
                  <Text style={styles.socialButtonText}>VK</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.socialButton, styles.yandexButton]}
                  onPress={() => handleSocialAuth('Яндекс')}
                >
                  <MaterialIcons name="login" size={20} color="#fff" />
                  <Text style={styles.socialButtonText}>Яндекс</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.socialButton, styles.gosuslugiButton]}
                  onPress={() => handleSocialAuth('Госуслуги')}
                >
                  <MaterialIcons name="login" size={20} color="#fff" />
                  <Text style={styles.socialButtonText}>Госуслуги</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  keyboardView: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: { padding: 8, marginRight: 16 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  formContainer: { flex: 1, padding: 24, justifyContent: 'center' },
  formTitle: { fontSize: 28, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 8 },
  formSubtitle: { fontSize: 16, color: '#888', textAlign: 'center', marginBottom: 32 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, height: 56, color: '#fff', fontSize: 16 },
  submitButton: {
    backgroundColor: '#00d4ff',
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { color: '#000', fontSize: 18, fontWeight: '600' },
  toggleButton: { alignItems: 'center', marginBottom: 32 },
  toggleText: { color: '#888', fontSize: 16 },
  toggleLink: { color: '#00d4ff', fontWeight: '600' },
  socialContainer: { marginTop: 16 },
  socialTitle: { color: '#888', fontSize: 16, textAlign: 'center', marginBottom: 16 },
  socialButtons: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '48%',
    height: 48,
    borderRadius: 12,
    marginBottom: 12,
  },
  googleButton: { backgroundColor: '#db4437' },
  vkButton: { backgroundColor: '#4c75a3' },
  yandexButton: { backgroundColor: '#ffcc00' },
  gosuslugiButton: { backgroundColor: '#0077ff' },
  socialButtonText: { color: '#fff', fontSize: 14, fontWeight: '600', marginLeft: 8 },
});
