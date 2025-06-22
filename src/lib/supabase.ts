import { createClient } from '@supabase/supabase-js';
import { Profile } from './types/profile';
import { getRedirectURL } from './config';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Define site URL based on environment
const SITE_URL = 
  window.location.hostname === 'localhost' 
    ? 'http://localhost:5173'
    : 'https://energylink-xi.vercel.app';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create Supabase client with auth configuration
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

export const getProfile = async (userId: string) => {
  // First try to get the existing profile
  const { data: existingProfile, error: fetchError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (!fetchError && existingProfile) {
    return existingProfile;
  }

  // If profile doesn't exist, create one
  const { data: newProfile, error: insertError } = await supabase
    .from('profiles')
    .insert([{ id: userId }])
    .select()
    .single();

  if (insertError) throw insertError;
  return newProfile;
};

export const updateProfile = async (userId: string, profile: Partial<Profile>) => {
  // First check if profile exists
  const { data: existingProfile, error: fetchError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (fetchError && fetchError.code === 'PGRST116') {
    // Profile doesn't exist, create it
    const { data: newProfile, error: insertError } = await supabase
      .from('profiles')
      .insert([{ id: userId, ...profile }])
      .select()
      .single();

    if (insertError) throw insertError;
    return newProfile;
  } else if (fetchError) {
    throw fetchError;
  }

  // Profile exists, update it
  const { data: updatedProfile, error: updateError } = await supabase
    .from('profiles')
    .update(profile)
    .eq('id', userId)
    .select()
    .single();

  if (updateError) throw updateError;
  return updatedProfile;
};

export async function getUniquePrimaryRoles(): Promise<string[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('primary_role')
    .not('primary_role', 'is', null);

  if (error) {
    console.error('Error fetching primary roles:', error);
    return [];
  }

  // Flatten the array of arrays and get unique values
  const uniqueRoles = Array.from(
    new Set(
      data
        .map(profile => profile.primary_role)
        .flat()
        .filter(Boolean)
    )
  );

  return uniqueRoles;
}

export async function getUniqueTechnicalExpertise(): Promise<string[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('tech_tags')
    .not('tech_tags', 'is', null);

  if (error) {
    console.error('Error fetching technical expertise:', error);
    return [];
  }

  // Flatten the array of arrays and get unique values
  const uniqueExpertise = Array.from(
    new Set(
      data
        .map(profile => profile.tech_tags)
        .flat()
        .filter(Boolean)
    )
  );

  return uniqueExpertise;
}

export async function getUniqueRegions(): Promise<string[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('region_tags')
    .not('region_tags', 'is', null);

  if (error) {
    console.error('Error fetching regions:', error);
    return [];
  }

  // Flatten the array of arrays and get unique values
  const uniqueRegions = Array.from(
    new Set(
      data
        .map(profile => profile.region_tags)
        .flat()
        .filter(Boolean)
    )
  );

  return uniqueRegions;
} 