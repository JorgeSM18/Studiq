import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Circle, CalendarClock, ChevronDown } from 'lucide-react-native';
import { useStore } from '../store/useStore';
import { ListItem } from '../components/ListItem';
import { ExamManagerModal } from '../components/ExamManagerModal';
import { theme } from '../constants/theme';
import { Topic } from '../types';
import { buildDailyPlan, isReview, daysUntil } from '../utils/plan';

export const HomeScreen = () => {
  // Per-field selectors so Home only re-renders when its own slices change, not
  // on every unrelated store update.
  const topics = useStore(state => state.topics);
  const studiedTodayIds = useStore(state => state.studiedTodayIds);
  const profile = useStore(state => state.profile);
  const subjects = useStore(state => state.subjects);
  const activeSubjectId = useStore(state => state.activeSubjectId);
  const isLoading = useStore(state => state.isLoading);
  const fetchInitialData = useStore(state => state.fetchInitialData);
  const toggleStudiedToday = useStore(state => state.toggleStudiedToday);
  const navigation = useNavigation<any>();
  const { t } = useTranslation(['home', 'topics']);
  const [examModalOpen, setExamModalOpen] = useState(false);

  const activeSubject = subjects.find(s => s.id === activeSubjectId);
  const plan = buildDailyPlan(topics, studiedTodayIds, activeSubject?.exam_date ?? null);
  const pending = plan.filter(topic => !studiedTodayIds.includes(topic.id)).length;

  useEffect(() => {
    fetchInitialData();
  }, []);

  const examLabel = (): string | null => {
    if (!activeSubject?.exam_date) return null;
    const days = daysUntil(activeSubject.exam_date);
    if (days < 0) return t('home:examPast');
    if (days === 0) return t('home:examToday');
    return t('home:daysToExam', { count: days });
  };

  const renderTopic = ({ item }: { item: Topic }) => {
    const studied = studiedTodayIds.includes(item.id);
    return (
      <ListItem
        title={item.title}
        subtitle={isReview(item) ? t('home:reviewLabel') : t('home:newTopicLabel')}
        onPress={() => navigation.navigate('TopicDetail', { topicId: item.id })}
        rightElement={
          <TouchableOpacity
            onPress={() => toggleStudiedToday(item.id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {studied ? (
              <CheckCircle2 size={26} color={theme.colors.success} />
            ) : (
              <Circle size={26} color={theme.colors.outlineVariant} />
            )}
          </TouchableOpacity>
        }
      />
    );
  };

  const subtitle =
    plan.length === 0
      ? null
      : pending === 0
        ? t('home:allStudiedToday')
        : t('home:todayCount', { count: pending });

  const exam = examLabel();
  const allMastered = topics.length > 0 && topics.every(t => t.status === 'mastered');
  const emptyTitle =
    topics.length === 0
      ? t('home:noTopicsTitle')
      : allMastered
        ? t('home:allMastered')
        : t('home:doneForToday');

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.greeting}>
          {t('home:greetingNamed', { name: profile?.full_name || t('home:student') })}
        </Text>
        {subtitle && <Text style={styles.summary}>{subtitle}</Text>}
        <TouchableOpacity
          style={styles.examPill}
          onPress={() => setExamModalOpen(true)}
          accessibilityLabel={t('home:manageExams')}
        >
          <CalendarClock size={16} color={theme.colors.primary} />
          <Text style={styles.examText} numberOfLines={1}>
            {activeSubject ? `${activeSubject.name}${exam ? ` · ${exam}` : ''}` : t('home:manageExams')}
          </Text>
          <ChevronDown size={16} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={plan}
        renderItem={renderTopic}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={fetchInitialData} tintColor={theme.colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>{emptyTitle}</Text>
            {topics.length === 0 && <Text style={styles.emptyDesc}>{t('home:noTopicsDesc')}</Text>}
          </View>
        }
      />

      <ExamManagerModal visible={examModalOpen} onClose={() => setExamModalOpen(false)} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: theme.spacing.lg,
  },
  greeting: {
    ...theme.typography.h1,
    color: theme.colors.onBackground,
  },
  summary: {
    ...theme.typography.bodyLg,
    color: theme.colors.onSurfaceVariant,
    marginTop: theme.spacing.xs,
  },
  examPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    maxWidth: '100%',
    backgroundColor: theme.colors.surfaceContainerLow,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
    marginTop: theme.spacing.md,
  },
  examText: {
    ...theme.typography.bodySm,
    fontWeight: '600',
    color: theme.colors.primary,
    flexShrink: 1,
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
    textAlign: 'center',
  },
  emptyDesc: {
    ...theme.typography.bodyLg,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
  },
});
