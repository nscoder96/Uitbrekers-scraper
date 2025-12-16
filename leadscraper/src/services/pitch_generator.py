from anthropic import Anthropic
from typing import Optional

from ..config import settings, PITCH_PROMPT_TEMPLATE
from ..models import Lead


class PitchGeneratorService:
    """Service for generating personalized pitches using Claude."""

    def __init__(self, api_key: Optional[str] = None):
        self.client = Anthropic(api_key=api_key or settings.anthropic_api_key)
        self.model = settings.claude_model

    async def generate_pitch(self, lead: Lead) -> str:
        """
        Generate a personalized pitch for a lead.

        Args:
            lead: The lead to generate a pitch for

        Returns:
            Generated pitch text
        """
        # Format the prompt with lead data
        prompt = PITCH_PROMPT_TEMPLATE.format(
            company_name=lead.company_name,
            city=lead.city,
            specializations=", ".join(lead.specializations) if lead.specializations else "onbekend",
            services=", ".join(lead.services) if lead.services else "hoveniersdiensten",
            recent_projects=", ".join(lead.recent_projects) if lead.recent_projects else "geen bekend",
            description=lead.description or "geen beschrijving beschikbaar",
        )

        # Call Claude API
        message = self.client.messages.create(
            model=self.model,
            max_tokens=300,
            messages=[
                {"role": "user", "content": prompt}
            ],
        )

        # Extract the text response
        pitch = message.content[0].text.strip()

        # Remove any quotes if present
        if pitch.startswith('"') and pitch.endswith('"'):
            pitch = pitch[1:-1]

        return pitch

    async def generate_pitches_batch(self, leads: list[Lead]) -> dict[str, str]:
        """
        Generate pitches for multiple leads.

        Args:
            leads: List of leads to generate pitches for

        Returns:
            Dictionary mapping lead IDs to generated pitches
        """
        results = {}
        for lead in leads:
            try:
                pitch = await self.generate_pitch(lead)
                results[lead.id] = pitch
            except Exception as e:
                print(f"Error generating pitch for {lead.company_name}: {e}")
                results[lead.id] = None

        return results
