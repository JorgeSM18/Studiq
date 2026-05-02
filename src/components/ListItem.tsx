import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

interface ListItemProps {
  title: string;
  subtitle?: string;
  onPress: () => void;
  rightElement?: React.ReactNode;
  icon?: React.ReactNode;
}

export const ListItem = ({ title, subtitle, onPress, rightElement, icon }: ListItemProps) => {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.6}>
      <View style={styles.leftContent}>
        {icon && <View style={styles.iconContainer}>{icon}</View>}
        <View>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      </View>
      <View style={styles.rightContent}>
        {rightElement || <ChevronRight size={20} color="#9CA3AF" />}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    marginRight: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  rightContent: {
    marginLeft: 8,
  }
});
