import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useStore } from '../store/useStore';
import { Card } from '../components/Card';
import { Flame, Target, Award } from 'lucide-react-native';

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
          <Flame size={24} color="#EF4444" />
          <Text style={styles.statValue}>{progress.study_streak}</Text>
          <Text style={styles.statLabel}>Racha días</Text>
        </Card>

        <Card style={styles.statCard}>
          <Award size={24} color="#F59E0B" />
          <Text style={styles.statValue}>{progress.mastered_topics}</Text>
          <Text style={styles.statLabel}>Temas dominados</Text>
        </Card>
      </View>

      <Card style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Target size={20} color="#4F46E5" />
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
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 20,
  },
  mainCard: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  percentageText: {
    fontSize: 48,
    fontWeight: '800',
    color: '#4F46E5',
  },
  percentageLabel: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 4,
    marginBottom: 20,
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4F46E5',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statCard: {
    flex: 0.48,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  infoCard: {
    marginTop: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 15,
    color: '#374151',
    marginLeft: 12,
  }
});
