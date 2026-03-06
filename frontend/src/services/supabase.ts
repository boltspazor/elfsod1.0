// src/services/supabase.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';

class SupabaseService {
  private static instance: SupabaseClient | null = null;

  static getClient(): SupabaseClient | null {
    if (this.instance) {
      return this.instance;
    }

    // Read directly from import.meta.env so Vite inlines the values at build time.
    // Fallback values ensure the client works even before a dev-server restart.
    const url = import.meta.env.VITE_SUPABASE_URL || 'https://syhypngkvalsakepxbtu.supabase.co';
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5aHlwbmdrdmFsc2FrZXB4YnR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxMjYwNzksImV4cCI6MjA4MDcwMjA3OX0.K1sSWFzLr3M0RqFy2rSggLKjEF-Hg3iFnkRbtpIQxV8';

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