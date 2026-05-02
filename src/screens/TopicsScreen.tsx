import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useStore } from '../store/useStore';
import { ListItem } from '../components/ListItem';
import { useNavigation } from '@react-navigation/native';

export const TopicsScreen = () => {
  const { topics, isLoading } = useStore();
  const navigation = useNavigation<any>();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'mastered': return '#10B981';
      case 'in_progress': return '#F59E0B';
      default: return '#9CA3AF';
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
    backgroundColor: '#F9FAFB',
  },
  list: {
    padding: 20,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  }
});
