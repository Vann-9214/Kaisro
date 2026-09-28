import { Link, Stack } from 'expo-router';
import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, layout } from '@/constants/theme';

export default function NotFoundScreen() {
  const insets = useSafeAreaInsets();
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View
        style={{ backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom }}
        className="flex-1 items-center justify-center p-5"
      >
        <Text maxFontSizeMultiplier={layout.maxFontScale} className="text-xl font-medium text-text mb-2">This screen doesn't exist.</Text>
        <Link href="/" style={{ minHeight: 44, justifyContent: 'center' }} className="mt-4 py-2 px-4 rounded bg-primary">
          <Text maxFontSizeMultiplier={layout.maxFontScale} className="text-on-primary font-medium text-sm">Go to home screen</Text>
        </Link>
      </View>
    </>
  );
}
