export interface Profile {
  id: string;
  email: string;
  full_name: string;
  contact_number?: string;
  primary_role: string[];
  region_tags?: string[];
  intent: string[];
  tech_tags: string[];
  certifications?: string[];
  availability?: number;
  languages: string[];
  ikigai?: {
    passion?: string;
    mission?: string;
    vocation?: string;
    profession?: string;
  };
  resume_text?: string;
  experience: string;
  created_at?: string;
  updated_at?: string;
}

export const PRIMARY_ROLE_OPTIONS = [
  'EPC',
  'Developer',
  'Consultant',
  'Investor',
  'Manufacturer',
  'Service Provider',
  'Other'
] as const;

export const INTENT_OPTIONS = [
  'hire',
  'get_hired',
  'collaborate'
] as const;

export const TECH_TAGS = [
  'Solar',
  'BESS',
  'Wind',
  'Hydro',
  'Biomass',
  'Geothermal',
  'Smart Grid',
  'Energy Storage',
  'EV Infrastructure',
  'Other'
] as const;

export const LANGUAGE_OPTIONS = [
  'English',
  'Spanish',
  'French',
  'German',
  'Chinese',
  'Japanese',
  'Arabic',
  'Hindi',
  'Other'
] as const; 