import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { ChevronLeft } from 'lucide-react-native';
import { theme } from '../constants/theme';
import { useStore } from '../store/useStore';

// One topic per non-blank line, trimmed. Defined here so the button count and
// the save use exactly the same parse — no chance of "Add 5" saving 4.
const parseTitles = (raw: string) =>
  raw
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

export const BulkAddTopicsScreen = () => {
  const navigation = useNavigation<any>();
  const { t } = useTranslation(['topics', 'common']);
  const addTopics = useStore(state => state.addTopics);

  const [text, setText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const titles = parseTitles(text);

  const handleSave = async () => {
    if (titles.length === 0) {
      Alert.alert(t('common:error'), t('topics:bulkAddEmpty'));
      return;
    }
    setIsSaving(true);
    try {
      await addTopics(titles);
      navigation.goBack();
    } catch {
      Alert.alert(t('common:error'), t('topics:bulkAddError'));
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ChevronLeft size={24} color={theme.colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('topics:bulkAddTitle')}</Text>
        <View style={styles.backButton} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.body}>
          <Text style={styles.subtitle}>{t('topics:bulkAddSubtitle')}</Text>
          <TextInput
            style={styles.input}
            multiline
            autoFocus
            value={text}
            onChangeText={setText}
            placeholder={t('topics:bulkAddPlaceholder')}
            placeholderTextColor={theme.colors.outlineVariant}
            textAlignVertical="top"
          />
          <Text style={styles.hint}>{t('topics:bulkAddHint')}</Text>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.primaryButton, titles.length === 0 && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={isSaving || titles.length === 0}
          >
            {isSaving ? (
              <ActivityIndicator color={theme.colors.onPrimary} />
            ) : (
              <Text style={styles.primaryButtonText}>
                {t('topics:bulkAddCount', { count: titles.length })}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    ...theme.typography.h3,
    color: theme.colors.onBackground,
  },
  body: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
  },
  subtitle: {
    ...theme.typography.bodyLg,
    color: theme.colors.onSurfaceVariant,
    marginBottom: theme.spacing.md,
  },
  input: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    ...theme.typography.bodyLg,
    color: theme.colors.onSurface,
    borderWidth: 1,
    borderColor: theme.colors.separator,
  },
  hint: {
    ...theme.typography.bodySm,
    color: theme.colors.outline,
    marginTop: theme.spacing.sm,
  },
  footer: {
    padding: theme.spacing.lg,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    height: 56,
    borderRadius: theme.borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  primaryButtonText: {
    ...theme.typography.bodyLg,
    fontWeight: '600',
    color: theme.colors.onPrimary,
  },
});
