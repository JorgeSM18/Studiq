import React, { useRef, useState } from 'react';
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
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Plus, X } from 'lucide-react-native';
import { theme } from '../constants/theme';
import { useStore } from '../store/useStore';

interface Row {
  id: number;
  text: string;
}

export const BulkAddTopicsScreen = () => {
  const navigation = useNavigation<any>();
  const { t } = useTranslation(['topics', 'common']);
  const addTopics = useStore(state => state.addTopics);

  const nextId = useRef(1);
  const makeRow = (text = ''): Row => ({ id: nextId.current++, text });

  const [rows, setRows] = useState<Row[]>([makeRow()]);
  // Ids of rows that have lost focus at least once: those pin their cursor to the
  // start so a long title shows its beginning. A row being typed in is never here,
  // so editing (and the first mount) stays free.
  const [rewound, setRewound] = useState<Set<number>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  const markRewound = (id: number) => setRewound(s => new Set(s).add(id));
  const clearRewound = (id: number) =>
    setRewound(s => {
      if (!s.has(id)) return s;
      const next = new Set(s);
      next.delete(id);
      return next;
    });

  const titles = rows.map(r => r.text.trim()).filter(Boolean);

  // Typing updates the row; pasting several lines expands into several rows so a
  // whole syllabus can be dropped in at once, then edited row by row.
  const onChangeRow = (id: number, value: string) => {
    if (!value.includes('\n')) {
      setRows(prev => prev.map(r => (r.id === id ? { ...r, text: value } : r)));
      return;
    }
    const lines = value.split('\n').filter(l => l.trim().length > 0);
    const expanded = (lines.length ? lines : ['']).map(makeRow);
    setRows(prev => {
      const idx = prev.findIndex(r => r.id === id);
      return [...prev.slice(0, idx), ...expanded, ...prev.slice(idx + 1)];
    });
  };

  const removeRow = (id: number) => {
    setRows(prev => (prev.length === 1 ? [makeRow()] : prev.filter(r => r.id !== id)));
  };

  const addRow = () => setRows(prev => [...prev, makeRow()]);

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
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.subtitle}>{t('topics:bulkAddSubtitle')}</Text>

          {rows.map((row, index) => (
            <View key={row.id} style={styles.row}>
              <Text style={styles.rowNumber}>{index + 1}</Text>
              <TextInput
                style={styles.input}
                value={row.text}
                onChangeText={value => onChangeRow(row.id, value)}
                placeholder={t('topics:topicNamePlaceholder')}
                placeholderTextColor={theme.colors.outlineVariant}
                autoFocus={index === rows.length - 1}
                returnKeyType="next"
                onSubmitEditing={addRow}
                blurOnSubmit={false}
                onFocus={() => clearRewound(row.id)}
                onBlur={() => markRewound(row.id)}
                // Only pin to the start once the row has actually blurred; while
                // focused (and on first mount) selection is uncontrolled, so typing
                // behaves normally.
                selection={rewound.has(row.id) ? { start: 0, end: 0 } : undefined}
              />
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeRow(row.id)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={18} color={theme.colors.outline} />
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity style={styles.addRow} onPress={addRow}>
            <Plus size={18} color={theme.colors.primary} />
            <Text style={styles.addRowText}>{t('topics:addRow')}</Text>
          </TouchableOpacity>

          <Text style={styles.hint}>{t('topics:bulkAddHint')}</Text>
        </ScrollView>

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
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.lg,
  },
  subtitle: {
    ...theme.typography.bodyLg,
    color: theme.colors.onSurfaceVariant,
    marginBottom: theme.spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    paddingLeft: theme.spacing.md,
    paddingRight: theme.spacing.sm,
    height: 52,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.separator,
  },
  rowNumber: {
    ...theme.typography.bodySm,
    color: theme.colors.outline,
    width: 22,
  },
  input: {
    flex: 1,
    ...theme.typography.bodyLg,
    color: theme.colors.onSurface,
    height: '100%',
  },
  removeButton: {
    padding: 6,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    borderStyle: 'dashed',
    height: 52,
    marginTop: theme.spacing.xs,
  },
  addRowText: {
    ...theme.typography.bodyLg,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  hint: {
    ...theme.typography.bodySm,
    color: theme.colors.outline,
    marginTop: theme.spacing.md,
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
