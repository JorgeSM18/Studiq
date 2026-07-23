import React from 'react';
import { AppState } from 'react-native';
import { theme } from '../constants/theme';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import { Home, Book, Library, BarChart2, User } from 'lucide-react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

// Pantallas Auth
import { WelcomeScreen } from '../screens/auth/WelcomeScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { VerifyEmailScreen } from '../screens/auth/VerifyEmailScreen';
import { SplashScreen } from '../screens/SplashScreen';

// Pantallas Main
import { HomeScreen } from '../screens/HomeScreen';
import { TopicsScreen } from '../screens/TopicsScreen';
import { TopicDetailScreen } from '../screens/TopicDetailScreen';
import { BulkAddTopicsScreen } from '../screens/BulkAddTopicsScreen';
import { LibraryScreen } from '../screens/LibraryScreen';
import { ProgressScreen } from '../screens/ProgressScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { LockScreen } from '../screens/LockScreen';

import { useStore } from '../store/useStore';
import { supabase } from '../lib/supabase';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TabNavigator() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation(['common', 'home', 'topics', 'profile', 'progress']);
  
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.outline,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.separator,
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 8,
          height: 60 + Math.max(insets.bottom, 0),
        },
        tabBarLabelStyle: {
          ...theme.typography.labelCaps,
          fontSize: 10,
          marginTop: -4,
        },
      }}
    >
      <Tab.Screen
        name="Hoy"
        component={HomeScreen}
        options={{
          tabBarLabel: t('home:todayPlan'),
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Temas"
        component={TopicsScreen}
        options={{
          tabBarLabel: t('topics:topicsTitle'),
          tabBarIcon: ({ color, size }) => <Book color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Biblioteca"
        component={LibraryScreen}
        options={{
          tabBarLabel: t('topics:libraryTitle'),
          tabBarIcon: ({ color, size }) => <Library color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Progreso"
        component={ProgressScreen}
        options={{
          tabBarLabel: t('progress:progressTab'),
          tabBarIcon: ({ color, size }) => <BarChart2 color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Perfil"
        component={ProfileScreen}
        options={{
          tabBarLabel: t('profile:profileTitle'),
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}

// Quick app switches (e.g. opening a file to view it) within this window don't
// re-prompt biometrics; longer absences relock.
const LOCK_GRACE_MS = 20000;

export function AppNavigator() {
  const session = useStore(state => state.session);
  const isAuthLoading = useStore(state => state.isAuthLoading);
  const initializeAuth = useStore(state => state.initializeAuth);
  const setSession = useStore(state => state.setSession);
  const biometricEnabled = useStore(state => state.biometricEnabled);
  const isLocked = useStore(state => state.isLocked);
  const { t } = useTranslation('common');

  React.useEffect(() => {
    initializeAuth();
    useStore.getState().loadPrefs();
    useStore.getState().initBiometricLock();

    // React to sign-out, token refresh and, crucially, token-refresh failure
    // (fires SIGNED_OUT), so an expired session routes back to the login stack
    // instead of stranding the user on authenticated screens.
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    // Biometric app-lock: hide content on background, re-prompt on return unless
    // the app was away only briefly (grace window).
    let backgroundedAt = 0;
    const appSub = AppState.addEventListener('change', state => {
      const store = useStore.getState();
      if (!store.biometricEnabled) return;
      if (state === 'background' || state === 'inactive') {
        // Skip the lock once if the app itself opened a file (viewing it isn't
        // "leaving" the app); consume the flag so the next background locks.
        if (store.lockSuppressed) {
          useStore.setState({ lockSuppressed: false });
          return;
        }
        backgroundedAt = Date.now();
        store.lockApp();
      } else if (state === 'active') {
        useStore.setState({ lockSuppressed: false });
        if (store.isLocked && Date.now() - backgroundedAt < LOCK_GRACE_MS) store.forceUnlock();
      }
    });

    return () => {
      data.subscription.unsubscribe();
      appSub.remove();
    };
  }, [initializeAuth, setSession]);

  if (isAuthLoading) {
    return <SplashScreen />;
  }

  const locked = !!session && biometricEnabled && isLocked;

  return (
    <>
      <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#F9FAFB' },
        }}
      >
        {session ? (
          // Main App Flow
          <>
            <Stack.Screen name="Main" component={TabNavigator} />
            <Stack.Screen
              name="TopicDetail"
              component={TopicDetailScreen}
              options={{
                headerShown: true,
                title: t('topics:topicName', { defaultValue: 'Topic' }),
                headerBackTitle: t('back')
              }}
            />
            <Stack.Screen
              name="BulkAddTopics"
              component={BulkAddTopicsScreen}
              options={{ presentation: 'modal' }}
            />
          </>
        ) : (
          // Auth Flow
          <>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
          </>
        )}
      </Stack.Navigator>
      </NavigationContainer>
      {locked && <LockScreen />}
    </>
  );
}
