import React from 'react';
import { ScrollView } from 'react-native';

export interface QuickAddFormHandle {
  submit: () => Promise<boolean>;
}

export interface QuickAddFormProps {
  onClose: () => void;
  scrollViewRef?: React.RefObject<ScrollView | null>;
}
