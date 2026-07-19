import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { FileText } from 'lucide-react-native';
import { useStore } from '../store/useStore';
import { supabaseService } from '../services/supabaseService';
import { ListItem } from '../components/ListItem';
import { theme } from '../constants/theme';
import { Topic } from '../types';

const fileNameOf = (path: string) => path.split('/').pop() || path;

export const LibraryScreen = () => {
  const { t } = useTranslation(['topics', 'common']);
  const topics = useStore(state => state.topics);
  const materials = topics.filter(topic => topic.pdf_url);
  const [openingId, setOpeningId] = useState<string | null>(null);

  const handleOpen = async (topic: Topic) => {
    if (!topic.pdf_url || openingId) return;
    setOpeningId(topic.id);
    try {
      const url = await supabaseService.getFileUrl(topic.pdf_url);
      await Linking.openURL(url);
    } catch {
      Alert.alert(t('common:error'), t('topics:openError'));
    } finally {
      setOpeningId(null);
    }
  };

  const renderMaterial = ({ item }: { item: Topic }) => (
    <ListItem
      title={item.title}
      subtitle={item.pdf_url ? fileNameOf(item.pdf_url) : undefined}
      onPress={() => handleOpen(item)}
      icon={<FileText size={20} color={theme.colors.primary} />}
    />
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('topics:libraryTitle')}</Text>
      </View>
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  headerTitle: {
    ...theme.typography.h1,
    color: theme.colors.onBackground,
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
});
