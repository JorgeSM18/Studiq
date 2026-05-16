import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import { ListItem } from '../components/ListItem';
import { FileText } from 'lucide-react-native';
import { theme } from '../constants/theme';

export const LibraryScreen = () => {
  const { topics } = useStore();
  const materials = topics.filter(t => t.pdf_url);

  const renderMaterial = ({ item }: { item: any }) => (
    <ListItem
      title={item.title}
      subtitle="PDF Document"
      onPress={() => console.log('Abrir PDF:', item.pdf_url)}
      icon={<FileText size={20} color={theme.colors.primary} />}
    />
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  list: {
    padding: theme.spacing.lg,
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
