// File: src/pages/SavedContacts.tsx
import { useState, useEffect } from 'react';
import { Users, Globe2, Award, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { Database } from '@/integrations/supabase/types';
import { CircularProgress } from '@/components/CircularProgress';
import { toast } from 'sonner';
import { deleteSavedProfile } from '@/lib/services/savedProfiles';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface SavedProfile {
  id: string;
  seeker_id: string;
  candidate_id: string;
  query_match_id: string;
  snapshot_score: number;
  snapshot_rationale: string;
  saved_at: string;
  profiles: Profile;
  query_matches: {
    queries: {
      query_text: string;
    };
  };
}

export default function SavedContacts() {
  const [savedProfiles, setSavedProfiles] = useState<SavedProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSavedProfiles();
  }, []);

  const fetchSavedProfiles = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Fetch saved profiles with joined profile data and query text
      const { data, error } = await supabase
        .from('saved_profiles')
        .select(`
          *,
          profiles:candidate_id (*),
          query_matches (
            queries (
              query_text
            )
          )
        `)
        .eq('seeker_id', user.id)
        .order('saved_at', { ascending: false });

      if (error) throw error;
      setSavedProfiles(data || []);
    } catch (err) {
      console.error('Error fetching saved profiles:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch saved profiles');
      toast.error('Failed to load saved contacts');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileClick = (profileId: string, savedProfile: SavedProfile) => {
    navigate(`/profile/${profileId}`, {
      state: { 
        fromSearch: true,
        fromSaved: true,
        queryText: savedProfile.query_matches.queries.query_text,
        synergyScore: {
          candidate_id: profileId,
          score: savedProfile.snapshot_score,
          explanation: savedProfile.snapshot_rationale,
          dimension: {
            // Since we don't have dimension scores in saved_profiles table,
            // we'll calculate an approximate distribution based on the total score
            E: Math.round((savedProfile.snapshot_score / 100) * 5),
            T: Math.round((savedProfile.snapshot_score / 100) * 5),
            C: Math.round((savedProfile.snapshot_score / 100) * 5),
            R: Math.round((savedProfile.snapshot_score / 100) * 5)
          }
        }
      }
    });
  };

  const handleUnsave = async (profileId: string) => {
    const success = await deleteSavedProfile(profileId);
    if (success) {
      setSavedProfiles(prev => prev.filter(p => p.candidate_id !== profileId));
      toast.success('Contact removed from saved list');
    }
  };

  const renderProfileCards = () => {
    if (error) {
      return (
        <Card className="text-center py-8">
          <CardContent>
            <p className="text-red-600">Error: {error}</p>
            <Button onClick={fetchSavedProfiles} className="mt-4">Retry</Button>
          </CardContent>
        </Card>
      );
    }

    if (isLoading) {
      return (
        <Card className="text-center py-8">
          <CardContent>
            <p className="text-gray-600">Loading saved contacts...</p>
          </CardContent>
        </Card>
      );
    }

    if (savedProfiles.length === 0) {
      return (
        <Card className="text-center py-8">
          <CardContent>
            <p className="text-gray-600">No saved contacts yet.</p>
            <Button onClick={() => navigate('/search')} className="mt-4">
              Find Partners
            </Button>
          </CardContent>
        </Card>
      );
    }

    return savedProfiles.map((saved) => {
      const profile = saved.profiles;
      
      return (
        <Card 
          key={saved.id} 
          className="hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => handleProfileClick(profile.id, saved)}
        >
          {/* Query Text Banner */}
          <div className="bg-gray-50 border-b border-gray-100 px-6 py-4">
            <div className="flex items-center gap-2 text-gray-600">
              <Search className="w-5 h-5" />
              <span className="font-medium text-base">Saved from search:</span>
              <span className="italic text-base flex-1">&quot;{saved.query_matches.queries.query_text}&quot;</span>
            </div>
          </div>

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
              <div className="flex items-center space-x-4">
                <div className="flex-1 max-w-md">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-base font-semibold text-gray-700 leading-snug">
                      {saved.snapshot_rationale}
                    </p>
                  </div>
                </div>
                <div>
                  <CircularProgress value={saved.snapshot_score} />
                </div>
              </div>
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
                  <Button 
                    variant="outline"
                    size="sm" 
                    className="text-sm px-4 py-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUnsave(profile.id);
                    }}
                  >
                    Remove
                  </Button>
                  <Button 
                    size="sm" 
                    className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/chat/${profile.id}`);
                    }}
                  >
                    Start Chat
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Saved Contacts</h1>
          <p className="text-gray-600">
            View and manage your saved energy partners.
          </p>
        </div>

        {/* Profile Cards */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Your Saved Partners
              <span className="text-gray-500 font-normal ml-2">({savedProfiles.length} partners)</span>
            </h2>
          </div>
          {renderProfileCards()}
        </div>
      </div>
    </div>
  );
}