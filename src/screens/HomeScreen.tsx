import React, { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import { ListItem } from '../components/ListItem';
import { CheckCircle2, Circle, Info } from 'lucide-react-native';
import { theme } from '../constants/theme';

export const HomeScreen = () => {
  const { 
    todayTasks, 
    topics, 
    profile, 
    subjects, 
    activeSubjectId, 
    isLoading, 
    fetchInitialData, 
    updateTask 
  } = useStore();
  const activeSubject = subjects.find(s => s.id === activeSubjectId);
  const hasMaterials = topics.some(t => t.pdf_url);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const renderTask = ({ item }: { item: any }) => (
    <ListItem
      title={item.topic_title}
      subtitle={item.type === 'review' ? 'Repaso' : 'Nuevo tema'}
      onPress={() => updateTask(item.id, !item.completed)}
      rightElement={
        item.completed ? (
          <CheckCircle2 size={24} color={theme.colors.success} />
        ) : (
          <Circle size={24} color={theme.colors.outlineVariant} />
        )
      }
    />
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Hola, {profile?.full_name || 'Estudiante'}</Text>
        <Text style={styles.summary}>
          {activeSubject ? `${activeSubject.name}: ` : ''}
          Tienes {todayTasks.filter(t => !t.completed).length} tareas para hoy.
        </Text>
      </View>

      {!hasMaterials && (
        <View style={styles.noticeWrapper}>
          <View style={styles.noticeCard}>
            <View style={styles.noticeHeader}>
              <Info size={20} color={theme.colors.primary} />
              <Text style={styles.noticeTitle}>Próximo Paso: Biblioteca</Text>
            </View>
            <Text style={styles.noticeText}>
              Para generar tu plan de estudio inteligente, recuerda subir tus temarios y documentos en la sección de Biblioteca.
            </Text>
          </View>
        </View>
      )}

      <FlatList
        data={todayTasks}
        renderItem={renderTask}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={fetchInitialData} tintColor={theme.colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>¡Todo listo por hoy!</Text>
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
  list: {
    paddingHorizontal: theme.spacing.lg,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: theme.spacing.xxl,
  },
  emptyText: {
    ...theme.typography.bodyLg,
    color: theme.colors.outline,
  },
  noticeWrapper: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  noticeCard: {
    backgroundColor: '#EEF2FF',
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.separator,
  },
  noticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  noticeTitle: {
    ...theme.typography.bodyLg,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginLeft: theme.spacing.xs,
  },
  noticeText: {
    ...theme.typography.bodyLg,
    color: theme.colors.primary,
  },
});
