import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

// Uso de variables de entorno de Expo
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
