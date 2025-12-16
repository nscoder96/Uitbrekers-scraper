import re
from apify_client import ApifyClient
from typing import Optional

from ..config import settings


class WebsiteCrawlerService:
    """Service for crawling website content via Apify."""

    ACTOR_ID = "apify/website-content-crawler"

    def __init__(self, apify_token: Optional[str] = None):
        self.client = ApifyClient(apify_token or settings.apify_token)

    async def crawl_website(self, url: str, max_pages: int = 5) -> dict:
        """
        Crawl a website to extract relevant content.

        Args:
            url: The website URL to crawl
            max_pages: Maximum number of pages to crawl

        Returns:
            Dictionary with extracted content
        """
        if not url:
            return {}

        # Normalize URL
        if not url.startswith(("http://", "https://")):
            url = f"https://{url}"

        run_input = {
            "startUrls": [{"url": url}],
            "maxCrawlPages": max_pages,
            "crawlerType": "playwright:firefox",
            "includeUrlGlobs": [],
            "excludeUrlGlobs": [],
            "keepUrlFragments": False,
            "removeElementsCssSelector": "nav, header, footer, .cookie-banner, .popup",
            "htmlTransformer": "readableText",
            "readableTextCharThreshold": 100,
            "saveHtml": False,
            "saveMarkdown": True,
            "saveScreenshots": False,
        }

        try:
            run = self.client.actor(self.ACTOR_ID).call(run_input=run_input)

            # Collect all page content
            all_content = []
            for item in self.client.dataset(run["defaultDatasetId"]).iterate_items():
                if item.get("markdown"):
                    all_content.append(item["markdown"])
                elif item.get("text"):
                    all_content.append(item["text"])

            combined_content = "\n\n".join(all_content)

            return self._extract_business_info(combined_content)

        except Exception as e:
            print(f"Error crawling {url}: {e}")
            return {}

    def _extract_business_info(self, content: str) -> dict:
        """Extract business information from crawled content."""
        if not content:
            return {}

        content_lower = content.lower()

        # Extract description (first meaningful paragraph)
        description = self._extract_description(content)

        # Extract services
        services = self._extract_services(content_lower)

        # Extract specializations
        specializations = self._extract_specializations(content_lower)

        # Extract recent projects
        recent_projects = self._extract_projects(content)

        # Try to find owner/contact name
        owner_name = self._extract_owner_name(content)

        # Estimate employee count
        employee_estimate = self._estimate_employees(content_lower)

        return {
            "description": description,
            "services": services,
            "specializations": specializations,
            "recent_projects": recent_projects,
            "owner_name": owner_name,
            "employee_estimate": employee_estimate,
        }

    def _extract_description(self, content: str) -> Optional[str]:
        """Extract a business description."""
        # Look for common about sections
        patterns = [
            r"over ons[:\s]*(.{50,300})",
            r"wie zijn wij[:\s]*(.{50,300})",
            r"welkom[:\s]*(.{50,300})",
        ]

        for pattern in patterns:
            match = re.search(pattern, content, re.IGNORECASE)
            if match:
                desc = match.group(1).strip()
                # Clean up
                desc = re.sub(r"\s+", " ", desc)
                return desc[:500] if len(desc) > 500 else desc

        # Fallback: take first substantial paragraph
        paragraphs = content.split("\n\n")
        for para in paragraphs:
            if len(para) > 100 and not para.startswith("#"):
                clean = re.sub(r"\s+", " ", para.strip())
                return clean[:500] if len(clean) > 500 else clean

        return None

    def _extract_services(self, content: str) -> list[str]:
        """Extract services offered."""
        services = []
        service_keywords = [
            "tuinaanleg",
            "tuinonderhoud",
            "snoeien",
            "grasmaaien",
            "bestrating",
            "vijveraanleg",
            "beplanting",
            "schutting",
            "terras",
            "gazon",
            "haag",
            "heggen",
            "bomen",
            "struiken",
            "groenonderhoud",
            "tuinontwerp",
            "tuinrenovatie",
            "sierbestrating",
            "drainage",
            "beregening",
        ]

        for keyword in service_keywords:
            if keyword in content:
                services.append(keyword)

        return services[:10]  # Limit to 10 services

    def _extract_specializations(self, content: str) -> list[str]:
        """Extract specializations."""
        specializations = []
        spec_keywords = [
            ("moderne tuinen", "moderne tuinen"),
            ("klassieke tuinen", "klassieke tuinen"),
            ("kleine tuinen", "kleine tuinen"),
            ("grote tuinen", "grote tuinen"),
            ("duurzaam", "duurzaam"),
            ("ecologisch", "ecologisch"),
            ("onderhoudsvri", "onderhoudsvrij"),
            ("kindvriendel", "kindvriendelijk"),
            ("zakelijk", "zakelijke tuinen"),
            ("particulier", "particuliere tuinen"),
            ("natuurlijk", "natuurlijke tuinen"),
        ]

        for keyword, label in spec_keywords:
            if keyword in content:
                specializations.append(label)

        return specializations[:5]

    def _extract_projects(self, content: str) -> list[str]:
        """Extract recent project mentions."""
        projects = []

        # Look for project patterns
        patterns = [
            r"project[:\s]+([^.\n]{20,100})",
            r"realisatie[:\s]+([^.\n]{20,100})",
            r"uitgevoerd[:\s]+([^.\n]{20,100})",
        ]

        for pattern in patterns:
            matches = re.findall(pattern, content, re.IGNORECASE)
            for match in matches[:3]:
                clean = re.sub(r"\s+", " ", match.strip())
                if clean and clean not in projects:
                    projects.append(clean)

        return projects[:5]

    def _extract_owner_name(self, content: str) -> Optional[str]:
        """Try to extract owner or contact name."""
        # Common patterns for owner names
        patterns = [
            r"eigenaar[:\s]+([A-Z][a-z]+ (?:van (?:de |den |der )?)?[A-Z][a-z]+)",
            r"contact[:\s]+([A-Z][a-z]+ (?:van (?:de |den |der )?)?[A-Z][a-z]+)",
            r"(?:door|bij) ([A-Z][a-z]+ (?:van (?:de |den |der )?)?[A-Z][a-z]+)",
        ]

        for pattern in patterns:
            match = re.search(pattern, content)
            if match:
                return match.group(1)

        return None

    def _estimate_employees(self, content: str) -> Optional[int]:
        """Estimate number of employees from content."""
        # Look for team size mentions
        patterns = [
            r"(\d+)\s*(?:medewerkers|werknemers|vakmensen|collega)",
            r"team\s*(?:van|met)\s*(\d+)",
            r"(\d+)\s*man\s*(?:sterk|team)",
        ]

        for pattern in patterns:
            match = re.search(pattern, content)
            if match:
                try:
                    return int(match.group(1))
                except ValueError:
                    pass

        # Check for indicators
        if "eenmanszaak" in content or "zzp" in content:
            return 1
        if "klein team" in content:
            return 3
        if "groot team" in content:
            return 10

        return None
