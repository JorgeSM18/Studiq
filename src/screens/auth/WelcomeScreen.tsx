import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { theme } from '../../constants/theme';
import { supabaseService } from '../../services/supabaseService';
import { Lock, Mail, ScanFace, Eye, EyeOff } from 'lucide-react-native';
import { useStore } from '../../store/useStore';

export const WelcomeScreen = () => {
  const navigation = useNavigation<any>();
  const { initializeAuth } = useStore();
  const { t } = useTranslation(['auth', 'common']);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert(t('common:error'), t('auth:fillAllFields'));
      return;
    }
    
    setIsLoading(true);
    try {
      await supabaseService.signIn(email, password);
      await initializeAuth(); // Recarga la sesión en Zustand
    } catch (error: any) {
      Alert.alert(t('auth:loginError'), error.message || t('auth:invalidCredentials'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    setIsLoading(true);
    try {
      await supabaseService.biometricLogin();
      await initializeAuth();
    } catch (error: any) {
      Alert.alert(t('common:error'), error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Image 
                source={require('../../../assets/studiq_logo.png')} 
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.title}>{t('auth:welcomeTitle')}</Text>
            <Text style={styles.subtitle}>{t('auth:welcomeSubtitle')}</Text>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { marginBottom: 8 }]}>{t('auth:emailLabel')}</Text>
              <View style={styles.inputWrapper}>
                <Mail size={20} color={theme.colors.outline} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={t('auth:emailPlaceholder')}
                  placeholderTextColor={theme.colors.outlineVariant}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>{t('auth:passwordLabel')}</Text>
                <TouchableOpacity style={styles.forgotButton}>
                  <Text style={styles.forgotText}>{t('auth:forgotPassword')}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.inputWrapper}>
                <Lock size={20} color={theme.colors.outline} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={t('auth:passwordPlaceholder')}
                  placeholderTextColor={theme.colors.outlineVariant}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity 
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                >
                  {showPassword ? (
                    <EyeOff size={20} color={theme.colors.outline} />
                  ) : (
                    <Eye size={20} color={theme.colors.outline} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.primaryButton} 
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={theme.colors.onPrimary} />
              ) : (
                <Text style={styles.primaryButtonText}>{t('auth:continue')}</Text>
              )}
            </TouchableOpacity>

            <View style={styles.dividerContainer}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>{t('auth:or')}</Text>
              <View style={styles.divider} />
            </View>

            <TouchableOpacity 
              style={styles.secondaryButton} 
              onPress={handleBiometricLogin}
              disabled={isLoading}
            >
              <ScanFace size={20} color={theme.colors.primary} style={styles.buttonIcon} />
              <Text style={styles.secondaryButtonText}>{t('auth:biometricLogin')}</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.footer, { marginTop: 'auto', paddingTop: 20 }]}>
            <Text style={styles.footerText}>{t('auth:newToStudiq')} </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.footerLink}>{t('auth:createAccount')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F2FF', // Ligeramente azulado basado en el mockup
  },
  scrollContent: {
    flexGrow: 1,
    padding: theme.spacing.xl,
    paddingBottom: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
  },
  logoContainer: {
    width: 64,
    height: 64,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    ...theme.shadows.level1,
  },
  logo: {
    width: 40,
    height: 40,
  },
  title: {
    ...theme.typography.display,
    color: theme.colors.onBackground,
    marginBottom: 8,
  },
  subtitle: {
    ...theme.typography.bodyLg,
    color: theme.colors.onSurfaceVariant,
  },
  formContainer: {
    marginVertical: 20,
  },
  inputGroup: {
    marginBottom: 24,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    ...theme.typography.labelCaps,
    color: theme.colors.onSurfaceVariant,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    ...theme.typography.bodyLg,
    color: theme.colors.onSurface,
    height: '100%',
  },
  forgotButton: {
    paddingVertical: 4,
  },
  forgotText: {
    ...theme.typography.bodySm,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  eyeIcon: {
    padding: 4,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    height: 56,
    borderRadius: theme.borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    ...theme.typography.bodyLg,
    fontWeight: '600',
    color: theme.colors.onPrimary,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.outlineVariant,
  },
  dividerText: {
    ...theme.typography.bodySm,
    color: theme.colors.outline,
    paddingHorizontal: 16,
  },
  secondaryButton: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    height: 56,
    borderRadius: theme.borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonIcon: {
    marginRight: 8,
  },
  secondaryButtonText: {
    ...theme.typography.bodyLg,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  footerText: {
    ...theme.typography.bodySm,
    color: theme.colors.onSurfaceVariant,
  },
  footerLink: {
    ...theme.typography.bodySm,
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
});
