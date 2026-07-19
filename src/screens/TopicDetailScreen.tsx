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
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import * as DocumentPicker from 'expo-document-picker';
import { FileText, Paperclip, ExternalLink, Trash2, CheckCircle2 } from 'lucide-react-native';
import { useStore } from '../store/useStore';
import { supabaseService } from '../services/supabaseService';
import { Button } from '../components/Button';
import { theme } from '../constants/theme';

// Stored path is {uid}/{topicId}/{filename}; show just the filename.
const fileNameOf = (path: string) => path.split('/').pop() || path;

export const TopicDetailScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { t } = useTranslation(['topics', 'common']);
  const { topicId } = route.params;

  const topic = useStore(state => state.topics.find(t => t.id === topicId));
  const updateTopicStatus = useStore(state => state.updateTopicStatus);
  const attachFile = useStore(state => state.attachFile);
  const removeFile = useStore(state => state.removeFile);

  const [noteContent, setNoteContent] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isOpening, setIsOpening] = useState(false);

  useLayoutEffect(() => {
    if (topic) navigation.setOptions({ title: topic.title });
  }, [navigation, topic?.title]);

  useEffect(() => {
    supabaseService
      .getNoteByTopicId(topicId)
      .then(note => note && setNoteContent(note.content ?? ''))
      .catch(err => console.error('Error loading note:', err));
  }, [topicId]);

  // Topic can briefly be undefined right after its own deletion unmounts this
  // screen; render nothing rather than crash on the missing row.
  if (!topic) return null;

  const handleSaveNote = () => {
    supabaseService.saveNote(topicId, noteContent).catch(err => console.error('Error saving note:', err));
  };

  const handleAttach = async () => {
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (result.canceled) return;
    const asset = result.assets[0];

    setIsUploading(true);
    try {
      await attachFile(topicId, { uri: asset.uri, name: asset.name, mimeType: asset.mimeType });
    } catch {
      Alert.alert(t('common:error'), t('topics:uploadError'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleOpen = async () => {
    if (!topic.pdf_url) return;
    setIsOpening(true);
    try {
      const url = await supabaseService.getFileUrl(topic.pdf_url);
      await Linking.openURL(url);
    } catch {
      Alert.alert(t('common:error'), t('topics:openError'));
    } finally {
      setIsOpening(false);
    }
  };

  const handleRemove = () => {
    Alert.alert(t('topics:removeFile'), t('topics:removeFileConfirm'), [
      { text: t('common:cancel'), style: 'cancel' },
      {
        text: t('common:delete'),
        style: 'destructive',
        onPress: () => removeFile(topicId).catch(err => console.error('Error removing file:', err)),
      },
    ]);
  };

  const isMastered = topic.status === 'mastered';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Study material */}
        <Text style={styles.sectionTitle}>{t('topics:material')}</Text>
        {topic.pdf_url ? (
          <View style={styles.materialCard}>
            <FileText size={28} color={theme.colors.primary} />
            <Text style={styles.fileName} numberOfLines={1}>{fileNameOf(topic.pdf_url)}</Text>
            <View style={styles.materialActions}>
              <TouchableOpacity style={styles.openButton} onPress={handleOpen} disabled={isOpening}>
                {isOpening ? (
                  <ActivityIndicator size="small" color={theme.colors.onPrimary} />
                ) : (
                  <>
                    <ExternalLink size={18} color={theme.colors.onPrimary} />
                    <Text style={styles.openButtonText}>{t('topics:openFile')}</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconButton} onPress={handleRemove}>
                <Trash2 size={20} color={theme.colors.error} />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={styles.attachCard} onPress={handleAttach} disabled={isUploading}>
            {isUploading ? (
              <>
                <ActivityIndicator color={theme.colors.primary} />
                <Text style={styles.attachText}>{t('topics:uploading')}</Text>
              </>
            ) : (
              <>
                <Paperclip size={24} color={theme.colors.primary} />
                <Text style={styles.attachText}>{t('topics:attachFile')}</Text>
              </>
            )}
          </TouchableOpacity>
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
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: theme.spacing.lg,
  },
  sectionTitle: {
    ...theme.typography.labelCaps,
    color: theme.colors.onSurfaceVariant,
    marginBottom: theme.spacing.sm,
  },
  notesLabel: {
    marginTop: theme.spacing.xl,
  },
  materialCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    ...theme.shadows.level1,
  },
  fileName: {
    ...theme.typography.bodyLg,
    fontWeight: '500',
    color: theme.colors.onSurface,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.md,
    maxWidth: '100%',
  },
  materialActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  openButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    height: 44,
    borderRadius: theme.borderRadius.full,
  },
  openButtonText: {
    ...theme.typography.bodyLg,
    fontWeight: '600',
    color: theme.colors.onPrimary,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surfaceContainerLow,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    borderStyle: 'dashed',
    paddingVertical: theme.spacing.xl,
  },
  attachText: {
    ...theme.typography.bodyLg,
    fontWeight: '600',
    color: theme.colors.primary,
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
});
