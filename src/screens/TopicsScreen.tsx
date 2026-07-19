import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react-native';
import { useStore } from '../store/useStore';
import { ListItem } from '../components/ListItem';
import { theme } from '../constants/theme';
import { Topic, TopicStatus } from '../types';

const STATUS_COLORS: Record<TopicStatus, string> = {
  mastered: theme.colors.success,
  in_progress: '#F59E0B',
  not_started: theme.colors.outline,
};

const STATUS_LABEL_KEYS: Record<TopicStatus, string> = {
  mastered: 'topics:mastered',
  in_progress: 'topics:inProgress',
  not_started: 'topics:notStarted',
};

export const TopicsScreen = () => {
  const topics = useStore(state => state.topics);
  const deleteTopic = useStore(state => state.deleteTopic);
  const navigation = useNavigation<any>();
  const { t } = useTranslation(['topics', 'common']);

  const confirmDelete = (topic: Topic) => {
    Alert.alert(
      t('topics:deleteTopicTitle'),
      t('topics:deleteTopicMessage', { title: topic.title }),
      [
        { text: t('common:cancel'), style: 'cancel' },
        { text: t('common:delete'), style: 'destructive', onPress: () => deleteTopic(topic.id) },
      ]
    );
  };

  const renderTopic = ({ item }: { item: Topic }) => {
    const color = STATUS_COLORS[item.status];
    return (
      <ListItem
        title={item.title}
        onPress={() => navigation.navigate('TopicDetail', { topicId: item.id })}
        onLongPress={() => confirmDelete(item)}
        rightElement={
          <View style={[styles.statusBadge, { backgroundColor: color + '20' }]}>
            <Text style={[styles.statusText, { color }]}>{t(STATUS_LABEL_KEYS[item.status])}</Text>
          </View>
        }
      />
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('topics:topicsTitle')}</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('BulkAddTopics')}
          accessibilityLabel={t('topics:createTopic')}
        >
          <Plus size={22} color={theme.colors.onPrimary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={topics}
        renderItem={renderTopic}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>{t('topics:noTopics')}</Text>
            <Text style={styles.emptyDesc}>{t('topics:noTopicsDesc')}</Text>
            <TouchableOpacity
              style={styles.emptyCta}
              onPress={() => navigation.navigate('BulkAddTopics')}
            >
              <Text style={styles.emptyCtaText}>{t('topics:createTopic')}</Text>
            </TouchableOpacity>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  headerTitle: {
    ...theme.typography.h1,
    color: theme.colors.onBackground,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    paddingHorizontal: theme.spacing.lg,
    flexGrow: 1,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  statusText: {
    ...theme.typography.labelCaps,
    fontSize: 10,
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
    marginBottom: theme.spacing.lg,
  },
  emptyCta: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.xl,
    height: 52,
    borderRadius: theme.borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCtaText: {
    ...theme.typography.bodyLg,
    fontWeight: '600',
    color: theme.colors.onPrimary,
  },
});
