import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/navigation/AppNavigator';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import './src/lib/i18n';

// Data loads when HomeScreen mounts (i.e. once a session exists), which also
// avoids fetching here at cold start before auth has been restored.
export default function App() {
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <AppNavigator />
      </ErrorBoundary>
      {/* The UI is light-only (app.json userInterfaceStyle), so pin dark status
          bar icons instead of leaving it to "auto". */}
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}
