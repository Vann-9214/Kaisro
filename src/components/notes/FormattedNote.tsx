import { useThemeRefresh } from '@/hooks/useThemeRefresh';
import React from 'react';
import { Text } from 'react-native';
import { SheetSection } from '@/components/ui';
import { colors } from '@/constants/theme';

export function FormattedNote({ body }: { body: string }) {
  useThemeRefresh();
  return <SheetSection gap="sm">{body.split('\n').map((line, index) => {
    const heading = line.startsWith('# ');
    const text = heading ? line.slice(2) : line.startsWith('- ') ? '• ' + line.slice(2) : line;
    return <Text key={index} style={{ color: colors.text, fontSize: heading ? 22 : 16, lineHeight: heading ? 30 : 24, fontWeight: heading ? '600' : '400' }}>
      {text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((part, i) => <Text key={i} style={part.startsWith('**') ? { fontWeight: '600' } : part.startsWith('*') ? { fontStyle: 'italic' } : undefined}>
        {part.startsWith('**') ? part.slice(2, -2) : part.startsWith('*') ? part.slice(1, -1) : part}
      </Text>)}
    </Text>;
  })}</SheetSection>;
}
