import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
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
import { Lock, Mail, User, BookOpen, Calendar as CalendarIcon, ChevronLeft, GraduationCap, Info, Eye, EyeOff } from 'lucide-react-native';
import { useStore } from '../../store/useStore';
import { DatePickerModal } from '../../components/DatePickerModal';

export const RegisterScreen = () => {
  const navigation = useNavigation<any>();
  const { initializeAuth } = useStore();
  const { t } = useTranslation(['auth', 'common']);
  
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [studyType, setStudyType] = useState('');
  const [examDate, setExamDate] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);

  const handleRegister = async () => {
    if (!fullName || !email || !password || !studyType || !examDate) {
      Alert.alert(t('common:error'), t('auth:fillAllFields'));
      return;
    }
    
    setIsLoading(true);
    try {
      await supabaseService.signUp(email, password, fullName, studyType, examDate);
      // Navegar a la pantalla de verificación pasando el email
      navigation.navigate('VerifyEmail', { email });
    } catch (error: any) {
      Alert.alert(t('auth:registerError'), error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ChevronLeft size={24} color={theme.colors.onSurface} />
          <Text style={styles.backText}>{t('auth:register')}</Text>
        </TouchableOpacity>
        <Text style={styles.stepText}>{t('auth:step1of2')}</Text>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.titleContainer}>
            <View style={styles.iconContainer}>
              <GraduationCap size={28} color={theme.colors.primary} />
            </View>
            <Text style={styles.title}>{t('auth:startJourney')}</Text>
            <Text style={styles.subtitle}>{t('auth:startJourneySubtitle')}</Text>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.inputWrapper}>
              <User size={20} color={theme.colors.outline} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={t('auth:fullNamePlaceholder')}
                placeholderTextColor={theme.colors.outlineVariant}
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
              />
            </View>

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

            <Text style={styles.sectionLabel}>{t('auth:studyTypeLabel')}</Text>
            <View style={styles.inputWrapper}>
              <BookOpen size={20} color={theme.colors.outline} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={t('auth:studyTypePlaceholder')}
                placeholderTextColor={theme.colors.outlineVariant}
                value={studyType}
                onChangeText={setStudyType}
              />
            </View>

            <Text style={styles.sectionLabel}>{t('auth:examDateLabel')}</Text>
            <TouchableOpacity 
              style={styles.inputWrapper}
              onPress={() => setIsDatePickerVisible(true)}
            >
              <CalendarIcon size={20} color={theme.colors.outline} style={styles.inputIcon} />
              <Text style={[styles.input, { color: examDate ? theme.colors.onSurface : theme.colors.outlineVariant, paddingTop: 18 }]}>
                {examDate ? examDate : 'yyyy-mm-dd'}
              </Text>
            </TouchableOpacity>

            <View style={styles.infoBanner}>
              <Info size={20} color={theme.colors.primary} style={styles.infoIcon} />
              <Text style={styles.infoText}>
                {t('auth:examDateInfo')}
              </Text>
            </View>
          </View>

        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.primaryButton} 
            onPress={handleRegister}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={theme.colors.onPrimary} />
            ) : (
              <Text style={styles.primaryButtonText}>{t('auth:continue')}</Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.loginLinkContainer}
            onPress={() => navigation.navigate('Welcome')}
          >
            <Text style={styles.loginLinkText}>{t('auth:alreadyHaveAccount')}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <DatePickerModal
        visible={isDatePickerVisible}
        onClose={() => setIsDatePickerVisible(false)}
        selectedDate={examDate}
        onSelect={setExamDate}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F2FF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    ...theme.typography.bodyLg,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginLeft: 4,
  },
  stepText: {
    ...theme.typography.bodySm,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: theme.spacing.xl,
    paddingTop: theme.spacing.md,
    paddingBottom: 20,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 64,
    height: 64,
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    ...theme.shadows.level1,
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.onBackground,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    ...theme.typography.bodyLg,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 24,
  },
  formContainer: {
    gap: 16,
  },
  sectionLabel: {
    ...theme.typography.labelCaps,
    color: theme.colors.onSurfaceVariant,
    marginTop: 8,
    marginBottom: -8,
  },
  eyeIcon: {
    padding: 4,
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
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: '#E5E8FF',
    padding: 16,
    borderRadius: theme.borderRadius.lg,
    marginTop: 8,
  },
  infoIcon: {
    marginTop: 2,
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    ...theme.typography.bodySm,
    color: theme.colors.primary,
    lineHeight: 20,
  },
  footer: {
    // Eliminamos padding xl para que no se duplique con scrollContent
  },
  primaryButton: {
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
  loginLinkContainer: {
    alignItems: 'center',
  },
  loginLinkText: {
    ...theme.typography.bodySm,
    color: theme.colors.primary,
    fontWeight: '600',
  },
});
