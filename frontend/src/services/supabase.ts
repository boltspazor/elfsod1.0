// src/services/supabase.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config';

class SupabaseService {
  private static instance: SupabaseClient | null = null;

  static getClient(): SupabaseClient | null {
    if (this.instance) {
      return this.instance;
    }

    const url = SUPABASE_URL;
    const key = SUPABASE_ANON_KEY;

    console.log('🔍 Checking environment variables:', {
      hasUrl: !!url,
      hasKey: !!key,
      urlLength: url?.length || 0,
      keyLength: key?.length || 0,
      urlStartsWithHttp: url?.startsWith('http') || false,
    });

    if (!url || !key) {
      console.warn('❌ Supabase environment variables are missing');
      console.info('💡 Add these to your .env file:');
      console.info('   VITE_SUPABASE_URL=https://your-project.supabase.co');
      console.info('   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1...');
      return null;
    }

    if (!url.startsWith('https://')) {
      console.error('❌ Invalid Supabase URL format. Should start with https://');
      console.error('   Got:', url);
      return null;
    }

    if (key.length < 20) {
      console.error('❌ Supabase key seems too short');
      return null;
    }

    try {
      this.instance = createClient(url, key);
      console.log('✅ Supabase client initialized successfully');
      console.log('🌐 Project URL:', url.replace(/\/$/, ''));
      return this.instance;
    } catch (error) {
      console.error('❌ Failed to initialize Supabase:', error);
      return null;
    }
  }

  static isConnected(): boolean {
    return !!this.getClient();
  }
}

// Export the client instance
export const supabase = SupabaseService.getClient();

// Export a function to check connection
export const isSupabaseConnected = () => SupabaseService.isConnected();

// Export the class methods for testing
export const getSupabaseClient = () => SupabaseService.getClient();