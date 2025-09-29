import { Stack } from 'expo-router';
import { StyleSheet } from 'react-native';

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: styles.header,
        headerTintColor: '#fff',
        headerTitleStyle: styles.headerTitle,
        headerBackVisible: true
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="screens/HomeScreen" options={{ title: 'Главная' }} />
      <Stack.Screen name="screens/AuthScreen" options={{ title: 'Авторизация' }} />
      <Stack.Screen name="screens/ProfileScreen" options={{ title: 'Профиль' }} />
      <Stack.Screen name="screens/CalculatorScreen" options={{ title: 'Калькулятор' }} />
      <Stack.Screen name="screens/CatalogScreen" options={{ title: 'Каталог' }} />
      <Stack.Screen name="screens/UploadScreen" options={{ title: 'Загрузка' }} />
      <Stack.Screen name="screens/OrdersScreen" options={{ title: 'Заказы' }} />
      <Stack.Screen name="screens/Model/[id]" options={{ title: 'Модель' }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
});