import { useState, useEffect } from 'react';
import { Search as SearchIcon, Filter, Users, Star, MapPin, Zap, Award, Globe2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { Database, SynergyScore as SynergyScoreType, QueryMatch } from '@/integrations/supabase/types';
import { SynergyScore } from '@/components/SynergyScore';
import { toast } from 'sonner';
import { API_CONFIG } from '@/lib/config';
import { CircularProgress } from '@/components/CircularProgress';
import { saveProfile, checkIfProfileSaved, deleteSavedProfile, checkMultipleProfilesSaved } from '@/lib/services/savedProfiles';
import { chatService } from '@/lib/chat-service';

type Profile = Database['public']['Tables']['profiles']['Row'];

// Create a custom hook for persisting search state
const usePersistedState = <T,>(key: string, initialValue: T) => {
  const [state, setState] = useState<T>(() => {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : initialValue;
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(state));
  }, [key, state]);

  return [state, setState] as const;
};

export default function Search() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [profiles, setProfiles] = usePersistedState<Profile[]>('profiles', []);
  const [synergyScores, setSynergyScores] = usePersistedState<Record<string, SynergyScoreType>>('synergyScores', {});
  const [error, setError] = useState<string | null>(null);
  const [currentQueryId, setCurrentQueryId] = usePersistedState<string | null>('currentQueryId', null);
  const [savedProfiles, setSavedProfiles] = useState<Record<string, boolean>>({});
  const [isSavedStatusLoaded, setIsSavedStatusLoaded] = useState(false);
  const navigate = useNavigate();

  // Initial load - fetch all profiles in alphabetical order if no persisted state
  useEffect(() => {
    if (profiles.length === 0) {
      fetchProfiles();
    }
  }, []);

  // Check saved status for all visible profiles
  useEffect(() => {
    const loadSavedStatuses = async () => {
      if (!profiles.length || isSavedStatusLoaded) return;

      const profileIds = profiles.map(p => p.id);
      const savedMap = await checkMultipleProfilesSaved(profileIds);
      setSavedProfiles(savedMap);
      setIsSavedStatusLoaded(true);
    };

    loadSavedStatuses();
  }, [profiles, isSavedStatusLoaded]);

  const fetchProfiles = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');

      if (error) throw error;
      setProfiles(data || []);
      setSynergyScores({}); // Clear any existing scores
      setCurrentQueryId(null); // Reset current query
      localStorage.removeItem('profiles');
      localStorage.removeItem('synergyScores');
      localStorage.removeItem('currentQueryId');
    } catch (err) {
      console.error('Error fetching profiles:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch profiles');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch query matches from database
  const fetchQueryMatches = async (queryId: string) => {
    try {
      const { data, error } = await supabase
        .from('query_matches')
        .select('*')
        .eq('query_id', queryId)
        .single();

      if (error) throw error;
      
      if (data) {
        const matches = data.matches as SynergyScoreType[];
        const scoresMap = matches.reduce((acc: Record<string, SynergyScoreType>, score: SynergyScoreType) => {
          acc[score.candidate_id] = score;
          return acc;
        }, {});
        setSynergyScores(scoresMap);

        // Sort profiles by score
        const sortedProfiles = [...profiles].sort((a, b) => {
          const scoreA = scoresMap[a.id]?.score || 0;
          const scoreB = scoresMap[b.id]?.score || 0;
          return scoreB - scoreA;
        });
        setProfiles(sortedProfiles);
      }
    } catch (err) {
      console.error('Error fetching query matches:', err);
      toast.error('Failed to fetch search results');
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    setError(null);
    setSynergyScores({});

    try {
      // 1. Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // 2. Insert query into Supabase
      const { data: queryData, error: queryError } = await supabase
        .from('queries')
        .insert({
          user_id: user.id,
          query_text: searchQuery,
          structured_payload: { query: searchQuery },
        })
        .select()
        .single();
      if (queryError) throw queryError;

      // Store query ID for later use
      setCurrentQueryId(queryData.id);

      // 3. Call synergy scoring API using environment-aware URL
      const response = await fetch(API_CONFIG.SYNERGY_API_URL, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_CONFIG.SYNERGY_API_KEY}`
        },
        body: JSON.stringify({
          queryId: queryData.id,
          queryText: searchQuery,
          structuredPayload: { query: searchQuery },
          userId: user.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        throw new Error(errorData.error || `API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      if (!data.matches) {
        throw new Error('Invalid response format from API');
      }

      // 4. Fetch the stored query matches
      await fetchQueryMatches(queryData.id);
      toast.success('Search completed successfully');
    } catch (err) {
      console.error('Search error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Search failed';
      setError(errorMessage);
      toast.error(`Search failed: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileClick = (profileId: string) => {
    navigate(`/profile/${profileId}`, {
      state: { 
        synergyScore: synergyScores[profileId],
        fromSearch: !!currentQueryId
      }
    });
  };

  const handleStartChat = async (e: React.MouseEvent, profileId: string) => {
    e.stopPropagation(); // Prevent profile card click event
    
    try {
      const chatId = await chatService.createDirectChat(profileId);
      if (chatId) {
        navigate(`/chat?chat=${chatId}`);
        toast.success('Chat started successfully');
      } else {
        toast.error('Failed to start chat');
      }
    } catch (error) {
      console.error('Error starting chat:', error);
      toast.error('Failed to start chat');
    }
  };

  const handleSaveToggle = async (e: React.MouseEvent, profileId: string) => {
    e.stopPropagation(); // Prevent profile card click event

    if (!currentQueryId) {
      toast.error('Cannot save profile without search context');
      return;
    }

    const synergyScore = synergyScores[profileId];
    if (!synergyScore) {
      toast.error('Cannot save profile without synergy score');
      return;
    }

    if (savedProfiles[profileId]) {
      // Delete the saved profile
      const success = await deleteSavedProfile(profileId);
      if (success) {
        setSavedProfiles(prev => ({ ...prev, [profileId]: false }));
      }
      return;
    }

    const result = await saveProfile({
      candidateId: profileId,
      queryId: currentQueryId,
      snapshotScore: synergyScore.score,
      snapshotRationale: synergyScore.explanation,
    });

    if (result) {
      setSavedProfiles(prev => ({ ...prev, [profileId]: true }));
    }
  };

  const renderProfileCards = () => {
    if (error) {
      return (
        <Card className="text-center py-8">
          <CardContent>
            <p className="text-red-600">Error: {error}</p>
            <Button onClick={fetchProfiles} className="mt-4">Retry</Button>
          </CardContent>
        </Card>
      );
    }

    if (isLoading) {
      return (
        <Card className="text-center py-8">
          <CardContent>
            <p className="text-gray-600">Loading profiles...</p>
          </CardContent>
        </Card>
      );
    }

    return profiles.map((profile) => (
      <Card 
        key={profile.id} 
        className="hover:shadow-lg transition-shadow cursor-pointer"
        onClick={() => handleProfileClick(profile.id)}
      >
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-start space-x-4">
                <div className="w-14 h-14 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center">
                  <Users className="w-7 h-7 text-green-600" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-xl font-semibold text-gray-900 mb-1">
                    {profile.full_name}
                  </CardTitle>
                  <p className="text-lg text-gray-600 mb-2">{profile.primary_role?.[0]}</p>
                  {profile.primary_role && profile.primary_role.length > 1 && (
                    <p className="text-sm text-gray-500 mb-2">+{profile.primary_role.length - 1} other roles</p>
                  )}
                </div>
              </div>
            </div>
            {synergyScores[profile.id] && (
              <div className="flex items-center space-x-4">
                <div className="flex-1 max-w-md">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-base font-semibold text-gray-700 leading-snug">
                      {synergyScores[profile.id].explanation}
                    </p>
                  </div>
                </div>
                <div>
                  <CircularProgress value={synergyScores[profile.id].score} />
                </div>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-5">
            {profile.region_tags && profile.region_tags.length > 0 && (
              <div className="flex items-center gap-2 text-gray-600">
                <Globe2 className="w-5 h-5 flex-shrink-0" />
                <div className="flex flex-wrap gap-2">
                  {profile.region_tags.map((region, index) => (
                    <Badge key={index} variant="secondary" className="bg-blue-50 text-blue-700 text-sm py-1">
                      {region}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {profile.tech_tags && profile.tech_tags.length > 0 && (
              <div>
                <p className="text-base font-medium text-gray-700 mb-2">Technical Expertise:</p>
                <div className="flex flex-wrap gap-2">
                  {profile.tech_tags.map((tech, index) => (
                    <Badge key={index} variant="outline" className="text-sm py-1">
                      {tech}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {profile.certifications && profile.certifications.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Award className="w-5 h-5 text-gray-600" />
                  <p className="text-base font-medium text-gray-700">Certifications:</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {profile.certifications.map((cert, index) => (
                    <Badge key={index} variant="secondary" className="bg-purple-50 text-purple-700 text-sm py-1">
                      {cert}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end pt-5 border-t border-gray-100">
              <div className="flex space-x-3">
                {currentQueryId && (
                  <>
                    <Button 
                      variant={savedProfiles[profile.id] ? "default" : "outline"}
                      size="sm" 
                      className={`text-sm px-4 py-2 ${
                        savedProfiles[profile.id] 
                          ? 'bg-black hover:bg-black/90 text-white' 
                          : ''
                      }`}
                      onClick={(e) => handleSaveToggle(e, profile.id)}
                      disabled={!isSavedStatusLoaded}
                    >
                      {!isSavedStatusLoaded ? 'Loading...' : (savedProfiles[profile.id] ? 'Saved' : 'Save')}
                    </Button>
                    <Button 
                      size="sm" 
                      className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2"
                      onClick={(e) => handleStartChat(e, profile.id)}
                    >
                      Start Chat
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    ));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Find Energy Partners</h1>
          <p className="text-gray-600">
            Use natural language to describe what you're looking for. Our AI will find the perfect matches.
          </p>
        </div>

        {/* Search Bar */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <form onSubmit={handleSearch} className="flex gap-4">
              <div className="flex-1 relative">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  type="text"
                  placeholder="E.g., 'EPC with >5 MW rooftop PV experience in Bavaria' or 'Financial consultant for community solar projects'"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-12 text-lg"
                />
              </div>
              <Button 
                type="submit" 
                className="bg-green-600 hover:bg-green-700 text-white px-8 h-12"
                disabled={isLoading}
              >
                {isLoading ? 'Searching...' : 'Search'}
              </Button>
              <Button 
                variant="outline" 
                className="h-12 flex items-center gap-2"
                onClick={fetchProfiles}
                title="Reset to alphabetical order"
              >
                <Filter className="w-5 h-5" />
                Reset
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Profile Cards */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              {currentQueryId ? 'Matching Partners' : 'All Partners'}
              <span className="text-gray-500 font-normal ml-2">({profiles.length} partners)</span>
            </h2>
          </div>
          {renderProfileCards()}
        </div>
      </div>
    </div>
  );
}
