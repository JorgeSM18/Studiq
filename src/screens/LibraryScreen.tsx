import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useStore } from '../store/useStore';
import { ListItem } from '../components/ListItem';
import { FileText } from 'lucide-react-native';

export const LibraryScreen = () => {
  const { topics } = useStore();
  const materials = topics.filter(t => t.pdf_url);

  const renderMaterial = ({ item }: { item: any }) => (
    <ListItem
      title={item.title}
      subtitle="PDF Document"
      onPress={() => console.log('Abrir PDF:', item.pdf_url)}
      icon={<FileText size={20} color="#4F46E5" />}
    />
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={materials}
        renderItem={renderMaterial}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No hay materiales disponibles.</Text>
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
