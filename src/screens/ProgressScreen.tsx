import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useStore } from '../store/useStore';
import { Card } from '../components/Card';
import { Flame, Target, Award } from 'lucide-react-native';
import { theme } from '../constants/theme';

export const ProgressScreen = () => {
  const { progress } = useStore();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.mainCard}>
        <Text style={styles.percentageText}>{progress.percentage_completed}%</Text>
        <Text style={styles.percentageLabel}>Progreso Total</Text>
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { width: `${progress.percentage_completed}%` }]} />
        </View>
      </Card>

      <View style={styles.statsGrid}>
        <Card style={styles.statCard}>
          <Flame size={24} color={theme.colors.error} />
          <Text style={styles.statValue}>{progress.study_streak}</Text>
          <Text style={styles.statLabel}>Racha días</Text>
        </Card>

        <Card style={styles.statCard}>
          <Award size={24} color={theme.colors.primaryContainer} />
          <Text style={styles.statValue}>{progress.mastered_topics}</Text>
          <Text style={styles.statLabel}>Temas dominados</Text>
        </Card>
      </View>

      <Card style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Target size={20} color={theme.colors.primary} />
          <Text style={styles.infoText}>
            Has dominado {progress.mastered_topics} de {progress.total_topics} temas.
          </Text>
        </View>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.lg,
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
