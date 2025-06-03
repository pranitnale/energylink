import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Profile, PRIMARY_ROLE_OPTIONS, INTENT_OPTIONS, TECH_TAGS, LANGUAGE_OPTIONS } from "@/lib/types/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { MultiSelect } from "@/components/ui/multi-select";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";
import { useState, useEffect } from "react";
import { getUniquePrimaryRoles, getUniqueTechnicalExpertise, getUniqueRegions } from "@/lib/supabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ResumeAnalyzer } from "@/components/ResumeAnalyzer";

const AVAILABILITY_OPTIONS = [
  { value: "immediately", label: "Immediately" },
  { value: "1 month", label: "1 month" },
  { value: "3 months", label: "3 months" },
  { value: "6 months", label: "6 months" },
  { value: "unavailable", label: "Unavailable" },
];

const profileSchema = z.object({
  email: z.string().email(),
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  contact_number: z.string().optional(),
  primary_role: z.string().min(1, "Select a role"),
  region_tags: z.array(z.string()).min(1, "Select at least one region"),
  intent: z.string().min(1, "Select your intent"),
  tech_tags: z.array(z.string()).min(1, "Select at least one technical expertise"),
  certifications: z.array(z.string()).optional(),
  availability: z.string().min(1, "Select your availability"),
  languages: z.array(z.string()).min(1, "Select at least one language"),
  ikigai: z.object({
    passion: z.string().optional(),
    mission: z.string().optional(),
    vocation: z.string().optional(),
    profession: z.string().optional(),
  }).optional(),
  resume_text: z.string().optional(),
  experience: z.string().min(10, "Experience must be at least 10 characters"),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface ProfileFormProps {
  initialData?: Partial<ProfileFormValues>;
  onSubmit: (data: ProfileFormValues) => Promise<void>;
}

const roles = [
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "DevOps Engineer",
  "UI/UX Designer",
  "Product Manager",
  "Data Scientist",
  "Mobile Developer",
];

const intents = [
  { value: "hire", label: "I want to hire talent" },
  { value: "get_hired", label: "I want to get hired" },
  { value: "collaborate", label: "I want to collaborate" },
];

const languages = [
  "English",
  "German",
  "French",
  "Spanish",
  "Hindi",
  "Chinese",
  "Japanese",
  "Russian",
];

export function ProfileForm({ initialData, onSubmit }: ProfileFormProps) {
  const [existingRoles, setExistingRoles] = useState<string[]>([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState(true);
  const [showCustomRoleDialog, setShowCustomRoleDialog] = useState(false);
  const [newCustomRole, setNewCustomRole] = useState("");

  const [existingExpertise, setExistingExpertise] = useState<string[]>([]);
  const [isLoadingExpertise, setIsLoadingExpertise] = useState(true);
  const [showCustomExpertiseDialog, setShowCustomExpertiseDialog] = useState(false);
  const [newCustomExpertise, setNewCustomExpertise] = useState("");

  const [existingRegions, setExistingRegions] = useState<string[]>([]);
  const [isLoadingRegions, setIsLoadingRegions] = useState(true);
  const [showCustomRegionDialog, setShowCustomRegionDialog] = useState(false);
  const [newCustomRegion, setNewCustomRegion] = useState("");

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const roles = await getUniquePrimaryRoles();
        setExistingRoles(roles);
      } catch (error) {
        console.error("Error fetching roles:", error);
      } finally {
        setIsLoadingRoles(false);
      }
    };

    const fetchExpertise = async () => {
      try {
        const expertise = await getUniqueTechnicalExpertise();
        setExistingExpertise(expertise);
      } catch (error) {
        console.error("Error fetching technical expertise:", error);
      } finally {
        setIsLoadingExpertise(false);
      }
    };

    const fetchRegions = async () => {
      try {
        const regions = await getUniqueRegions();
        setExistingRegions(regions);
      } catch (error) {
        console.error("Error fetching regions:", error);
      } finally {
        setIsLoadingRegions(false);
      }
    };

    fetchRoles();
    fetchExpertise();
    fetchRegions();
  }, []);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      email: initialData?.email || "",
      full_name: initialData?.full_name || "",
      contact_number: initialData?.contact_number || "",
      primary_role: initialData?.primary_role?.[0] || "",
      region_tags: initialData?.region_tags || [],
      intent: initialData?.intent?.[0] || "",
      tech_tags: initialData?.tech_tags || [],
      certifications: initialData?.certifications || [],
      availability: initialData?.availability || "",
      languages: initialData?.languages || [],
      ikigai: initialData?.ikigai || {},
      resume_text: initialData?.resume_text || "",
      experience: initialData?.experience || "",
    },
  });

  const handleSubmit = async (data: ProfileFormValues) => {
    try {
      await onSubmit(data);
      toast.success("Profile updated successfully");
    } catch (error) {
      toast.error("Failed to update profile");
      console.error(error);
    }
  };

  const [newTech, setNewTech] = useState("");
  const [newLanguage, setNewLanguage] = useState("");

  const addTech = () => {
    if (newTech && !form.getValues("tech_tags").includes(newTech)) {
      const currentTechs = form.getValues("tech_tags");
      form.setValue("tech_tags", [...currentTechs, newTech]);
      setNewTech("");
    }
  };

  const removeTech = (tech: string) => {
    const currentTechs = form.getValues("tech_tags");
    form.setValue("tech_tags", currentTechs.filter((t) => t !== tech));
  };

  const addLanguage = () => {
    if (newLanguage && !form.getValues("languages").includes(newLanguage)) {
      const currentLangs = form.getValues("languages");
      form.setValue("languages", [...currentLangs, newLanguage]);
      setNewLanguage("");
    }
  };

  const removeLanguage = (lang: string) => {
    const currentLangs = form.getValues("languages");
    form.setValue("languages", currentLangs.filter((l) => l !== lang));
  };

  const handleAddCustomRole = () => {
    if (newCustomRole) {
      form.setValue("primary_role", newCustomRole);
      setNewCustomRole("");
      setShowCustomRoleDialog(false);
    }
  };

  const handleAddCustomExpertise = () => {
    if (newCustomExpertise && !form.getValues("tech_tags").includes(newCustomExpertise)) {
      const currentExpertise = form.getValues("tech_tags");
      form.setValue("tech_tags", [...currentExpertise, newCustomExpertise]);
      setNewCustomExpertise("");
      setShowCustomExpertiseDialog(false);
    }
  };

  const removeExpertise = (expertise: string) => {
    const currentExpertise = form.getValues("tech_tags");
    form.setValue("tech_tags", currentExpertise.filter((e) => e !== expertise));
  };

  const handleAddCustomRegion = () => {
    if (newCustomRegion && !form.getValues("region_tags").includes(newCustomRegion)) {
      const currentRegions = form.getValues("region_tags");
      form.setValue("region_tags", [...currentRegions, newCustomRegion]);
      setNewCustomRegion("");
      setShowCustomRegionDialog(false);
    }
  };

  const removeRegion = (region: string) => {
    const currentRegions = form.getValues("region_tags");
    form.setValue("region_tags", currentRegions.filter((r) => r !== region));
  };

  const handleResumeAnalysis = (data: {
    full_name: string;
    region_tags: string[];
    tech_tags: string[];
    languages: string[];
    experience: string;
  }) => {
    // Update form fields with the analyzed data
    form.setValue("full_name", data.full_name);
    form.setValue("region_tags", data.region_tags);
    form.setValue("tech_tags", data.tech_tags);
    form.setValue("languages", data.languages);
    form.setValue("experience", data.experience);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-12">
        {/* Resume Analysis Section */}
        <section>
          <h2 className="text-xl font-semibold mb-1">Resume Analysis</h2>
          <p className="text-sm text-muted-foreground mb-2">
            Upload your resume to automatically fill in your profile details, or fill them manually below
          </p>
          <div className="flex items-center gap-2 p-3 mb-6 text-sm border rounded-md bg-yellow-50 border-yellow-200 text-yellow-800">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
              <path d="M12 9v4"></path>
              <path d="M12 17h.01"></path>
            </svg>
            <div className="space-y-1">
              <p>Your resume will be processed by Google's Gemini AI model for information extraction.</p>
              <p className="font-medium">Please review all extracted information carefully for accuracy before saving your profile.</p>
            </div>
          </div>
          <ResumeAnalyzer onAnalysisComplete={handleResumeAnalysis} />
        </section>

        {/* Divider with OR */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-4 text-muted-foreground font-semibold">OR</span>
          </div>
        </div>

        {/* Basic Information Section */}
        <section>
          <h2 className="text-xl font-semibold mb-1">Basic Information</h2>
          <p className="text-sm text-muted-foreground mb-6">Tell us about yourself</p>
          <div className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input {...field} disabled className="bg-muted" />
                  </FormControl>
                  <FormDescription>
                    Your email address cannot be changed
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contact_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Number</FormLabel>
                  <FormControl>
                    <Input placeholder="+1 (555) 000-0000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </section>

        {/* Professional Details Section */}
        <section>
          <h2 className="text-xl font-semibold mb-1">Professional Details</h2>
          <p className="text-sm text-muted-foreground mb-6">Your role and intentions</p>
          <div className="space-y-6">
            <FormField
              control={form.control}
              name="primary_role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Primary Role</FormLabel>
                  <div className="flex gap-2">
                    <Select
                      onValueChange={(value) => {
                        if (value === "custom") {
                          setShowCustomRoleDialog(true);
                        } else {
                          field.onChange(value);
                        }
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your primary role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isLoadingRoles ? (
                          <SelectItem value="loading" disabled>
                            Loading roles...
                          </SelectItem>
                        ) : (
                          <>
                            {existingRoles.map((role) => (
                              <SelectItem key={role} value={role}>
                                {role}
                              </SelectItem>
                            ))}
                            <SelectItem value="custom">
                              <div className="flex items-center gap-2">
                                <Plus className="h-4 w-4" />
                                Add Custom Role
                              </div>
                            </SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Dialog open={showCustomRoleDialog} onOpenChange={setShowCustomRoleDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Custom Role</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="Enter custom role"
                    value={newCustomRole}
                    onChange={(e) => setNewCustomRole(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddCustomRole();
                      }
                    }}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowCustomRoleDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleAddCustomRole}>Add Role</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <FormField
              control={form.control}
              name="intent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>What is your primary intent?</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose the primary reason you're using this platform" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {intents.map((intent) => (
                        <SelectItem key={intent.value} value={intent.value}>
                          {intent.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="region_tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Regions you operate in</FormLabel>
                  <div className="flex gap-2">
                    <Select
                      onValueChange={(value) => {
                        if (!field.value.includes(value)) {
                          field.onChange([...field.value, value]);
                        }
                        if (value === "custom") {
                          setShowCustomRegionDialog(true);
                        }
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select regions" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isLoadingRegions ? (
                          <SelectItem value="loading" disabled>
                            Loading regions...
                          </SelectItem>
                        ) : (
                          <>
                            {existingRegions.map((region) => (
                              <SelectItem key={region} value={region}>
                                {region}
                              </SelectItem>
                            ))}
                            <SelectItem value="custom">
                              <div className="flex items-center gap-2">
                                <Plus className="h-4 w-4" />
                                Add Custom Region
                              </div>
                            </SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {field.value.map((region: string) => (
                      <Badge key={region} variant="outline">
                        {region}
                        <button
                          type="button"
                          onClick={() => removeRegion(region)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Dialog open={showCustomRegionDialog} onOpenChange={setShowCustomRegionDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Custom Region</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="Enter custom region"
                    value={newCustomRegion}
                    onChange={(e) => setNewCustomRegion(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddCustomRegion();
                      }
                    }}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowCustomRegionDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleAddCustomRegion}>Add Region</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </section>

        <Separator />

        {/* Technical Expertise */}
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium">Technical Skills</h3>
            <p className="text-sm text-muted-foreground">
              Add your technical expertise and languages
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <FormField
              control={form.control}
              name="tech_tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Technical Expertise</FormLabel>
                  <div className="flex gap-2">
                    <Select
                      onValueChange={(value) => {
                        if (!field.value.includes(value)) {
                          field.onChange([...field.value, value]);
                        }
                        if (value === "custom") {
                          setShowCustomExpertiseDialog(true);
                        }
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your technical expertise" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isLoadingExpertise ? (
                          <SelectItem value="loading" disabled>
                            Loading expertise...
                          </SelectItem>
                        ) : (
                          <>
                            {existingExpertise.map((expertise) => (
                              <SelectItem key={expertise} value={expertise}>
                                {expertise}
                              </SelectItem>
                            ))}
                            <SelectItem value="custom">
                              <div className="flex items-center gap-2">
                                <Plus className="h-4 w-4" />
                                Add Custom Expertise
                              </div>
                            </SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {field.value.map((expertise: string) => (
                      <Badge key={expertise} variant="outline">
                        {expertise}
                        <button
                          type="button"
                          onClick={() => removeExpertise(expertise)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Dialog open={showCustomExpertiseDialog} onOpenChange={setShowCustomExpertiseDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Custom Expertise</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="Enter custom expertise"
                    value={newCustomExpertise}
                    onChange={(e) => setNewCustomExpertise(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddCustomExpertise();
                      }
                    }}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowCustomExpertiseDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleAddCustomExpertise}>Add Expertise</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <FormField
              control={form.control}
              name="languages"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Languages</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      if (!field.value.includes(value)) {
                        field.onChange([...field.value, value]);
                      }
                    }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a language" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {languages.map((lang) => (
                        <SelectItem key={lang} value={lang}>
                          {lang}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {field.value.map((lang) => (
                      <Badge key={lang} variant="secondary">
                        {lang}
                        <button
                          type="button"
                          onClick={() => removeLanguage(lang)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <Separator />

        {/* Availability and Experience */}
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium">Additional Information</h3>
            <p className="text-sm text-muted-foreground">
              Your availability and experience
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <FormField
              control={form.control}
              name="availability"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Availability</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your availability" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {AVAILABILITY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="experience"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Experience</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Tell us about your experience..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit">Save Changes</Button>
        </div>
      </form>
    </Form>
  );
} 