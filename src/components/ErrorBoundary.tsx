import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import i18n from '../lib/i18n';
import { theme } from '../constants/theme';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Last-resort guard: a render error anywhere below would otherwise leave testers
 * staring at a blank screen with no idea what happened. Must be a class — React
 * only exposes error catching through lifecycle methods.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    // Kept so the crash is visible in device logs during the private beta.
    console.error('Unhandled render error:', error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <View style={styles.container}>
        <Text style={styles.title}>{i18n.t('common:somethingWrong')}</Text>
        <Text style={styles.message}>{i18n.t('common:somethingWrongDesc')}</Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.background,
  },
  title: {
    ...theme.typography.h2,
    color: theme.colors.onBackground,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  message: {
    ...theme.typography.bodyLg,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
  },
});
