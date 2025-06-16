import { supabase } from '../supabase';
import { toast } from 'sonner';

export interface SaveProfileParams {
  candidateId: string;
  queryId: string;
  snapshotScore: number;
  snapshotRationale: string;
}

export const saveProfile = async (params: SaveProfileParams) => {
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) throw new Error('User not authenticated');

    // Check if profile is already saved
    const { data: existingSave, error: checkError } = await supabase
      .from('saved_profiles')
      .select('id')
      .eq('seeker_id', user.id)
      .eq('candidate_id', params.candidateId)
      .maybeSingle();

    if (checkError) throw checkError;
    
    if (existingSave) {
      toast.error('Profile already saved');
      return null;
    }

    // Get the query_match record for this query
    const { data: queryMatch, error: queryMatchError } = await supabase
      .from('query_matches')
      .select('id')
      .eq('query_id', params.queryId)
      .maybeSingle();

    if (queryMatchError) throw queryMatchError;
    if (!queryMatch) {
      throw new Error('Query match not found');
    }

    // Save the profile
    const { data, error } = await supabase
      .from('saved_profiles')
      .insert({
        seeker_id: user.id,
        candidate_id: params.candidateId,
        query_match_id: queryMatch.id,
        snapshot_score: params.snapshotScore,
        snapshot_rationale: params.snapshotRationale,
      })
      .select()
      .single();

    if (error) throw error;

    toast.success('Profile saved successfully');
    return data;
  } catch (error) {
    console.error('Error saving profile:', error);
    toast.error(error instanceof Error ? error.message : 'Failed to save profile');
    return null;
  }
};

export const getSavedProfiles = async () => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('saved_profiles')
      .select(`
        *,
        candidate:candidate_id(*)
      `)
      .eq('seeker_id', user.id)
      .order('saved_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching saved profiles:', error);
    toast.error('Failed to fetch saved profiles');
    return [];
  }
};

export const checkIfProfileSaved = async (candidateId: string) => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('saved_profiles')
      .select('id')
      .eq('seeker_id', user.id)
      .eq('candidate_id', candidateId)
      .maybeSingle();

    if (error) throw error;
    return data?.id || null;
  } catch (error) {
    console.error('Error checking saved profile:', error);
    return null;
  }
};

export const deleteSavedProfile = async (candidateId: string) => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('saved_profiles')
      .delete()
      .eq('seeker_id', user.id)
      .eq('candidate_id', candidateId);

    if (error) throw error;
    toast.success('Profile removed from saved contacts');
    return true;
  } catch (error) {
    console.error('Error deleting saved profile:', error);
    toast.error('Failed to remove profile from saved contacts');
    return false;
  }
};

export const checkMultipleProfilesSaved = async (profileIds: string[]) => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('saved_profiles')
      .select('candidate_id')
      .eq('seeker_id', user.id)
      .in('candidate_id', profileIds);

    if (error) throw error;

    // Create a map of profileId -> saved status
    const savedMap: Record<string, boolean> = {};
    profileIds.forEach(id => {
      savedMap[id] = false;
    });
    data?.forEach(saved => {
      savedMap[saved.candidate_id] = true;
    });

    return savedMap;
  } catch (error) {
    console.error('Error checking saved profiles:', error);
    return {};
  }
}; 