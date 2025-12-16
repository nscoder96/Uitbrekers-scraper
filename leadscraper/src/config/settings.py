from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # API Keys
    apify_token: str = ""
    anthropic_api_key: str = ""

    # Database - use /data for Railway volume persistence
    database_path: str = "/data/leads.db" if Path("/data").exists() else "data/leads.db"

    # Claude settings
    claude_model: str = "claude-3-5-haiku-20241022"
    max_pitch_words: int = 75

    # Scraping defaults
    default_region: str = "Zuid-Holland"
    default_search_term: str = "hovenier"
    default_max_leads: int = 50

    # Rate limiting
    requests_per_second: float = 0.5

    @property
    def db_path(self) -> Path:
        """Get database path as Path object."""
        return Path(self.database_path)


settings = Settings()
