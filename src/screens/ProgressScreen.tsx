import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useStore } from '../store/useStore';
import { Card } from '../components/Card';
import { Flame, Target, Award } from 'lucide-react-native';
import { theme } from '../constants/theme';

export const ProgressScreen = () => {
  const { t } = useTranslation('progress');
  const progress = useStore(state => state.progress);
  const subjects = useStore(state => state.subjects);
  const activeSubjectId = useStore(state => state.activeSubjectId);
  const activeSubject = subjects.find(s => s.id === activeSubjectId);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('progressTitle')}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.mainCard}>
          <Text style={styles.percentageText}>{progress.percentage_completed}%</Text>
          <Text style={styles.percentageLabel}>
            {t('progressIn', { subject: activeSubject?.name || t('subjectFallback') })}
          </Text>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: `${progress.percentage_completed}%` }]} />
          </View>
        </Card>

        <View style={styles.statsGrid}>
          <Card style={styles.statCard}>
            <Flame size={24} color={theme.colors.error} />
            <Text style={styles.statValue}>{progress.study_streak}</Text>
            <Text style={styles.statLabel}>{t('streakDays')}</Text>
          </Card>

          <Card style={styles.statCard}>
            <Award size={24} color={theme.colors.primaryContainer} />
            <Text style={styles.statValue}>{progress.mastered_topics}</Text>
            <Text style={styles.statLabel}>{t('masteredTopics')}</Text>
          </Card>
        </View>

        <Card style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Target size={20} color={theme.colors.primary} />
            <Text style={styles.infoText}>
              {t('masteredOf', { mastered: progress.mastered_topics, total: progress.total_topics })}
            </Text>
          </View>
        </Card>
      </ScrollView>
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
  content: {
    padding: theme.spacing.lg,
    paddingTop: 0,
  },
  mainCard: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
  },
  percentageText: {
    ...theme.typography.display,
    fontSize: 48,
    color: theme.colors.primary,
  },
  percentageLabel: {
    ...theme.typography.bodyLg,
    color: theme.colors.onSurfaceVariant,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.lg,
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: theme.colors.separator,
    borderRadius: theme.borderRadius.full,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: theme.colors.primary,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  statCard: {
    flex: 0.48,
    alignItems: 'center',
  },
  statValue: {
    ...theme.typography.h2,
    color: theme.colors.onBackground,
    marginTop: theme.spacing.sm,
  },
  statLabel: {
    ...theme.typography.bodySm,
    color: theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  infoCard: {
    marginTop: theme.spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    ...theme.typography.bodyLg,
    color: theme.colors.onSurface,
    marginLeft: theme.spacing.md,
  }
});
