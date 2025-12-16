from apify_client import ApifyClient
from typing import Optional

from ..config import settings
from ..models import LeadCreate


class GoogleMapsService:
    """Service for scraping businesses from Google Maps via Apify."""

    ACTOR_ID = "compass/google-maps-extractor"

    def __init__(self, apify_token: Optional[str] = None):
        self.client = ApifyClient(apify_token or settings.apify_token)

    async def scrape_businesses(
        self,
        search_term: str = "hovenier",
        region: str = "Zuid-Holland, Nederland",
        max_results: int = 50,
    ) -> list[LeadCreate]:
        """
        Scrape businesses from Google Maps.

        Args:
            search_term: What to search for (e.g., "hovenier")
            region: Geographic region to search in
            max_results: Maximum number of results to return

        Returns:
            List of LeadCreate objects ready to be stored
        """
        run_input = {
            "searchStringsArray": [search_term],
            "locationQuery": region,
            "maxCrawledPlacesPerSearch": max_results,
            "language": "nl",
            "deeperCityScrape": False,
            "includeWebResults": False,
        }

        # Run the actor synchronously (blocking)
        run = self.client.actor(self.ACTOR_ID).call(run_input=run_input)

        # Fetch results from the dataset
        leads = []
        for item in self.client.dataset(run["defaultDatasetId"]).iterate_items():
            lead = self._parse_result(item)
            if lead:
                leads.append(lead)

        return leads

    def _parse_result(self, item: dict) -> Optional[LeadCreate]:
        """Parse a Google Maps result into a LeadCreate."""
        try:
            # Extract address components
            address = item.get("address", "")
            city = item.get("city", "")
            postal_code = item.get("postalCode", "")

            # If city is empty, try to extract from address
            if not city and address:
                # Try to parse city from address
                parts = address.split(",")
                if len(parts) >= 2:
                    city = parts[-2].strip()

            return LeadCreate(
                company_name=item.get("title", "Onbekend"),
                address=address,
                city=city,
                postal_code=postal_code,
                phone=item.get("phone"),
                website=item.get("website"),
                google_rating=item.get("totalScore"),
                review_count=item.get("reviewsCount"),
                source="google_maps",
            )
        except Exception as e:
            print(f"Error parsing result: {e}")
            return None

    def get_run_status(self, run_id: str) -> dict:
        """Get the status of a running scrape job."""
        run = self.client.run(run_id).get()
        return {
            "status": run.get("status"),
            "started_at": run.get("startedAt"),
            "finished_at": run.get("finishedAt"),
        }
