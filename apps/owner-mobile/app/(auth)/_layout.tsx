import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0A0D14' } }}>
      <Stack.Screen name="login" />
    </Stack>
  );
}
