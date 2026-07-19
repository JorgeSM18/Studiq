import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { MailCheck, ChevronLeft, RefreshCw } from 'lucide-react-native';
import { theme } from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import { useStore } from '../../store/useStore';

export const VerifyEmailScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { t } = useTranslation(['auth', 'common']);
  const { initializeAuth } = useStore();

  const email: string = route.params?.email ?? '';

  const [isResending, setIsResending] = useState(false);
  const [isCheckingVerification, setIsCheckingVerification] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Countdown timer para el botón de reenvío
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Polling automático: comprueba cada 4 segundos si el usuario ya verificó
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email_confirmed_at) {
          clearInterval(interval);
          // Recarga la sesión, lo que navegará automáticamente al Main
          await initializeAuth();
        }
      } catch {
        // Silenciar errores del polling
      }
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const handleResendEmail = async () => {
    if (resendCooldown > 0 || !email) return;
    setIsResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });
      if (error) throw error;
      Alert.alert(t('auth:registerSuccess'), t('auth:resendEmailSuccess'));
      setResendCooldown(60); // 60 segundos de espera
    } catch {
      Alert.alert(t('common:error'), t('auth:resendEmailError'));
    } finally {
      setIsResending(false);
    }
  };

  const handleCheckNow = async () => {
    setIsCheckingVerification(true);
    try {
      // Forzamos un refresh de la sesión para ver si Supabase la ha actualizado
      const { data, error } = await supabase.auth.refreshSession();
      if (error) throw error;

      if (data.user?.email_confirmed_at) {
        await initializeAuth();
      } else {
        Alert.alert(t('common:error'), t('auth:notVerifiedYet'));
      }
    } catch {
      Alert.alert(t('common:error'), t('auth:resendEmailError'));
    } finally {
      setIsCheckingVerification(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Back button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.navigate('Welcome')}
      >
        <ChevronLeft size={24} color={theme.colors.onSurface} />
        <Text style={styles.backText}>{t('auth:backToLogin')}</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        {/* Icono central */}
        <View style={styles.iconWrapper}>
          <View style={styles.iconContainer}>
            <MailCheck size={36} color={theme.colors.primary} />
          </View>
          {/* Pulso animado decorativo */}
          <View style={styles.iconRing} />
        </View>

        {/* Textos */}
        <Text style={styles.title}>{t('auth:verifyEmailTitle')}</Text>
        <Text style={styles.subtitle}>{t('auth:verifyEmailSubtitle')}</Text>
        <Text style={styles.email}>{email}</Text>
        <Text style={styles.instructions}>{t('auth:verifyEmailInstructions')}</Text>

        {/* Botón principal — comprobar verificación */}
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleCheckNow}
          disabled={isCheckingVerification}
        >
          {isCheckingVerification ? (
            <ActivityIndicator color={theme.colors.onPrimary} />
          ) : (
            <Text style={styles.primaryButtonText}>{t('auth:verifiedButton')}</Text>
          )}
        </TouchableOpacity>

        {/* Botón secundario — reenviar */}
        <TouchableOpacity
          style={[
            styles.secondaryButton,
            (isResending || resendCooldown > 0) && styles.secondaryButtonDisabled,
          ]}
          onPress={handleResendEmail}
          disabled={isResending || resendCooldown > 0}
        >
          {isResending ? (
            <ActivityIndicator color={theme.colors.primary} size="small" />
          ) : (
            <>
              <RefreshCw
                size={16}
                color={resendCooldown > 0 ? theme.colors.outline : theme.colors.primary}
                style={styles.resendIcon}
              />
              <Text
                style={[
                  styles.secondaryButtonText,
                  resendCooldown > 0 && styles.secondaryButtonTextDisabled,
                ]}
              >
                {resendCooldown > 0
                  ? `${t('auth:resendEmail')} (${resendCooldown}s)`
                  : t('auth:resendEmail')}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Tip de spam */}
        <Text style={styles.spamHint}>{t('auth:checkSpam')}</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F2FF',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  backText: {
    ...theme.typography.bodyLg,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginLeft: 4,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: 40,
  },
  iconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 80,
    height: 80,
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.level1,
    zIndex: 1,
  },
  iconRing: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: theme.colors.primaryContainer,
    opacity: 0.5,
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.onBackground,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    ...theme.typography.bodyLg,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
  },
  email: {
    ...theme.typography.bodyLg,
    color: theme.colors.primary,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  instructions: {
    ...theme.typography.bodySm,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 40,
    paddingHorizontal: theme.spacing.md,
  },
  primaryButton: {
    width: '100%',
    backgroundColor: theme.colors.primary,
    height: 56,
    borderRadius: theme.borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  primaryButtonText: {
    ...theme.typography.bodyLg,
    fontWeight: '600',
    color: theme.colors.onPrimary,
  },
  secondaryButton: {
    width: '100%',
    flexDirection: 'row',
    height: 56,
    borderRadius: theme.borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    marginBottom: 24,
  },
  secondaryButtonDisabled: {
    borderColor: theme.colors.outlineVariant,
    backgroundColor: theme.colors.surfaceContainerLow,
  },
  resendIcon: {
    marginRight: 8,
  },
  secondaryButtonText: {
    ...theme.typography.bodyLg,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  secondaryButtonTextDisabled: {
    color: theme.colors.outline,
  },
  spamHint: {
    ...theme.typography.bodySm,
    color: theme.colors.outlineVariant,
    textAlign: 'center',
  },
});
