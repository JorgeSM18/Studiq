import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { theme } from '../constants/theme';
import { useStore } from '../store/useStore';
import { supabaseService } from '../services/supabaseService';
import { LogOut, Globe, User, Bell, Shield, ChevronRight } from 'lucide-react-native';

export const ProfileScreen = () => {
  const { t } = useTranslation(['profile', 'common']);
  const { language, setLanguage, profile, setSession } = useStore();

  const handleLanguageToggle = () => {
    const newLang = language === 'es' ? 'en' : 'es';
    setLanguage(newLang);
  };

  const handleLogout = () => {
    Alert.alert(
      t('profile:logoutConfirmTitle'),
      t('profile:logoutConfirmMessage'),
      [
        { text: t('common:cancel'), style: 'cancel' },
        { 
          text: t('profile:logout'), 
          style: 'destructive',
          onPress: async () => {
            try {
              await supabaseService.signOut();
              setSession(null);
            } catch (error) {
              Alert.alert(t('common:error'), t('profile:logoutError'));
            }
          }
        }
      ]
    );
  };

  const renderSettingItem = (icon: React.ReactNode, title: string, value?: string, onPress?: () => void) => (
    <TouchableOpacity style={styles.settingItem} onPress={onPress} disabled={!onPress}>
      <View style={styles.settingLeft}>
        <View style={styles.iconContainer}>
          {icon}
        </View>
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
        
        {/* User Info Card */}
        <View style={styles.userCard}>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>
              {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'U'}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{profile?.full_name || 'Usuario'}</Text>
            <TouchableOpacity>
              <Text style={styles.editProfileText}>{t('profile:editProfile')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Preferences Section */}
        <Text style={styles.sectionTitle}>{t('profile:preferences')}</Text>
        <View style={styles.sectionGroup}>
          {renderSettingItem(
            <Globe size={20} color={theme.colors.primary} />, 
            t('profile:language'), 
            language === 'es' ? 'Español' : 'English',
            handleLanguageToggle
          )}
          {renderSettingItem(
            <Bell size={20} color={theme.colors.primary} />, 
            t('profile:notifications')
          )}
        </View>

        {/* Security Section */}
        <Text style={styles.sectionTitle}>Seguridad</Text>
        <View style={styles.sectionGroup}>
          {renderSettingItem(
            <Shield size={20} color={theme.colors.primary} />, 
            t('profile:changePassword')
          )}
          {renderSettingItem(
            <User size={20} color={theme.colors.primary} />, 
            t('profile:biometricLogin')
          )}
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LogOut size={20} color={theme.colors.error} style={styles.logoutIcon} />
          <Text style={styles.logoutText}>{t('profile:logout')}</Text>
        </TouchableOpacity>

      </ScrollView>
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
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.separator,
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
});
