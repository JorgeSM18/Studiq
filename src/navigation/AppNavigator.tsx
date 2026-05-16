import React from 'react';
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
import { LibraryScreen } from '../screens/LibraryScreen';
import { ProgressScreen } from '../screens/ProgressScreen';
import { ProfileScreen } from '../screens/ProfileScreen';

import { useStore } from '../store/useStore';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TabNavigator() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation(['common', 'home', 'topics', 'profile']);
  
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
          tabBarIcon: ({ color, size }) => <Library color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Progreso"
        component={ProgressScreen}
        options={{
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

export function AppNavigator() {
  const { session, isAuthLoading, initializeAuth } = useStore();
  const { t } = useTranslation('common');

  React.useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  if (isAuthLoading) {
    return <SplashScreen />;
  }

  return (
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
  );
}
