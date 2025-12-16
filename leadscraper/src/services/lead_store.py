import json
import aiosqlite
from pathlib import Path
from datetime import datetime
from typing import Optional

from ..config import settings
from ..models import Lead, LeadCreate, LeadUpdate, LeadStatus, CallStatus


class LeadStore:
    """SQLite-based lead storage."""

    def __init__(self, db_path: Optional[str] = None):
        self.db_path = Path(db_path or settings.database_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)

    async def init_db(self):
        """Initialize the database schema."""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                CREATE TABLE IF NOT EXISTS leads (
                    id TEXT PRIMARY KEY,
                    source TEXT NOT NULL,
                    company_name TEXT NOT NULL,
                    address TEXT NOT NULL,
                    city TEXT NOT NULL,
                    postal_code TEXT,
                    phone TEXT,
                    website TEXT,
                    google_rating REAL,
                    review_count INTEGER,
                    owner_name TEXT,
                    contact_person TEXT,
                    description TEXT,
                    services TEXT,
                    specializations TEXT,
                    recent_projects TEXT,
                    employee_estimate INTEGER,
                    pitch TEXT,
                    pitch_generated_at TEXT,
                    call_status TEXT DEFAULT 'not_called',
                    call_notes TEXT,
                    called_at TEXT,
                    scraped_at TEXT NOT NULL,
                    enriched_at TEXT,
                    status TEXT DEFAULT 'scraped'
                )
            """)
            await db.commit()

    async def create_lead(self, lead_data: LeadCreate) -> Lead:
        """Create a new lead."""
        lead = Lead(
            **lead_data.model_dump(),
            scraped_at=datetime.now(),
        )

        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                """
                INSERT INTO leads (
                    id, source, company_name, address, city, postal_code,
                    phone, website, google_rating, review_count,
                    services, specializations, recent_projects,
                    call_status, scraped_at, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    lead.id,
                    lead.source,
                    lead.company_name,
                    lead.address,
                    lead.city,
                    lead.postal_code,
                    lead.phone,
                    lead.website,
                    lead.google_rating,
                    lead.review_count,
                    json.dumps(lead.services),
                    json.dumps(lead.specializations),
                    json.dumps(lead.recent_projects),
                    lead.call_status.value,
                    lead.scraped_at.isoformat(),
                    lead.status.value,
                ),
            )
            await db.commit()

        return lead

    async def create_leads_batch(self, leads_data: list[LeadCreate]) -> list[Lead]:
        """Create multiple leads in a batch."""
        leads = []
        for data in leads_data:
            lead = await self.create_lead(data)
            leads.append(lead)
        return leads

    async def get_lead(self, lead_id: str) -> Optional[Lead]:
        """Get a lead by ID."""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute("SELECT * FROM leads WHERE id = ?", (lead_id,))
            row = await cursor.fetchone()

            if row is None:
                return None

            return self._row_to_lead(dict(row))

    async def get_leads(
        self,
        status: Optional[LeadStatus] = None,
        call_status: Optional[CallStatus] = None,
        has_website: Optional[bool] = None,
        has_phone: Optional[bool] = None,
        min_employees: Optional[int] = None,
        max_employees: Optional[int] = None,
        limit: Optional[int] = None,
        offset: int = 0,
    ) -> list[Lead]:
        """Get leads with optional filters."""
        query = "SELECT * FROM leads WHERE 1=1"
        params: list = []

        if status:
            query += " AND status = ?"
            params.append(status.value)

        if call_status:
            query += " AND call_status = ?"
            params.append(call_status.value)

        if has_website is True:
            query += " AND website IS NOT NULL AND website != ''"
        elif has_website is False:
            query += " AND (website IS NULL OR website = '')"

        if has_phone is True:
            query += " AND phone IS NOT NULL AND phone != ''"
        elif has_phone is False:
            query += " AND (phone IS NULL OR phone = '')"

        if min_employees is not None:
            query += " AND employee_estimate >= ?"
            params.append(min_employees)

        if max_employees is not None:
            query += " AND employee_estimate <= ?"
            params.append(max_employees)

        query += " ORDER BY scraped_at DESC"

        if limit:
            query += " LIMIT ? OFFSET ?"
            params.extend([limit, offset])

        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute(query, params)
            rows = await cursor.fetchall()

            return [self._row_to_lead(dict(row)) for row in rows]

    async def update_lead(self, lead_id: str, update_data: LeadUpdate) -> Optional[Lead]:
        """Update a lead."""
        updates = []
        params = []

        for field, value in update_data.model_dump(exclude_unset=True).items():
            if value is not None:
                if field in ("services", "specializations", "recent_projects"):
                    updates.append(f"{field} = ?")
                    params.append(json.dumps(value))
                elif field == "call_status":
                    updates.append(f"{field} = ?")
                    params.append(value.value if isinstance(value, CallStatus) else value)
                elif field == "status":
                    updates.append(f"{field} = ?")
                    params.append(value.value if isinstance(value, LeadStatus) else value)
                else:
                    updates.append(f"{field} = ?")
                    params.append(value)

        if not updates:
            return await self.get_lead(lead_id)

        params.append(lead_id)
        query = f"UPDATE leads SET {', '.join(updates)} WHERE id = ?"

        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(query, params)
            await db.commit()

        return await self.get_lead(lead_id)

    async def update_lead_pitch(
        self, lead_id: str, pitch: str
    ) -> Optional[Lead]:
        """Update lead with generated pitch."""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                """
                UPDATE leads
                SET pitch = ?, pitch_generated_at = ?, status = ?
                WHERE id = ?
                """,
                (pitch, datetime.now().isoformat(), LeadStatus.PITCH_READY.value, lead_id),
            )
            await db.commit()

        return await self.get_lead(lead_id)

    async def update_lead_enrichment(
        self,
        lead_id: str,
        description: Optional[str] = None,
        services: Optional[list[str]] = None,
        specializations: Optional[list[str]] = None,
        recent_projects: Optional[list[str]] = None,
        owner_name: Optional[str] = None,
        employee_estimate: Optional[int] = None,
    ) -> Optional[Lead]:
        """Update lead with enrichment data."""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                """
                UPDATE leads
                SET description = ?,
                    services = ?,
                    specializations = ?,
                    recent_projects = ?,
                    owner_name = ?,
                    employee_estimate = ?,
                    enriched_at = ?,
                    status = ?
                WHERE id = ?
                """,
                (
                    description,
                    json.dumps(services or []),
                    json.dumps(specializations or []),
                    json.dumps(recent_projects or []),
                    owner_name,
                    employee_estimate,
                    datetime.now().isoformat(),
                    LeadStatus.ENRICHED.value,
                    lead_id,
                ),
            )
            await db.commit()

        return await self.get_lead(lead_id)

    async def delete_lead(self, lead_id: str) -> bool:
        """Delete a lead."""
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute("DELETE FROM leads WHERE id = ?", (lead_id,))
            await db.commit()
            return cursor.rowcount > 0

    async def count_leads(self, status: Optional[LeadStatus] = None) -> int:
        """Count leads, optionally filtered by status."""
        query = "SELECT COUNT(*) FROM leads"
        params = []

        if status:
            query += " WHERE status = ?"
            params.append(status.value)

        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(query, params)
            row = await cursor.fetchone()
            return row[0] if row else 0

    def _row_to_lead(self, row: dict) -> Lead:
        """Convert a database row to a Lead model."""
        return Lead(
            id=row["id"],
            source=row["source"],
            company_name=row["company_name"],
            address=row["address"],
            city=row["city"],
            postal_code=row["postal_code"] or "",
            phone=row["phone"],
            website=row["website"],
            google_rating=row["google_rating"],
            review_count=row["review_count"],
            owner_name=row["owner_name"],
            contact_person=row["contact_person"],
            description=row["description"],
            services=json.loads(row["services"]) if row["services"] else [],
            specializations=json.loads(row["specializations"]) if row["specializations"] else [],
            recent_projects=json.loads(row["recent_projects"]) if row["recent_projects"] else [],
            employee_estimate=row["employee_estimate"],
            pitch=row["pitch"],
            pitch_generated_at=(
                datetime.fromisoformat(row["pitch_generated_at"])
                if row["pitch_generated_at"]
                else None
            ),
            call_status=CallStatus(row["call_status"]) if row["call_status"] else CallStatus.NOT_CALLED,
            call_notes=row["call_notes"],
            called_at=(
                datetime.fromisoformat(row["called_at"]) if row["called_at"] else None
            ),
            scraped_at=datetime.fromisoformat(row["scraped_at"]),
            enriched_at=(
                datetime.fromisoformat(row["enriched_at"]) if row["enriched_at"] else None
            ),
            status=LeadStatus(row["status"]) if row["status"] else LeadStatus.SCRAPED,
        )
