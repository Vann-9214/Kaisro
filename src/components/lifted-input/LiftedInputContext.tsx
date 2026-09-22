import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { Keyboard, BackHandler, AccessibilityInfo, KeyboardTypeOptions } from 'react-native';
import { getFieldNavigation } from '@/utils/keyboardLayout';

export interface LiftedFieldConfig {
  id: string;
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  maxLength?: number;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  multiline?: boolean;
  prefix?: string;
  fieldOrder?: string[];
  actionLabel?: 'Done' | 'Next';
}

interface LiftedInputContextType {
  activeField: LiftedFieldConfig | null;
  openField: (config: LiftedFieldConfig) => void;
  closeBar: () => void;
  handleNextOrDone: () => void;
  registerField: (config: LiftedFieldConfig) => void;
  unregisterField: (id: string) => void;
  isReduceMotion: boolean;
}

const LiftedInputContext = createContext<LiftedInputContextType | null>(null);

export function LiftedInputProvider({ children }: { children: React.ReactNode }) {
  const [activeField, setActiveField] = useState<LiftedFieldConfig | null>(null);
  const registeredFieldsRef = useRef<Map<string, LiftedFieldConfig>>(new Map());
  const [isReduceMotion, setIsReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setIsReduceMotion);
    const sub = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setIsReduceMotion
    );
    return () => sub?.remove?.();
  }, []);

  const registerField = useCallback((config: LiftedFieldConfig) => {
    registeredFieldsRef.current.set(config.id, config);
    // If this registered field is currently active, update references without unnecessary churn
    setActiveField((current) => {
      if (!current || current.id !== config.id) {
        return current;
      }
      if (
        current.value === config.value &&
        current.label === config.label &&
        current.placeholder === config.placeholder &&
        current.prefix === config.prefix &&
        current.onChangeText === config.onChangeText
      ) {
        return current;
      }
      return { ...config, fieldOrder: config.fieldOrder ?? current.fieldOrder };
    });
  }, []);

  const unregisterField = useCallback((id: string) => {
    registeredFieldsRef.current.delete(id);
  }, []);

  const openField = useCallback((config: LiftedFieldConfig) => {
    registeredFieldsRef.current.set(config.id, config);
    setActiveField(config);
  }, []);

  const closeBar = useCallback(() => {
    Keyboard.dismiss();
    setActiveField(null);
  }, []);

  const handleNextOrDone = useCallback(() => {
    if (!activeField) return;

    if (activeField.actionLabel === 'Done') {
      closeBar();
      return;
    }

    const order = activeField.fieldOrder || Array.from(registeredFieldsRef.current.keys());
    const nav = getFieldNavigation(order, activeField.id);

    if (nav.action === 'next' && nav.nextFieldId) {
      const nextConfig = registeredFieldsRef.current.get(nav.nextFieldId);
      if (nextConfig) {
        setActiveField({
          ...nextConfig,
          fieldOrder: order,
        });
        return;
      }
    }

    // Done or no next field: dismiss keyboard and close bar
    closeBar();
  }, [activeField, closeBar]);

  // Handle hardware back button on Android: closes bar first
  useEffect(() => {
    if (!activeField) return;

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      closeBar();
      return true; // prevent bubbling to sheet close or exit app
    });

    return () => backHandler.remove();
  }, [activeField, closeBar]);

  return (
    <LiftedInputContext.Provider
      value={{
        activeField,
        openField,
        closeBar,
        handleNextOrDone,
        registerField,
        unregisterField,
        isReduceMotion,
      }}
    >
      {children}
    </LiftedInputContext.Provider>
  );
}

export function useLiftedInput() {
  const context = useContext(LiftedInputContext);
  if (!context) {
    throw new Error('useLiftedInput must be used within a LiftedInputProvider');
  }
  return context;
}
