import React from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { useStore } from '../store/useStore';
import { Card } from '../components/Card';
import { ListItem } from '../components/ListItem';
import { CheckCircle2, Circle } from 'lucide-react-native';

export const HomeScreen = () => {
  const { todayTasks, isLoading, fetchInitialData, updateTask } = useStore();

  const renderTask = ({ item }: { item: any }) => (
    <ListItem
      title={item.topic_title}
      subtitle={item.type === 'review' ? 'Repaso' : 'Nuevo tema'}
      onPress={() => updateTask(item.id, !item.completed)}
      rightElement={
        item.completed ? (
          <CheckCircle2 size={24} color="#10B981" />
        ) : (
          <Circle size={24} color="#D1D5DB" />
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
          <RefreshControl refreshing={isLoading} onRefresh={fetchInitialData} />
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
    backgroundColor: '#F9FAFB',
  },
  header: {
    padding: 20,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
  },
  summary: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 4,
  },
  list: {
    padding: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
  }
});
