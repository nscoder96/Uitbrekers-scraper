import csv
import io
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request, Query
from fastapi.responses import StreamingResponse
from typing import Optional

from ..models import Lead, LeadUpdate, LeadStatus, CallStatus
from ..services import GoogleMapsService, WebsiteCrawlerService, PitchGeneratorService, LeadStore
from .schemas import (
    ScrapeRequest,
    ScrapeResponse,
    EnrichRequest,
    EnrichResponse,
    GeneratePitchRequest,
    GeneratePitchResponse,
    LeadResponse,
    LeadUpdateRequest,
    LeadsListResponse,
)


router = APIRouter()


def get_lead_store(request: Request) -> LeadStore:
    """Dependency to get lead store from app state."""
    return request.app.state.lead_store


# ============ Scraping ============


@router.post("/scrape", response_model=ScrapeResponse)
async def scrape_businesses(
    request: ScrapeRequest,
    lead_store: LeadStore = Depends(get_lead_store),
):
    """Start scraping businesses from Google Maps."""
    try:
        google_maps = GoogleMapsService()
        leads_data = await google_maps.scrape_businesses(
            search_term=request.search_term,
            region=request.region,
            max_results=request.max_leads,
        )

        # Store leads
        leads = await lead_store.create_leads_batch(leads_data)
        enriched_count = 0
        filtered_count = len(leads)

        # Auto-enrich if requested (needed for employee filtering)
        if request.auto_enrich:
            crawler = WebsiteCrawlerService()
            for lead in leads:
                if not lead.website:
                    continue
                try:
                    content = await crawler.crawl_website(lead.website, max_pages=3)
                    if content:
                        await lead_store.update_lead_enrichment(
                            lead_id=lead.id,
                            description=content.get("description"),
                            services=content.get("services", []),
                            specializations=content.get("specializations", []),
                            recent_projects=content.get("recent_projects", []),
                            owner_name=content.get("owner_name"),
                            employee_estimate=content.get("employee_estimate"),
                        )
                        enriched_count += 1
                except Exception as e:
                    print(f"Error enriching {lead.company_name}: {e}")

            # Filter by employee count if specified
            if request.min_employees is not None or request.max_employees is not None:
                all_leads = await lead_store.get_leads()
                for lead in all_leads:
                    should_delete = False
                    if lead.employee_estimate:
                        if request.min_employees and lead.employee_estimate < request.min_employees:
                            should_delete = True
                        if request.max_employees and lead.employee_estimate > request.max_employees:
                            should_delete = True
                    if should_delete:
                        await lead_store.delete_lead(lead.id)
                        filtered_count -= 1

        message = f"Succesvol {len(leads)} leads gescraped"
        if request.auto_enrich:
            message += f", {enriched_count} verrijkt"
        if filtered_count < len(leads):
            message += f", {filtered_count} na filtering"

        return ScrapeResponse(
            status="success",
            leads_found=filtered_count,
            message=message,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============ Enrichment ============


@router.post("/enrich", response_model=EnrichResponse)
async def enrich_leads(
    request: EnrichRequest,
    lead_store: LeadStore = Depends(get_lead_store),
):
    """Enrich leads with website content."""
    try:
        # Get leads to enrich
        if request.lead_ids:
            leads = []
            for lead_id in request.lead_ids:
                lead = await lead_store.get_lead(lead_id)
                if lead and lead.website:
                    leads.append(lead)
        else:
            # Get all scraped leads with websites
            leads = await lead_store.get_leads(status=LeadStatus.SCRAPED, has_website=True)

        crawler = WebsiteCrawlerService()
        enriched_count = 0

        for lead in leads:
            if not lead.website:
                continue

            try:
                content = await crawler.crawl_website(
                    lead.website,
                    max_pages=request.max_pages_per_site,
                )

                if content:
                    await lead_store.update_lead_enrichment(
                        lead_id=lead.id,
                        description=content.get("description"),
                        services=content.get("services", []),
                        specializations=content.get("specializations", []),
                        recent_projects=content.get("recent_projects", []),
                        owner_name=content.get("owner_name"),
                        employee_estimate=content.get("employee_estimate"),
                    )
                    enriched_count += 1
            except Exception as e:
                print(f"Error enriching {lead.company_name}: {e}")

        return EnrichResponse(
            status="success",
            leads_enriched=enriched_count,
            message=f"Succesvol {enriched_count} leads verrijkt met website data",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============ Pitch Generation ============


@router.post("/generate-pitch/{lead_id}", response_model=LeadResponse)
async def generate_pitch_for_lead(
    lead_id: str,
    lead_store: LeadStore = Depends(get_lead_store),
):
    """Generate a pitch for a single lead."""
    lead = await lead_store.get_lead(lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead niet gevonden")

    try:
        generator = PitchGeneratorService()
        pitch = await generator.generate_pitch(lead)

        updated_lead = await lead_store.update_lead_pitch(lead_id, pitch)
        return LeadResponse.model_validate(updated_lead)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate-pitches", response_model=GeneratePitchResponse)
async def generate_pitches_batch(
    request: GeneratePitchRequest,
    lead_store: LeadStore = Depends(get_lead_store),
):
    """Generate pitches for multiple leads."""
    try:
        leads = []
        for lead_id in request.lead_ids:
            lead = await lead_store.get_lead(lead_id)
            if lead:
                leads.append(lead)

        if not leads:
            raise HTTPException(status_code=404, detail="Geen leads gevonden")

        generator = PitchGeneratorService()
        pitches = await generator.generate_pitches_batch(leads)

        # Update leads with pitches
        generated_count = 0
        for lead_id, pitch in pitches.items():
            if pitch:
                await lead_store.update_lead_pitch(lead_id, pitch)
                generated_count += 1

        return GeneratePitchResponse(
            status="success",
            pitches_generated=generated_count,
            message=f"Succesvol {generated_count} pitches gegenereerd",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============ Leads CRUD ============


@router.get("/leads", response_model=LeadsListResponse)
async def get_leads(
    status: Optional[LeadStatus] = None,
    call_status: Optional[CallStatus] = None,
    has_website: Optional[bool] = None,
    has_phone: Optional[bool] = None,
    min_employees: Optional[int] = None,
    max_employees: Optional[int] = None,
    limit: Optional[int] = Query(None, ge=1, le=500),
    offset: int = Query(0, ge=0),
    lead_store: LeadStore = Depends(get_lead_store),
):
    """Get all leads with optional filters."""
    leads = await lead_store.get_leads(
        status=status,
        call_status=call_status,
        has_website=has_website,
        has_phone=has_phone,
        min_employees=min_employees,
        max_employees=max_employees,
        limit=limit,
        offset=offset,
    )

    total = await lead_store.count_leads(status=status)

    return LeadsListResponse(
        leads=[LeadResponse.model_validate(lead) for lead in leads],
        total=total,
    )


@router.get("/leads/{lead_id}", response_model=LeadResponse)
async def get_lead(
    lead_id: str,
    lead_store: LeadStore = Depends(get_lead_store),
):
    """Get a single lead by ID."""
    lead = await lead_store.get_lead(lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead niet gevonden")

    return LeadResponse.model_validate(lead)


@router.patch("/leads/{lead_id}", response_model=LeadResponse)
async def update_lead(
    lead_id: str,
    request: LeadUpdateRequest,
    lead_store: LeadStore = Depends(get_lead_store),
):
    """Update a lead (call status, notes, etc.)."""
    lead = await lead_store.get_lead(lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead niet gevonden")

    update_data = LeadUpdate()

    if request.call_status is not None:
        update_data.call_status = request.call_status

    if request.call_notes is not None:
        update_data.call_notes = request.call_notes

    if request.owner_name is not None:
        update_data.owner_name = request.owner_name

    if request.contact_person is not None:
        update_data.contact_person = request.contact_person

    updated_lead = await lead_store.update_lead(lead_id, update_data)
    return LeadResponse.model_validate(updated_lead)


@router.delete("/leads/{lead_id}")
async def delete_lead(
    lead_id: str,
    lead_store: LeadStore = Depends(get_lead_store),
):
    """Delete a lead."""
    deleted = await lead_store.delete_lead(lead_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Lead niet gevonden")

    return {"status": "success", "message": "Lead verwijderd"}


# ============ Export ============


@router.get("/export/csv")
async def export_csv(
    status: Optional[LeadStatus] = None,
    call_status: Optional[CallStatus] = None,
    lead_store: LeadStore = Depends(get_lead_store),
):
    """Export leads to CSV."""
    leads = await lead_store.get_leads(status=status, call_status=call_status)

    output = io.StringIO()
    writer = csv.writer(output)

    # Header
    writer.writerow([
        "Bedrijfsnaam",
        "Eigenaar",
        "Telefoon",
        "Website",
        "Stad",
        "Adres",
        "Google Rating",
        "Reviews",
        "Diensten",
        "Specialisaties",
        "Medewerkers",
        "Pitch",
        "Bel Status",
        "Notities",
        "Status",
    ])

    # Data rows
    for lead in leads:
        writer.writerow([
            lead.company_name,
            lead.owner_name or "",
            lead.phone or "",
            lead.website or "",
            lead.city,
            lead.address,
            lead.google_rating or "",
            lead.review_count or "",
            ", ".join(lead.services),
            ", ".join(lead.specializations),
            lead.employee_estimate or "",
            lead.pitch or "",
            lead.call_status.value,
            lead.call_notes or "",
            lead.status.value,
        ])

    output.seek(0)

    filename = f"leads_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
