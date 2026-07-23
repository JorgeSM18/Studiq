import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { theme } from '../constants/theme';

interface ListItemProps {
  title: string;
  subtitle?: string;
  onPress: () => void;
  onLongPress?: () => void;
  rightElement?: React.ReactNode;
  icon?: React.ReactNode;
}

export const ListItem = ({ title, subtitle, onPress, onLongPress, rightElement, icon }: ListItemProps) => {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} onLongPress={onLongPress} activeOpacity={0.6}>
      <View style={styles.leftContent}>
        {icon && <View style={styles.iconContainer}>{icon}</View>}
        <View style={styles.textContent}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
        </View>
      </View>
      <View style={styles.rightContent}>
        {rightElement || <ChevronRight size={20} color={theme.colors.outline} />}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.separator,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  textContent: {
    flex: 1,
  },
  iconContainer: {
    marginRight: theme.spacing.md,
  },
  title: {
    ...theme.typography.bodyLg,
    fontWeight: '500',
    color: theme.colors.onSurface,
  },
  subtitle: {
    ...theme.typography.bodySm,
    color: theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  rightContent: {
    marginLeft: theme.spacing.sm,
  }
});
