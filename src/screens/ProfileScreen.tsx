import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { theme } from '../constants/theme';
import { useStore } from '../store/useStore';
import { supabaseService } from '../services/supabaseService';
import { LogOut, Globe, Shield, ChevronRight, Pencil } from 'lucide-react-native';

export const ProfileScreen = () => {
  const { t } = useTranslation(['profile', 'common']);
  const language = useStore(state => state.language);
  const setLanguage = useStore(state => state.setLanguage);
  const profile = useStore(state => state.profile);
  const setSession = useStore(state => state.setSession);
  const updateProfileName = useStore(state => state.updateProfileName);

  const [isEditing, setIsEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState('');

  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const handleLanguageToggle = () => setLanguage(language === 'es' ? 'en' : 'es');

  const openEditName = () => {
    setNameDraft(profile?.full_name || '');
    setIsEditing(true);
  };

  const saveName = async () => {
    const name = nameDraft.trim();
    setIsEditing(false);
    if (!name || name === profile?.full_name) return;
    try {
      await updateProfileName(name);
    } catch {
      Alert.alert(t('common:error'), t('common:retry'));
    }
  };

  const openChangePassword = () => {
    setNewPassword('');
    setConfirmPassword('');
    setIsChangingPassword(true);
  };

  const saveNewPassword = async () => {
    if (newPassword.length < 6) {
      Alert.alert(t('common:error'), t('profile:passwordTooShort'));
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert(t('common:error'), t('profile:passwordsDontMatch'));
      return;
    }
    setIsSavingPassword(true);
    try {
      await supabaseService.changePassword(newPassword);
      setIsChangingPassword(false);
      Alert.alert(t('profile:passwordChanged'));
    } catch (error: any) {
      Alert.alert(t('common:error'), error.message);
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(t('profile:logoutConfirmTitle'), t('profile:logoutConfirmMessage'), [
      { text: t('common:cancel'), style: 'cancel' },
      {
        text: t('profile:logout'),
        style: 'destructive',
        onPress: async () => {
          try {
            await supabaseService.signOut();
            setSession(null);
          } catch {
            Alert.alert(t('common:error'), t('profile:logoutError'));
          }
        },
      },
    ]);
  };

  const renderSettingItem = (
    icon: React.ReactNode,
    title: string,
    value?: string,
    onPress?: () => void
  ) => (
    <TouchableOpacity style={styles.settingItem} onPress={onPress} disabled={!onPress}>
      <View style={styles.settingLeft}>
        <View style={styles.iconContainer}>{icon}</View>
        <Text style={styles.settingTitle}>{title}</Text>
      </View>
      <View style={styles.settingRight}>
        {value && <Text style={styles.settingValue}>{value}</Text>}
        {onPress && <ChevronRight size={20} color={theme.colors.outlineVariant} />}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('profile:profileTitle')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* User card */}
        <TouchableOpacity style={styles.userCard} onPress={openEditName} activeOpacity={0.7}>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>
              {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'U'}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{profile?.full_name || t('profile:namePlaceholder')}</Text>
            <View style={styles.editRow}>
              <Pencil size={14} color={theme.colors.primary} />
              <Text style={styles.editProfileText}>{t('profile:editName')}</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Preferences */}
        <Text style={styles.sectionTitle}>{t('profile:preferences')}</Text>
        <View style={styles.sectionGroup}>
          {renderSettingItem(
            <Globe size={20} color={theme.colors.primary} />,
            t('profile:language'),
            language === 'es' ? 'Español' : 'English',
            handleLanguageToggle
          )}
        </View>

        {/* Security */}
        <Text style={styles.sectionTitle}>{t('profile:security')}</Text>
        <View style={styles.sectionGroup}>
          {renderSettingItem(
            <Shield size={20} color={theme.colors.primary} />,
            t('profile:changePassword'),
            undefined,
            openChangePassword
          )}
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LogOut size={20} color={theme.colors.error} style={styles.logoutIcon} />
          <Text style={styles.logoutText}>{t('profile:logout')}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit-name modal */}
      <Modal visible={isEditing} transparent animationType="fade" onRequestClose={() => setIsEditing(false)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('profile:editName')}</Text>
            <TextInput
              style={styles.modalInput}
              value={nameDraft}
              onChangeText={setNameDraft}
              placeholder={t('profile:namePlaceholder')}
              placeholderTextColor={theme.colors.outlineVariant}
              autoFocus
              autoCapitalize="words"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalButton} onPress={() => setIsEditing(false)}>
                <Text style={styles.modalCancel}>{t('common:cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.modalSave]} onPress={saveName}>
                <Text style={styles.modalSaveText}>{t('common:save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Change-password modal */}
      <Modal
        visible={isChangingPassword}
        transparent
        animationType="fade"
        onRequestClose={() => setIsChangingPassword(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('profile:changePassword')}</Text>
            <TextInput
              style={styles.modalInput}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder={t('profile:newPasswordPlaceholder')}
              placeholderTextColor={theme.colors.outlineVariant}
              secureTextEntry
              autoFocus
            />
            <TextInput
              style={styles.modalInput}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder={t('profile:confirmPasswordPlaceholder')}
              placeholderTextColor={theme.colors.outlineVariant}
              secureTextEntry
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalButton} onPress={() => setIsChangingPassword(false)}>
                <Text style={styles.modalCancel}>{t('common:cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalSave]}
                onPress={saveNewPassword}
                disabled={isSavingPassword}
              >
                {isSavingPassword ? (
                  <ActivityIndicator size="small" color={theme.colors.onPrimary} />
                ) : (
                  <Text style={styles.modalSaveText}>{t('common:save')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
  },
  headerTitle: {
    ...theme.typography.h1,
    color: theme.colors.onBackground,
  },
  content: {
    padding: theme.spacing.xl,
    paddingTop: theme.spacing.sm,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.xl,
    ...theme.shadows.level1,
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  avatarText: {
    ...theme.typography.h2,
    color: theme.colors.onPrimaryContainer,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    ...theme.typography.h3,
    color: theme.colors.onSurface,
    marginBottom: 4,
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editProfileText: {
    ...theme.typography.bodySm,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  sectionTitle: {
    ...theme.typography.labelCaps,
    color: theme.colors.onSurfaceVariant,
    marginBottom: theme.spacing.sm,
    marginLeft: theme.spacing.sm,
  },
  sectionGroup: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.xl,
    overflow: 'hidden',
    ...theme.shadows.level1,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: theme.colors.surfaceContainerLow,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  settingTitle: {
    ...theme.typography.bodyLg,
    color: theme.colors.onSurface,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingValue: {
    ...theme.typography.bodySm,
    color: theme.colors.onSurfaceVariant,
    marginRight: theme.spacing.xs,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFE5E5',
    paddingVertical: 16,
    borderRadius: theme.borderRadius.lg,
    marginTop: theme.spacing.md,
  },
  logoutIcon: {
    marginRight: 8,
  },
  logoutText: {
    ...theme.typography.bodyLg,
    fontWeight: '600',
    color: theme.colors.error,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  modalCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
  },
  modalTitle: {
    ...theme.typography.h3,
    color: theme.colors.onSurface,
    marginBottom: theme.spacing.md,
  },
  modalInput: {
    backgroundColor: theme.colors.surfaceContainerLow,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    height: 52,
    ...theme.typography.bodyLg,
    color: theme.colors.onSurface,
    marginBottom: theme.spacing.lg,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.sm,
  },
  modalButton: {
    paddingHorizontal: theme.spacing.lg,
    height: 44,
    borderRadius: theme.borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSave: {
    backgroundColor: theme.colors.primary,
  },
  modalCancel: {
    ...theme.typography.bodyLg,
    fontWeight: '600',
    color: theme.colors.onSurfaceVariant,
  },
  modalSaveText: {
    ...theme.typography.bodyLg,
    fontWeight: '600',
    color: theme.colors.onPrimary,
  },
});
