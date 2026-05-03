import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, Animated, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../constants/theme';

const { width } = Dimensions.get('window');

export const SplashScreen = () => {
  const navigation = useNavigation<any>();
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

    // Navegación después de 5 segundos
    const timer = setTimeout(() => {
      navigation.replace('Main');
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
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
        <Text style={styles.tagline}>Focus on what matters.</Text>
      </Animated.View>

      {/* Footer Loading */}
      <View style={styles.footer}>
        <View style={styles.progressContainer}>
          <Animated.View style={[styles.progressBar, { width: progressWidth }]} />
        </View>
        <Text style={styles.loadingText}>MASTERY LOADING</Text>
      </View>
    </View>
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
