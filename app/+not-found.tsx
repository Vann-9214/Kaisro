import { Link, Stack } from 'expo-router';
import { View, Text } from 'react-native';
import { colors } from '@/constants/theme';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View
        style={{ backgroundColor: colors.background }}
        className="flex-1 items-center justify-center p-5"
      >
        <Text className="text-xl font-medium text-text mb-2">This screen doesn't exist.</Text>
        <Link href="/" className="mt-4 py-2 px-4 rounded bg-primary">
          <Text className="text-on-primary font-medium text-sm">Go to home screen</Text>
        </Link>
      </View>
    </>
  );
}
