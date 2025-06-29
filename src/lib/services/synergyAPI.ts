import { supabase } from '../supabase';
import { API_CONFIG } from '../config';
import { toast } from 'sonner';

export interface SynergySearchRequest {
  queryText: string;
  userId: string;
}

export interface SynergySearchResponse {
  success: boolean;
  matches?: any[];
  topScores?: number[];
  queryId?: string;
  error?: string;
}

export class SynergyAPI {
  /**
   * Perform a synergy search using natural language query
   */
  static async search(queryText: string): Promise<SynergySearchResponse> {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('User not authenticated');

      console.log('=== SYNERGY SEARCH START ===');
      console.log('Query text:', queryText);
      console.log('User ID:', user.id);

      // 1. Create query record in database
      const { data: queryData, error: queryError } = await supabase
        .from('queries')
        .insert({
          user_id: user.id,
          query_text: queryText,
          structured_payload: { query: queryText },
        })
        .select()
        .single();

      if (queryError) {
        console.error('Error creating query:', queryError);
        throw queryError;
      }

      console.log('Created query record:', queryData.id);

      // 2. Call the Supabase Edge Function
      const requestPayload = {
        queryId: queryData.id,
        queryText: queryText,
        structuredPayload: { query: queryText },
        userId: user.id,
      };

      console.log('Calling synergy API with payload:', requestPayload);

      const response = await fetch(API_CONFIG.SYNERGY_API_URL, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_CONFIG.SYNERGY_API_KEY}`
        },
        body: JSON.stringify(requestPayload),
      });

      console.log('API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API error response:', errorText);
        throw new Error(`API_ERROR_${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('API response data:', data);

      if (!data.success) {
        throw new Error(data.error || 'API returned unsuccessful response');
      }

      console.log('=== SYNERGY SEARCH SUCCESS ===');
      console.log(`Found ${data.matches?.length || 0} matches`);

      return {
        success: true,
        matches: data.matches,
        topScores: data.topScores,
        queryId: queryData.id
      };

    } catch (error) {
      console.error('=== SYNERGY SEARCH ERROR ===');
      console.error('Error details:', error);

      // Handle different error types
      let userMessage = 'We\'re having trouble processing your request.';
      
      if (error instanceof Error) {
        if (error.message.includes('API_ERROR_429')) {
          userMessage = 'We\'re experiencing high demand. Please try again in a few moments.';
        } else if (error.message.includes('API_ERROR_401') || error.message.includes('API_ERROR_403')) {
          userMessage = 'Your session has expired. Please refresh the page and try again.';
        } else if (error.message.includes('API_ERROR_500')) {
          userMessage = 'Our search service is temporarily unavailable. Please try again later.';
        } else if (error.message.includes('User not authenticated')) {
          userMessage = 'Please sign in to continue.';
        }
      }

      return {
        success: false,
        error: userMessage
      };
    }
  }

  /**
   * Fetch query matches from database for a specific query
   */
  static async getQueryMatches(queryId: string) {
    try {
      const { data, error } = await supabase
        .from('query_matches')
        .select('*')
        .eq('query_id', queryId)
        .single();

      if (error) throw error;
      
      return {
        success: true,
        data: data
      };
    } catch (error) {
      console.error('Error fetching query matches:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch query matches'
      };
    }
  }

  /**
   * Get user's search history
   */
  static async getSearchHistory(limit: number = 10) {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('queries')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return {
        success: true,
        data: data || []
      };
    } catch (error) {
      console.error('Error fetching search history:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch search history'
      };
    }
  }
}