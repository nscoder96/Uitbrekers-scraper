from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, HttpUrl, Field
import uuid


class LeadStatus(str, Enum):
    SCRAPED = "scraped"
    ENRICHED = "enriched"
    PITCH_READY = "pitch_ready"


class CallStatus(str, Enum):
    NOT_CALLED = "not_called"
    CALLED = "called"
    INTERESTED = "interested"
    REJECTED = "rejected"


class LeadBase(BaseModel):
    """Base lead fields."""

    company_name: str
    address: str
    city: str
    postal_code: str = ""
    phone: Optional[str] = None
    website: Optional[str] = None
    google_rating: Optional[float] = None
    review_count: Optional[int] = None


class LeadCreate(LeadBase):
    """Fields for creating a new lead."""

    source: str = "google_maps"


class LeadUpdate(BaseModel):
    """Fields that can be updated on a lead."""

    owner_name: Optional[str] = None
    contact_person: Optional[str] = None
    description: Optional[str] = None
    services: Optional[list[str]] = None
    specializations: Optional[list[str]] = None
    recent_projects: Optional[list[str]] = None
    employee_estimate: Optional[int] = None
    pitch: Optional[str] = None
    call_status: Optional[CallStatus] = None
    call_notes: Optional[str] = None
    status: Optional[LeadStatus] = None


class Lead(LeadBase):
    """Complete lead model."""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    source: str = "google_maps"

    # Eigenaar/contactpersoon
    owner_name: Optional[str] = None
    contact_person: Optional[str] = None

    # Enriched data
    description: Optional[str] = None
    services: list[str] = Field(default_factory=list)
    specializations: list[str] = Field(default_factory=list)
    recent_projects: list[str] = Field(default_factory=list)
    employee_estimate: Optional[int] = None

    # Generated pitch
    pitch: Optional[str] = None
    pitch_generated_at: Optional[datetime] = None

    # Call tracking
    call_status: CallStatus = CallStatus.NOT_CALLED
    call_notes: Optional[str] = None
    called_at: Optional[datetime] = None

    # Meta
    scraped_at: datetime = Field(default_factory=datetime.now)
    enriched_at: Optional[datetime] = None
    status: LeadStatus = LeadStatus.SCRAPED

    class Config:
        from_attributes = True
