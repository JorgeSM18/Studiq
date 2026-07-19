import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { theme } from '../constants/theme';

export const SplashScreen = () => {
  const { t } = useTranslation('common');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animación de entrada
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    // Animación de la barra de progreso
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 5000,
      useNativeDriver: false,
    }).start();
  }, []);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* Logo Card */}
        <View style={styles.logoCard}>
          <Image
            source={require('../../assets/studiq_logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Text */}
        <Text style={styles.title}>Studiq</Text>
        <Text style={styles.tagline}>{t('tagline')}</Text>
      </Animated.View>

      {/* Footer Loading */}
      <View style={styles.footer}>
        <View style={styles.progressContainer}>
          <Animated.View style={[styles.progressBar, { width: progressWidth }]} />
        </View>
        <Text style={styles.loadingText}>{t('loading')}</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
  },
  logoCard: {
    width: 120,
    height: 120,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    ...theme.shadows.level2,
  },
  logo: {
    width: 80,
    height: 80,
  },
  title: {
    ...theme.typography.display,
    color: theme.colors.onBackground,
    marginBottom: theme.spacing.xs,
  },
  tagline: {
    ...theme.typography.bodyLg,
    color: theme.colors.onSurfaceVariant,
    letterSpacing: 0.5,
  },
  footer: {
    position: 'absolute',
    bottom: 60,
    alignItems: 'center',
    width: '100%',
  },
  progressContainer: {
    width: 100,
    height: 3,
    backgroundColor: theme.colors.separator,
    borderRadius: 2,
    marginBottom: 12,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: theme.colors.primaryContainer,
  },
  loadingText: {
    ...theme.typography.labelCaps,
    color: theme.colors.outline,
  },
});
