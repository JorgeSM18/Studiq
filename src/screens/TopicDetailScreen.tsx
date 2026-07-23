import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import * as DocumentPicker from 'expo-document-picker';
import { FileText, Plus, ExternalLink, X, CheckCircle2 } from 'lucide-react-native';
import { useStore } from '../store/useStore';
import { supabaseService } from '../services/supabaseService';
import { Button } from '../components/Button';
import { ListItem } from '../components/ListItem';
import { theme } from '../constants/theme';
import { Material } from '../types';

export const TopicDetailScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { t } = useTranslation(['topics', 'common']);
  const { topicId } = route.params;

  const topic = useStore(state => state.topics.find(t => t.id === topicId));
  const materials = useStore(state => state.materials);
  const updateTopicStatus = useStore(state => state.updateTopicStatus);
  const uploadMaterial = useStore(state => state.uploadMaterial);
  const setMaterialTopic = useStore(state => state.setMaterialTopic);
  const suppressLock = useStore(state => state.suppressLock);

  const topicMaterials = materials.filter(m => m.topic_id === topicId);
  const unassigned = materials.filter(m => m.topic_id === null);

  const [noteContent, setNoteContent] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState<{ current: number; total: number } | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  useLayoutEffect(() => {
    if (topic) navigation.setOptions({ title: topic.title });
  }, [navigation, topic?.title]);

  useEffect(() => {
    supabaseService
      .getNoteByTopicId(topicId)
      .then(note => note && setNoteContent(note.content ?? ''))
      .catch(err => console.error('Error loading note:', err));
  }, [topicId]);

  if (!topic) return null;

  const handleSaveNote = () => {
    supabaseService.saveNote(topicId, noteContent).catch(err => console.error('Error saving note:', err));
  };

  // Uploaded files are assigned to this topic automatically (topicId is passed
  // to uploadMaterial). Supports selecting several at once.
  const uploadNew = async () => {
    const result = await DocumentPicker.getDocumentAsync({ multiple: true, copyToCacheDirectory: true });
    if (result.canceled) return;

    const assets = result.assets;
    let failed = 0;
    for (let i = 0; i < assets.length; i++) {
      setUploading({ current: i + 1, total: assets.length });
      const asset = assets[i];
      try {
        await uploadMaterial(topicId, { uri: asset.uri, name: asset.name, mimeType: asset.mimeType });
      } catch {
        failed++;
      }
    }
    setUploading(null);
    if (failed > 0) Alert.alert(t('common:error'), t('topics:uploadSomeFailed', { count: failed }));
  };

  const handleAddFile = () => {
    // Upload a new file, or (if any exist) link one already sitting in the library.
    const options: any[] = [{ text: t('topics:uploadNew'), onPress: uploadNew }];
    if (unassigned.length > 0) {
      options.push({ text: t('topics:linkExisting'), onPress: () => setPickerOpen(true) });
    }
    options.push({ text: t('common:cancel'), style: 'cancel' });
    Alert.alert(t('topics:addFile'), undefined, options);
  };

  const openFile = async (material: Material) => {
    if (busy) return;
    setBusy(true);
    try {
      const url = await supabaseService.getFileUrl(material.path);
      suppressLock(); // opening a file backgrounds the app; don't relock on return
      await Linking.openURL(url);
    } catch {
      Alert.alert(t('common:error'), t('topics:openError'));
    } finally {
      setBusy(false);
    }
  };

  const unlink = (material: Material) => {
    Alert.alert(t('topics:unlinkFile'), t('topics:unlinkConfirm', { name: material.name }), [
      { text: t('common:cancel'), style: 'cancel' },
      { text: t('topics:unlinkFile'), onPress: () => setMaterialTopic(material.id, null).catch(() => {}) },
    ]);
  };

  const linkExisting = (material: Material) => {
    setPickerOpen(false);
    setMaterialTopic(material.id, topicId).catch(() => Alert.alert(t('common:error'), t('common:retry')));
  };

  const isMastered = topic.status === 'mastered';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={100}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Materials */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('topics:materials')}</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAddFile}
            disabled={busy || uploading !== null}
          >
            {uploading ? (
              <ActivityIndicator size="small" color={theme.colors.onPrimary} />
            ) : (
              <Plus size={18} color={theme.colors.onPrimary} />
            )}
          </TouchableOpacity>
        </View>

        {uploading && (
          <View style={styles.uploadingBanner}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={styles.uploadingText}>
              {t('topics:uploadingProgress', { current: uploading.current, total: uploading.total })}
            </Text>
          </View>
        )}

        {topicMaterials.length === 0 ? (
          <Text style={styles.emptyMaterials}>{t('topics:noTopicMaterials')}</Text>
        ) : (
          topicMaterials.map(material => (
            <View key={material.id} style={styles.materialRow}>
              <FileText size={20} color={theme.colors.primary} />
              <Text style={styles.materialName} numberOfLines={1}>{material.name}</Text>
              <TouchableOpacity
                onPress={() => openFile(material)}
                style={styles.materialAction}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <ExternalLink size={18} color={theme.colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => unlink(material)}
                style={styles.materialAction}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={18} color={theme.colors.outline} />
              </TouchableOpacity>
            </View>
          ))
        )}

        {/* Notes */}
        <Text style={[styles.sectionTitle, styles.notesLabel]}>{t('topics:notes')}</Text>
        <TextInput
          style={styles.noteInput}
          multiline
          placeholder={t('topics:notesPlaceholder')}
          placeholderTextColor={theme.colors.outlineVariant}
          value={noteContent}
          onChangeText={setNoteContent}
          onBlur={handleSaveNote}
          textAlignVertical="top"
        />

        <Button
          title={isMastered ? t('topics:masteredDone') : t('topics:markMastered')}
          onPress={() => updateTopicStatus(topicId, 'mastered')}
          variant={isMastered ? 'secondary' : 'primary'}
          disabled={isMastered}
          style={styles.masterButton}
        />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Library picker: assign an unassigned file to this topic */}
      <Modal visible={pickerOpen} transparent animationType="slide" onRequestClose={() => setPickerOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('topics:linkExisting')}</Text>
              <TouchableOpacity onPress={() => setPickerOpen(false)}>
                <X size={24} color={theme.colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={unassigned}
              keyExtractor={item => item.id}
              ListEmptyComponent={<Text style={styles.emptyMaterials}>{t('topics:noUnassigned')}</Text>}
              renderItem={({ item }) => (
                <ListItem
                  title={item.name}
                  onPress={() => linkExisting(item)}
                  icon={<FileText size={20} color={theme.colors.primary} />}
                  rightElement={<CheckCircle2 size={22} color={theme.colors.outlineVariant} />}
                />
              )}
            />
          </View>
        </View>
      </Modal>
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
  scrollContent: {
    padding: theme.spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  sectionTitle: {
    ...theme.typography.labelCaps,
    color: theme.colors.onSurfaceVariant,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyMaterials: {
    ...theme.typography.bodySm,
    color: theme.colors.outline,
    paddingVertical: theme.spacing.md,
  },
  uploadingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceContainerLow,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },
  uploadingText: {
    ...theme.typography.bodySm,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  materialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.level1,
  },
  materialName: {
    flex: 1,
    ...theme.typography.bodyLg,
    color: theme.colors.onSurface,
    marginLeft: theme.spacing.sm,
  },
  materialAction: {
    padding: 6,
    marginLeft: 4,
  },
  notesLabel: {
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.sm,
  },
  noteInput: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    minHeight: 150,
    ...theme.typography.bodyLg,
    color: theme.colors.onSurface,
    borderWidth: 1,
    borderColor: theme.colors.separator,
  },
  masterButton: {
    marginTop: theme.spacing.xl,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  modalTitle: {
    ...theme.typography.h3,
    color: theme.colors.onSurface,
  },
});
