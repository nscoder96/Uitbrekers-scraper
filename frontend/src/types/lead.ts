export type LeadStatus = 'scraped' | 'enriched' | 'pitch_ready';
export type CallStatus = 'not_called' | 'called' | 'interested' | 'rejected';

export interface Lead {
  id: string;
  source: string;
  company_name: string;
  address: string;
  city: string;
  postal_code: string;
  phone: string | null;
  website: string | null;
  google_rating: number | null;
  review_count: number | null;
  owner_name: string | null;
  contact_person: string | null;
  description: string | null;
  services: string[];
  specializations: string[];
  recent_projects: string[];
  employee_estimate: number | null;
  pitch: string | null;
  pitch_generated_at: string | null;
  call_status: CallStatus;
  call_notes: string | null;
  called_at: string | null;
  scraped_at: string;
  enriched_at: string | null;
  status: LeadStatus;
}

export interface LeadsResponse {
  leads: Lead[];
  total: number;
}

export interface ScrapeRequest {
  search_term: string;
  region: string;
  max_leads: number;
  min_employees?: number;
  max_employees?: number;
  auto_enrich?: boolean;
}

export interface ScrapeResponse {
  status: string;
  leads_found: number;
  message: string;
}

export interface LeadFilters {
  status?: LeadStatus;
  call_status?: CallStatus;
  has_website?: boolean;
  has_phone?: boolean;
  min_employees?: number;
  max_employees?: number;
}
