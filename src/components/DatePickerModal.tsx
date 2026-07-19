import React, { useState, useMemo, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { theme } from '../constants/theme';
import { X, ChevronLeft } from 'lucide-react-native';

import { useTranslation } from 'react-i18next';
import { useStore } from '../store/useStore';

// Configurar calendarios
LocaleConfig.locales['es'] = {
  monthNames: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
  monthNamesShort: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
  dayNames: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
  dayNamesShort: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
  today: 'Hoy'
};
LocaleConfig.locales['en'] = {
  monthNames: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  monthNamesShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  dayNames: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  dayNamesShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  today: 'Today'
};

interface DatePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (date: string) => void;
  selectedDate: string;
}

type ViewMode = 'calendar' | 'years' | 'months';

export const DatePickerModal = ({ visible, onClose, onSelect, selectedDate }: DatePickerModalProps) => {
  const language = useStore(state => state.language);
  const { t } = useTranslation(['common', 'auth']);

  // Mutating the shared LocaleConfig is a side effect; keep it out of render.
  useEffect(() => {
    LocaleConfig.defaultLocale = language;
  }, [language]);

  const [currentMonth, setCurrentMonth] = useState(selectedDate || new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [tempYear, setTempYear] = useState<number>(new Date().getFullYear());

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 11 }, (_, i) => currentYear + i);
  }, []);

  const months = (LocaleConfig.locales[language] ?? LocaleConfig.locales['es']).monthNames;

  const handleYearSelect = (year: number) => {
    setTempYear(year);
    setViewMode('months');
  };

  const handleMonthSelect = (monthIdx: number) => {
    const yearStr = tempYear.toString();
    const monthStr = (monthIdx + 1).toString().padStart(2, '0');
    const newDate = `${yearStr}-${monthStr}-01`;
    
    setCurrentMonth(newDate);
    setViewMode('calendar');
  };

  const [yearStr_split, monthStr_split] = currentMonth.split('-');
  const currentYear = parseInt(yearStr_split);
  const currentMonthIdx = parseInt(monthStr_split) - 1;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={styles.container}
        >
          <View style={styles.header}>
            <Text style={styles.title}>{t('auth:examDateLabel')}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={theme.colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          {viewMode === 'calendar' && (
            <Calendar
              current={currentMonth}
              key={currentMonth}
              firstDay={1}
              minDate={new Date().toISOString().split('T')[0]}
              onDayPress={(day: any) => {
                onSelect(day.dateString);
                onClose();
              }}
              onMonthChange={(month: any) => {
                setCurrentMonth(month.dateString);
              }}
              renderHeader={(date: any) => {
                const d = new Date(date);
                const monthName = months[d.getMonth()];
                const year = d.getFullYear();
                return (
                  <TouchableOpacity 
                    onPress={() => setViewMode('years')}
                    style={styles.headerClickable}
                  >
                    <Text style={styles.monthText}>{`${monthName} ${year}`}</Text>
                  </TouchableOpacity>
                );
              }}
              markedDates={{
                [selectedDate]: { selected: true, disableTouchEvent: true, selectedColor: theme.colors.primary }
              }}
              theme={{
                backgroundColor: theme.colors.surface,
                calendarBackground: theme.colors.surface,
                textSectionTitleColor: theme.colors.outline,
                selectedDayBackgroundColor: theme.colors.primary,
                selectedDayTextColor: theme.colors.onPrimary,
                todayTextColor: theme.colors.primary,
                dayTextColor: theme.colors.onSurface,
                textDisabledColor: theme.colors.outlineVariant,
                dotColor: theme.colors.primary,
                selectedDotColor: theme.colors.onPrimary,
                arrowColor: theme.colors.primary,
                monthTextColor: theme.colors.onSurface,
                indicatorColor: theme.colors.primary,
                textDayFontWeight: '400',
                textMonthFontWeight: '700',
                textDayHeaderFontWeight: '600',
                textDayFontSize: 16,
                textMonthFontSize: 18,
                textDayHeaderFontSize: 12,
                // @ts-ignore
                'stylesheet.calendar.header': {
                  header: {
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    paddingLeft: 10,
                    paddingRight: 10,
                    marginTop: 10,
                    alignItems: 'center'
                  },
                  week: {
                    marginTop: 20,
                    flexDirection: 'row',
                    justifyContent: 'space-around'
                  },
                }
              }}
            />
          )}

          {(viewMode === 'years' || viewMode === 'months') && (
            <View style={styles.selectorContainer}>
              <View style={styles.selectorHeader}>
                <TouchableOpacity 
                  onPress={() => setViewMode(viewMode === 'years' ? 'calendar' : 'years')} 
                  style={styles.backArrow}
                >
                  <ChevronLeft size={24} color={theme.colors.primary} />
                </TouchableOpacity>
                <Text style={styles.selectorTitle}>
                  {viewMode === 'years' ? t('auth:selectYear') : t('auth:selectMonth', { year: tempYear })}
                </Text>
              </View>
              
              <ScrollView 
                showsVerticalScrollIndicator={false} 
                contentContainerStyle={viewMode === 'years' ? styles.yearsGrid : styles.monthsGridFull}
              >
                {viewMode === 'years' ? (
                  years.map((year) => (
                    <TouchableOpacity
                      key={year}
                      onPress={() => handleYearSelect(year)}
                      style={[styles.yearItemFull, currentYear === year && styles.selectedItem]}
                    >
                      <Text style={[styles.itemText, currentYear === year && styles.selectedItemText]}>
                        {year}
                      </Text>
                    </TouchableOpacity>
                  ))
                ) : (
                  months.map((name: string, idx: number) => (
                    <TouchableOpacity
                      key={name}
                      onPress={() => handleMonthSelect(idx)}
                      style={[styles.monthItemFull, currentMonthIdx === idx && styles.selectedItem]}
                    >
                      <Text style={[styles.itemText, currentMonthIdx === idx && styles.selectedItemText]}>
                        {name}
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            </View>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  container: {
    width: '100%',
    height: 480, // Altura fija definida para evitar saltos y asegurar scroll
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    ...theme.shadows.level2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  title: {
    ...theme.typography.h2,
    color: theme.colors.onSurface,
  },
  closeButton: {
    padding: theme.spacing.xs,
    backgroundColor: theme.colors.softWash,
    borderRadius: theme.borderRadius.full,
  },
  headerClickable: {
    paddingVertical: 5,
    paddingHorizontal: 15,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.softWash,
  },
  monthText: {
    ...theme.typography.h3,
    color: theme.colors.onSurface,
    textAlign: 'center',
  },
  selectorContainer: {
    flex: 1,
    marginTop: theme.spacing.md,
  },
  selectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  backArrow: {
    padding: theme.spacing.xs,
  },
  selectorTitle: {
    ...theme.typography.h3,
    color: theme.colors.onSurface,
    flex: 1,
    textAlign: 'center',
    marginRight: 32,
  },
  yearsGrid: {
    paddingBottom: theme.spacing.lg,
  },
  yearItemFull: {
    paddingVertical: 15,
    alignItems: 'center',
    borderRadius: theme.borderRadius.lg,
    marginBottom: 8,
    backgroundColor: theme.colors.softWash,
  },
  monthsGridFull: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingBottom: theme.spacing.lg,
  },
  monthItemFull: {
    width: '48%',
    paddingVertical: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.softWash,
  },
  selectedItem: {
    backgroundColor: theme.colors.primary,
  },
  itemText: {
    ...theme.typography.bodyLg,
    color: theme.colors.onSurface,
    fontWeight: '500',
  },
  selectedItemText: {
    color: theme.colors.onPrimary,
    fontWeight: 'bold',
  },
});
