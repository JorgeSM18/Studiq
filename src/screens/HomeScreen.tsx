import React from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { useStore } from '../store/useStore';
import { Card } from '../components/Card';
import { ListItem } from '../components/ListItem';
import { CheckCircle2, Circle } from 'lucide-react-native';
import { theme } from '../constants/theme';

export const HomeScreen = () => {
  const { todayTasks, isLoading, fetchInitialData, updateTask } = useStore();

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
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Hola, Jorge</Text>
        <Text style={styles.summary}>Tienes {todayTasks.filter(t => !t.completed).length} tareas para hoy.</Text>
      </View>

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
    </View>
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
  }
});
