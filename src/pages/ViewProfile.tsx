import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Database } from "@/integrations/supabase/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Award, Globe2, Mail, MessageSquare, Clock, Briefcase } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

type Profile = Database['public']['Tables']['profiles']['Row'];

export default function ViewProfile() {
  const { profileId } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', profileId)
          .single();

        if (error) throw error;
        setProfile(data);
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch profile');
        toast.error("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    if (profileId) {
      fetchProfile();
    }
  }, [profileId]);

  if (loading) {
    return (
      <div className="container mx-auto py-8 space-y-8">
        <Skeleton className="h-12 w-48" />
        <div className="grid gap-8">
          <Skeleton className="h-[400px]" />
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="container mx-auto py-8">
        <Card className="text-center py-8">
          <CardContent>
            <p className="text-red-600 mb-4">Error: {error || 'Profile not found'}</p>
            <Button onClick={() => navigate('/search')}>Back to Search</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Profile Header */}
        <Card>
          <CardHeader className="pb-0">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src={`https://avatar.vercel.sh/${profile.id}.png`} />
                <AvatarFallback className="text-2xl">
                  {profile.full_name?.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-2 flex-1">
                <CardTitle className="text-3xl">{profile.full_name}</CardTitle>
                <div className="flex flex-wrap gap-2">
                  {profile.primary_role?.map((role) => (
                    <Badge key={role} variant="secondary">{role}</Badge>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Mail className="w-4 h-4 mr-2" />
                  Save Contact
                </Button>
                <Button size="sm" className="bg-green-600 hover:bg-green-700">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Start Chat
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid gap-6">
              {/* Experience and Availability */}
              <div className="grid gap-6 md:grid-cols-2">
                {profile.experience && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Briefcase className="w-5 h-5 text-gray-600" />
                      <h3 className="text-lg font-semibold">Experience</h3>
                    </div>
                    <p className="text-gray-600">
                      {profile.experience}
                    </p>
                  </div>
                )}
                
                {profile.availability && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-5 h-5 text-gray-600" />
                      <h3 className="text-lg font-semibold">Project Start</h3>
                    </div>
                    <p className="text-gray-600">
                      Can start in: {profile.availability}
                    </p>
                  </div>
                )}
              </div>

              {/* Experience */}
              {profile.mw_experience && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Experience</h3>
                  <p className="text-gray-600">
                    {profile.mw_experience} MW of project experience
                  </p>
                </div>
              )}

              {/* Regions */}
              {profile.region_tags && profile.region_tags.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Globe2 className="w-5 h-5 text-gray-600" />
                    <h3 className="text-lg font-semibold">Regions</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {profile.region_tags.map((region) => (
                      <Badge key={region} variant="secondary" className="bg-blue-50 text-blue-700">
                        {region}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Technical Expertise */}
              {profile.tech_tags && profile.tech_tags.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Technical Expertise</h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.tech_tags.map((tech) => (
                      <Badge key={tech} variant="outline">
                        {tech}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Certifications */}
              {profile.certifications && profile.certifications.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="w-5 h-5 text-gray-600" />
                    <h3 className="text-lg font-semibold">Certifications</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {profile.certifications.map((cert) => (
                      <Badge key={cert} variant="secondary" className="bg-purple-50 text-purple-700">
                        {cert}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Languages */}
              {profile.languages && profile.languages.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Languages</h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.languages.map((language) => (
                      <Badge key={language} variant="outline">
                        {language}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => navigate('/search')}>
            Back to Search
          </Button>
        </div>
      </div>
    </div>
  );
} 