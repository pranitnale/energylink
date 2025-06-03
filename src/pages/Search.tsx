import { useState, useEffect } from 'react';
import { Search as SearchIcon, Filter, Users, Star, MapPin, Zap, Award, Globe2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { Database } from '@/integrations/supabase/types';

type Profile = Database['public']['Tables']['profiles']['Row'];

export default function Search() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');

      if (error) throw error;
      setProfiles(data || []);
    } catch (err) {
      console.error('Error fetching profiles:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch profiles');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // TODO: Implement search functionality
    console.log('Searching for:', searchQuery);
    
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  const handleProfileClick = (profileId: string) => {
    navigate(`/profile/${profileId}`);
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
            <div className="flex items-start space-x-4">
              <div className="w-14 h-14 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center">
                <Users className="w-7 h-7 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-xl font-semibold text-gray-900 mb-1">
                  {profile.full_name}
                </CardTitle>
                <p className="text-lg text-gray-600">{profile.primary_role?.[0]}</p>
                {profile.primary_role && profile.primary_role.length > 1 && (
                  <p className="text-sm text-gray-500 mt-1">+{profile.primary_role.length - 1} other roles</p>
                )}
              </div>
            </div>
            {profile.mw_experience && (
              <div className="text-right">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="text-3xl font-bold text-green-600">{profile.mw_experience}</div>
                  <div className="text-sm text-gray-500">MW<br/>Experience</div>
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
                <Button variant="outline" size="sm" className="text-sm px-4 py-2">
                  Save
                </Button>
                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2">
                  Start Chat
                </Button>
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
              <Button variant="outline" size="icon" className="h-12 w-12">
                <Filter className="w-5 h-5" />
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Profile Cards */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              All Partners
              <span className="text-gray-500 font-normal ml-2">({profiles.length} partners)</span>
            </h2>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span>Sort by:</span>
              <Button variant="ghost" size="sm" className="text-green-600">
                Name (A-Z)
              </Button>
            </div>
          </div>

          <div className="grid gap-6">
            {renderProfileCards()}
          </div>
        </div>
      </div>
    </div>
  );
}
