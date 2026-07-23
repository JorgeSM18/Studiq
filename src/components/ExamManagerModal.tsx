import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { X, Plus, Pencil, Trash2, Check, Calendar as CalendarIcon, ChevronLeft } from 'lucide-react-native';
import { theme } from '../constants/theme';
import { useStore } from '../store/useStore';
import { daysUntil } from '../utils/plan';
import { Subject } from '../types';
import { DatePickerModal } from './DatePickerModal';

interface Props {
  visible: boolean;
  onClose: () => void;
}

type Mode = { type: 'list' } | { type: 'form'; editing: Subject | null };

export const ExamManagerModal = ({ visible, onClose }: Props) => {
  const { t } = useTranslation(['home', 'common']);
  const subjects = useStore(state => state.subjects);
  const activeSubjectId = useStore(state => state.activeSubjectId);
  const setActiveSubject = useStore(state => state.setActiveSubject);
  const createSubject = useStore(state => state.createSubject);
  const updateSubject = useStore(state => state.updateSubject);
  const deleteSubject = useStore(state => state.deleteSubject);

  const [mode, setMode] = useState<Mode>({ type: 'list' });
  const [name, setName] = useState('');
  const [date, setDate] = useState<string | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const countdown = (examDate: string | null): string => {
    if (!examDate) return t('home:noDate');
    const days = daysUntil(examDate);
    if (days < 0) return t('home:examPast');
    if (days === 0) return t('home:examToday');
    return t('home:daysToExam', { count: days });
  };

  const openForm = (editing: Subject | null) => {
    setName(editing?.name ?? '');
    setDate(editing?.exam_date ?? null);
    setMode({ type: 'form', editing });
  };

  const backToList = () => setMode({ type: 'list' });

  const handleClose = () => {
    backToList();
    onClose();
  };

  const switchTo = (id: string) => {
    if (id !== activeSubjectId) setActiveSubject(id);
    handleClose();
  };

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert(t('common:error'), t('home:examNameRequired'));
      return;
    }
    setSaving(true);
    try {
      if (mode.type === 'form' && mode.editing) {
        await updateSubject(mode.editing.id, { name: trimmed, exam_date: date });
      } else {
        await createSubject(trimmed, date);
      }
      backToList();
    } catch {
      Alert.alert(t('common:error'), t('home:createExamError'));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (subject: Subject) => {
    Alert.alert(t('home:deleteExam'), t('home:deleteExamConfirm', { name: subject.name }), [
      { text: t('common:cancel'), style: 'cancel' },
      {
        text: t('common:delete'),
        style: 'destructive',
        onPress: () => deleteSubject(subject.id).catch(() => Alert.alert(t('common:error'), t('common:retry'))),
      },
    ]);
  };

  const renderExam = ({ item }: { item: Subject }) => {
    const isActive = item.id === activeSubjectId;
    return (
      <TouchableOpacity style={styles.examRow} onPress={() => switchTo(item.id)} activeOpacity={0.7}>
        <View style={styles.examInfo}>
          <View style={styles.examTitleRow}>
            <Text style={styles.examName} numberOfLines={1}>{item.name}</Text>
            {isActive && (
              <View style={styles.activeBadge}>
                <Check size={12} color={theme.colors.onPrimary} />
                <Text style={styles.activeText}>{t('home:activeLabel')}</Text>
              </View>
            )}
          </View>
          <Text style={styles.examCountdown}>{countdown(item.exam_date)}</Text>
        </View>
        <TouchableOpacity style={styles.iconBtn} onPress={() => openForm(item)}>
          <Pencil size={18} color={theme.colors.onSurfaceVariant} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={() => confirmDelete(item)}>
          <Trash2 size={18} color={theme.colors.error} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {mode.type === 'list' ? (
            <>
              <View style={styles.header}>
                <Text style={styles.title}>{t('home:myExams')}</Text>
                <TouchableOpacity onPress={handleClose}>
                  <X size={24} color={theme.colors.onSurfaceVariant} />
                </TouchableOpacity>
              </View>
              <FlatList
                data={subjects}
                keyExtractor={item => item.id}
                renderItem={renderExam}
                ListEmptyComponent={<Text style={styles.empty}>{t('home:noExams')}</Text>}
                style={styles.list}
              />
              <TouchableOpacity style={styles.newButton} onPress={() => openForm(null)}>
                <Plus size={20} color={theme.colors.onPrimary} />
                <Text style={styles.newButtonText}>{t('home:newExam')}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.header}>
                <TouchableOpacity onPress={backToList} style={styles.backBtn}>
                  <ChevronLeft size={22} color={theme.colors.onSurface} />
                </TouchableOpacity>
                <Text style={styles.title}>{mode.editing ? mode.editing.name : t('home:newExam')}</Text>
                <View style={styles.backBtn} />
              </View>

              <Text style={styles.label}>{t('home:examName')}</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder={t('home:examNamePlaceholder')}
                placeholderTextColor={theme.colors.outlineVariant}
                autoFocus
              />

              <Text style={styles.label}>{t('home:examDateField')}</Text>
              <TouchableOpacity style={styles.dateButton} onPress={() => setDatePickerOpen(true)}>
                <CalendarIcon size={20} color={theme.colors.outline} />
                <Text style={[styles.dateText, !date && styles.datePlaceholder]}>
                  {date || t('home:chooseDate')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.saveButton} onPress={save} disabled={saving}>
                {saving ? (
                  <ActivityIndicator color={theme.colors.onPrimary} />
                ) : (
                  <Text style={styles.saveText}>{t('common:save')}</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      <DatePickerModal
        visible={datePickerOpen}
        onClose={() => setDatePickerOpen(false)}
        selectedDate={date || ''}
        onSelect={setDate}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  backBtn: {
    width: 32,
    height: 32,
    justifyContent: 'center',
  },
  title: {
    ...theme.typography.h3,
    color: theme.colors.onSurface,
  },
  list: {
    marginBottom: theme.spacing.md,
  },
  examRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.level1,
  },
  examInfo: {
    flex: 1,
  },
  examTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  examName: {
    ...theme.typography.bodyLg,
    fontWeight: '600',
    color: theme.colors.onSurface,
    flexShrink: 1,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.full,
  },
  activeText: {
    ...theme.typography.labelCaps,
    fontSize: 10,
    color: theme.colors.onPrimary,
  },
  examCountdown: {
    ...theme.typography.bodySm,
    color: theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  iconBtn: {
    padding: 8,
    marginLeft: 4,
  },
  empty: {
    ...theme.typography.bodyLg,
    color: theme.colors.outline,
    textAlign: 'center',
    paddingVertical: theme.spacing.xl,
  },
  newButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
    height: 52,
    borderRadius: theme.borderRadius.full,
  },
  newButtonText: {
    ...theme.typography.bodyLg,
    fontWeight: '600',
    color: theme.colors.onPrimary,
  },
  label: {
    ...theme.typography.labelCaps,
    color: theme.colors.onSurfaceVariant,
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    height: 52,
    ...theme.typography.bodyLg,
    color: theme.colors.onSurface,
    borderWidth: 1,
    borderColor: theme.colors.separator,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    height: 52,
    borderWidth: 1,
    borderColor: theme.colors.separator,
  },
  dateText: {
    ...theme.typography.bodyLg,
    color: theme.colors.onSurface,
  },
  datePlaceholder: {
    color: theme.colors.outlineVariant,
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    height: 56,
    borderRadius: theme.borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.xl,
  },
  saveText: {
    ...theme.typography.bodyLg,
    fontWeight: '600',
    color: theme.colors.onPrimary,
  },
});
