import { supabase } from './supabase';
import { User, AuthError } from '@supabase/supabase-js';
import { Profile } from './types/profile';

export async function getCurrentUser(): Promise<User | null> {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    console.error('Error getting current user:', error);
    throw error;
  }
  return user;
}

export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
}

export async function createProfile(userId: string, profileData: Partial<Profile>) {
  try {
    // Get current session to ensure we're authenticated
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Session error:', sessionError);
      throw sessionError;
    }

    if (!session) {
      throw new Error('No authenticated session');
    }

    // Check if profile already exists
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing profile:', checkError);
      throw checkError;
    }

    if (existingProfile) {
      console.log('Profile already exists for user:', userId);
      return existingProfile;
    }

    // Create new profile
    const { data, error } = await supabase
      .from('profiles')
      .insert([{ 
        id: userId, 
        auth_id: userId, // Ensure auth_id is set
        ...profileData 
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating profile:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Profile creation failed:', error);
    throw error;
  }
}

export async function checkProfileExists(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking profile:', error);
      throw error;
    }
    return !!data;
  } catch (error) {
    console.error('Profile check failed:', error);
    throw error;
  }
} 