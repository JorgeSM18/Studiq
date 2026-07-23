import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Alert, Linking, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as DocumentPicker from 'expo-document-picker';
import { FileText, Plus, X, Tag, Trash2, CheckCircle2, Circle, Library as LibraryIcon } from 'lucide-react-native';
import { useStore } from '../store/useStore';
import { supabaseService } from '../services/supabaseService';
import { ListItem } from '../components/ListItem';
import { theme } from '../constants/theme';
import { Material } from '../types';

export const LibraryScreen = () => {
  const { t } = useTranslation(['topics', 'common']);
  const materials = useStore(state => state.materials);
  const topics = useStore(state => state.topics);
  const uploadMaterial = useStore(state => state.uploadMaterial);
  const deleteMaterial = useStore(state => state.deleteMaterial);
  const setMaterialTopic = useStore(state => state.setMaterialTopic);
  const suppressLock = useStore(state => state.suppressLock);

  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState<{ current: number; total: number } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pickerOpen, setPickerOpen] = useState(false);

  const selecting = selected.size > 0;
  const topicTitle = (id: string | null) => topics.find(topic => topic.id === id)?.title;

  const clearSelection = () => setSelected(new Set());
  const toggleSelect = (id: string) =>
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const handleUpload = async () => {
    const result = await DocumentPicker.getDocumentAsync({ multiple: true, copyToCacheDirectory: true });
    if (result.canceled) return;

    const assets = result.assets;
    let failed = 0;
    for (let i = 0; i < assets.length; i++) {
      setUploading({ current: i + 1, total: assets.length });
      const asset = assets[i];
      try {
        await uploadMaterial(null, { uri: asset.uri, name: asset.name, mimeType: asset.mimeType });
      } catch {
        failed++;
      }
    }
    setUploading(null);
    if (failed > 0) Alert.alert(t('common:error'), t('topics:uploadSomeFailed', { count: failed }));
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

  // Assign every selected file to a topic (or back to the library with null).
  const assignSelected = async (topicId: string | null) => {
    const ids = [...selected];
    setPickerOpen(false);
    clearSelection();
    try {
      for (const id of ids) await setMaterialTopic(id, topicId);
    } catch {
      Alert.alert(t('common:error'), t('common:retry'));
    }
  };

  const deleteSelected = () => {
    const ids = [...selected];
    Alert.alert(t('topics:deleteFile'), t('topics:deleteSelectedConfirm', { count: ids.length }), [
      { text: t('common:cancel'), style: 'cancel' },
      {
        text: t('common:delete'),
        style: 'destructive',
        onPress: async () => {
          clearSelection();
          try {
            for (const id of ids) await deleteMaterial(id);
          } catch {
            Alert.alert(t('common:error'), t('common:retry'));
          }
        },
      },
    ]);
  };

  const onRowPress = (material: Material) => (selecting ? toggleSelect(material.id) : openFile(material));

  const renderMaterial = ({ item }: { item: Material }) => {
    const title = topicTitle(item.topic_id);
    const isSelected = selected.has(item.id);
    return (
      <ListItem
        title={item.name}
        subtitle={title ? t('topics:assignedTo', { title }) : t('topics:unassigned')}
        onPress={() => onRowPress(item)}
        onLongPress={() => !selecting && toggleSelect(item.id)}
        icon={<FileText size={20} color={theme.colors.primary} />}
        rightElement={
          selecting ? (
            isSelected ? (
              <CheckCircle2 size={24} color={theme.colors.primary} />
            ) : (
              <Circle size={24} color={theme.colors.outlineVariant} />
            )
          ) : undefined
        }
      />
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {selecting ? (
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={clearSelection} style={styles.iconButton}>
              <X size={22} color={theme.colors.onSurface} />
            </TouchableOpacity>
            <Text style={styles.selectionCount}>{t('topics:selectedCount', { count: selected.size })}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => setPickerOpen(true)} style={styles.iconButton}>
              <Tag size={22} color={theme.colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={deleteSelected} style={styles.iconButton}>
              <Trash2 size={22} color={theme.colors.error} />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('topics:libraryTitle')}</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleUpload}
            disabled={busy || uploading !== null}
            accessibilityLabel={t('topics:uploadNew')}
          >
            {uploading ? (
              <ActivityIndicator size="small" color={theme.colors.onPrimary} />
            ) : (
              <Plus size={22} color={theme.colors.onPrimary} />
            )}
          </TouchableOpacity>
        </View>
      )}

      {uploading && (
        <View style={styles.uploadingBanner}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={styles.uploadingText}>
            {t('topics:uploadingProgress', { current: uploading.current, total: uploading.total })}
          </Text>
        </View>
      )}

      <FlatList
        data={materials}
        renderItem={renderMaterial}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>{t('topics:noMaterials')}</Text>
            <Text style={styles.emptyDesc}>{t('topics:noMaterialsDesc')}</Text>
          </View>
        }
      />

      {/* Assign the selected files to a topic (or move back to the library). */}
      <Modal visible={pickerOpen} transparent animationType="slide" onRequestClose={() => setPickerOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('topics:assignToTopic')}</Text>
              <TouchableOpacity onPress={() => setPickerOpen(false)}>
                <X size={24} color={theme.colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={topics}
              keyExtractor={item => item.id}
              ListHeaderComponent={
                // Only offer "remove from topic" when a selected file actually has
                // one — nothing to remove if they're all unassigned already.
                [...selected].some(id => materials.find(m => m.id === id)?.topic_id) ? (
                  <ListItem
                    title={t('topics:moveToLibrary')}
                    onPress={() => assignSelected(null)}
                    icon={<LibraryIcon size={20} color={theme.colors.onSurfaceVariant} />}
                  />
                ) : null
              }
              renderItem={({ item }) => (
                <ListItem
                  title={item.title}
                  onPress={() => assignSelected(item.id)}
                  icon={<Tag size={20} color={theme.colors.primary} />}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    minHeight: 64,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  headerTitle: {
    ...theme.typography.h1,
    color: theme.colors.onBackground,
  },
  selectionCount: {
    ...theme.typography.h3,
    color: theme.colors.onBackground,
  },
  iconButton: {
    padding: 6,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceContainerLow,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  uploadingText: {
    ...theme.typography.bodySm,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  list: {
    paddingHorizontal: theme.spacing.lg,
    flexGrow: 1,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.xxl,
  },
  emptyTitle: {
    ...theme.typography.h3,
    color: theme.colors.onBackground,
    marginBottom: theme.spacing.sm,
  },
  emptyDesc: {
    ...theme.typography.bodyLg,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
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
