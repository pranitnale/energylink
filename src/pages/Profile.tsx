import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ProfileForm } from "@/components/ProfileForm";
import { Profile } from "@/lib/types/profile";
import { getProfile, updateProfile, supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }
      setEmail(user.email || "");
      try {
        const profileData = await getProfile(user.id);
        setProfile(profileData);
      } catch (error) {
        console.error("Error fetching profile:", error);
        toast.error("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };
    checkUser();
  }, [navigate]);

  const handleSubmit = async (data: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/login");
      return;
    }
    try {
      // Remove email before sending to Supabase
      const { email, ...profileData } = data;
      const profileUpdate = {
        ...profileData,
        primary_role: Array.isArray(data.primary_role) ? data.primary_role : data.primary_role ? [data.primary_role] : [],
        intent: Array.isArray(data.intent) ? data.intent : data.intent ? [data.intent] : [],
        tech_tags: Array.isArray(data.tech_tags) ? data.tech_tags : data.tech_tags ? [data.tech_tags] : [],
      };
      const updatedProfile = await updateProfile(user.id, profileUpdate);
      setProfile(updatedProfile);
      toast.success("Profile updated successfully");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 space-y-8">
        <Skeleton className="h-12 w-48" />
        <div className="grid gap-8 md:grid-cols-2">
          <Skeleton className="h-[400px]" />
          <Skeleton className="h-[400px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Profile Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          <Avatar className="h-24 w-24">
            <AvatarImage src={`https://avatar.vercel.sh/${profile?.id}.png`} />
            <AvatarFallback className="text-2xl">
              {profile?.full_name?.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">{profile?.full_name}</h1>
            <div className="flex flex-wrap gap-2">
              {profile?.primary_role?.map((role) => (
                <Badge key={role} variant="secondary">{role}</Badge>
              ))}
            </div>
            <p className="text-muted-foreground">
              {profile?.intent?.map(intent => intent.replace('_', ' ')).join(' • ')}
            </p>
          </div>
        </div>

        {/* Profile Content */}
        <Tabs defaultValue="edit" className="space-y-6">
          <TabsList>
            <TabsTrigger value="edit">Edit Profile</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>

          <TabsContent value="edit">
            <Card>
              <CardHeader>
                <CardTitle>Edit Profile</CardTitle>
                <CardDescription>
                  Update your profile information to help others find you
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ProfileForm initialData={{ ...profile, email }} onSubmit={handleSubmit} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preview">
            <Card>
              <CardHeader>
                <CardTitle>Profile Preview</CardTitle>
                <CardDescription>
                  This is how others will see your profile
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-8">
                  {/* Professional Overview */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-primary">Professional Overview</h3>
                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">Primary Role</p>
                        <div className="flex flex-wrap gap-2">
                          {profile?.primary_role?.map((role) => (
                            <Badge key={role} variant="secondary" className="text-sm">
                              {role}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">Intent</p>
                        <div className="flex flex-wrap gap-2">
                          {profile?.intent?.map((intent) => (
                            <Badge key={intent} variant="outline" className="text-sm capitalize">
                              {intent.replace('_', ' ')}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expertise & Languages */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-primary">Expertise & Languages</h3>
                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">Technical Expertise</p>
                        <div className="flex flex-wrap gap-2">
                          {profile?.tech_tags?.map((tech) => (
                            <Badge key={tech} variant="secondary" className="text-sm">
                              {tech}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">Languages</p>
                        <div className="flex flex-wrap gap-2">
                          {profile?.languages?.map((lang) => (
                            <Badge key={lang} variant="outline" className="text-sm">
                              {lang}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Certifications & Availability */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-primary">Additional Information</h3>
                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">Certifications</p>
                        <div className="flex flex-wrap gap-2">
                          {profile?.certifications && profile.certifications.length > 0 ? (
                            profile.certifications.map((cert) => (
                              <Badge key={cert} variant="secondary" className="text-sm">
                                {cert}
                              </Badge>
                            ))
                          ) : (
                            <p className="text-sm text-muted-foreground">No certifications listed</p>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">Availability</p>
                        <p className="text-sm">
                          {profile?.availability
                            ? `Available in ${profile.availability} weeks`
                            : 'Not specified'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Experience */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-primary">Experience</h3>
                    <div className="rounded-lg border p-4 bg-muted/50">
                      <p className="text-sm whitespace-pre-wrap">
                        {profile?.experience || 'No experience provided'}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
} 