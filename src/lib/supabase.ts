import { createClient } from '@supabase/supabase-js';
import { Profile } from './types/profile';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const getProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
};

export const updateProfile = async (userId: string, profile: Partial<Profile>) => {
  const { data, error } = await supabase
    .from('profiles')
    .update(profile)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
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