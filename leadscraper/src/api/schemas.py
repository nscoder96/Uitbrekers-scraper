from datetime import datetime
from typing import Optional
from pydantic import BaseModel

from ..models import LeadStatus, CallStatus


class ScrapeRequest(BaseModel):
    """Request to start a scrape job."""

    search_term: str = "hovenier"
    region: str = "Zuid-Holland, Nederland"
    max_leads: int = 50
    min_employees: Optional[int] = None
    max_employees: Optional[int] = None
    auto_enrich: bool = True


class ScrapeResponse(BaseModel):
    """Response from a scrape job."""

    status: str
    leads_found: int
    message: str


class EnrichRequest(BaseModel):
    """Request to enrich leads."""

    lead_ids: Optional[list[str]] = None  # If None, enrich all unenriched leads
    max_pages_per_site: int = 5


class EnrichResponse(BaseModel):
    """Response from enrichment."""

    status: str
    leads_enriched: int
    message: str


class GeneratePitchRequest(BaseModel):
    """Request to generate pitch(es)."""

    lead_ids: list[str]


class GeneratePitchResponse(BaseModel):
    """Response from pitch generation."""

    status: str
    pitches_generated: int
    message: str


class LeadResponse(BaseModel):
    """Lead response model."""

    id: str
    source: str
    company_name: str
    address: str
    city: str
    postal_code: str
    phone: Optional[str]
    website: Optional[str]
    google_rating: Optional[float]
    review_count: Optional[int]
    owner_name: Optional[str]
    contact_person: Optional[str]
    description: Optional[str]
    services: list[str]
    specializations: list[str]
    recent_projects: list[str]
    employee_estimate: Optional[int]
    pitch: Optional[str]
    pitch_generated_at: Optional[datetime]
    call_status: CallStatus
    call_notes: Optional[str]
    called_at: Optional[datetime]
    scraped_at: datetime
    enriched_at: Optional[datetime]
    status: LeadStatus

    class Config:
        from_attributes = True


class LeadUpdateRequest(BaseModel):
    """Request to update a lead."""

    call_status: Optional[CallStatus] = None
    call_notes: Optional[str] = None
    owner_name: Optional[str] = None
    contact_person: Optional[str] = None


class LeadsListResponse(BaseModel):
    """Response containing list of leads."""

    leads: list[LeadResponse]
    total: int


class LeadFilters(BaseModel):
    """Filters for leads query."""

    status: Optional[LeadStatus] = None
    call_status: Optional[CallStatus] = None
    has_website: Optional[bool] = None
    has_phone: Optional[bool] = None
    min_employees: Optional[int] = None
    max_employees: Optional[int] = None
    limit: Optional[int] = None
    offset: int = 0
