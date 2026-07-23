import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Fingerprint } from 'lucide-react-native';
import { theme } from '../constants/theme';
import { useStore } from '../store/useStore';

// Full-screen gate shown over the app while it's locked. Auto-prompts once on
// mount; if that's dismissed, the user taps to try again.
export const LockScreen = () => {
  const { t } = useTranslation('profile');
  const unlockApp = useStore(state => state.unlockApp);
  const [authenticating, setAuthenticating] = useState(false);
  const promptedRef = useRef(false);

  const tryUnlock = async () => {
    if (authenticating) return;
    setAuthenticating(true);
    try {
      await unlockApp();
    } finally {
      setAuthenticating(false);
    }
  };

  useEffect(() => {
    // Prompt automatically the first time the gate appears.
    if (!promptedRef.current) {
      promptedRef.current = true;
      tryUnlock();
    }
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoCard}>
          <Image source={require('../../assets/studiq_logo.png')} style={styles.logo} resizeMode="contain" />
        </View>
        <Text style={styles.title}>{t('unlockTitle')}</Text>
        <Text style={styles.subtitle}>{t('unlockSubtitle')}</Text>
      </View>

      <TouchableOpacity style={styles.button} onPress={tryUnlock} disabled={authenticating}>
        <Fingerprint size={22} color={theme.colors.onPrimary} />
        <Text style={styles.buttonText}>{t('unlockButton')}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xl,
    zIndex: 100,
  },
  content: {
    alignItems: 'center',
    marginBottom: theme.spacing.xxl,
  },
  logoCard: {
    width: 96,
    height: 96,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    ...theme.shadows.level2,
  },
  logo: {
    width: 64,
    height: 64,
  },
  title: {
    ...theme.typography.h2,
    color: theme.colors.onBackground,
    marginBottom: theme.spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    ...theme.typography.bodyLg,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
    height: 56,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.xl,
    position: 'absolute',
    bottom: 60,
  },
  buttonText: {
    ...theme.typography.bodyLg,
    fontWeight: '600',
    color: theme.colors.onPrimary,
  },
});
