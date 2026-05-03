import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useStore } from '../store/useStore';
import { ListItem } from '../components/ListItem';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../constants/theme';

export const TopicsScreen = () => {
  const { topics, isLoading } = useStore();
  const navigation = useNavigation<any>();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'mastered': return theme.colors.success;
      case 'in_progress': return '#F59E0B'; // Podríamos añadirlo al tema
      default: return theme.colors.outline;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'mastered': return 'Dominado';
      case 'in_progress': return 'En curso';
      default: return 'No iniciado';
    }
  };

  const renderTopic = ({ item }: { item: any }) => (
    <ListItem
      title={item.title}
      subtitle={getStatusLabel(item.status)}
      onPress={() => navigation.navigate('TopicDetail', { topicId: item.id })}
      rightElement={
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {getStatusLabel(item.status)}
          </Text>
        </View>
      }
    />
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={topics}
        renderItem={renderTopic}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  list: {
    paddingHorizontal: theme.spacing.lg,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  statusText: {
    ...theme.typography.labelCaps,
    fontSize: 10,
  }
});
