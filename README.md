# Uitbrekers.nl Lead Scraper

Tool voor het scrapen van hoveniersbedrijven en genereren van gepersonaliseerde pitches.

## Vereisten

- Python 3.11+
- Node.js 18+
- Apify account (voor Google Maps + Website Crawler)
- Anthropic API key (voor Claude)

## Installatie

### 1. Backend setup

```bash
cd leadscraper

# Maak virtual environment
python -m venv venv
source venv/bin/activate  # Op Windows: venv\Scripts\activate

# Installeer dependencies
pip install -e .

# Kopieer en configureer environment variables
cp .env.example .env
# Vul je API keys in .env
```

### 2. Frontend setup

```bash
cd frontend

# Installeer dependencies
npm install
```

### 3. API Keys instellen

Bewerk `leadscraper/.env`:

```
APIFY_TOKEN=je_apify_token_hier
ANTHROPIC_API_KEY=je_anthropic_api_key_hier
```

**API keys aanmaken:**
- Apify: https://console.apify.com/sign-up
- Anthropic: https://console.anthropic.com/

## Starten

### Terminal 1: Backend

```bash
cd leadscraper
source venv/bin/activate
uvicorn src.main:app --reload --port 8000
```

### Terminal 2: Frontend

```bash
cd frontend
npm run dev
```

Open http://localhost:5173 in je browser.

## Gebruik

1. **Scrapen**: Klik "Start Scrapen" om hoveniers uit Zuid-Holland op te halen
2. **Verrijken**: Klik "Verrijk Leads" om website data te verzamelen
3. **Pitches**: Selecteer leads en klik "Genereer Pitches"
4. **Bellen**: Klik "Start Bellen" voor de carousel-weergave

## Kosten

Per 50 leads:
- Google Maps scrape: ~$0.35
- Website crawl: ~$0.50
- Claude pitches: ~$0.05
- **Totaal: ~$0.90**

## Structuur

```
Uitbrekers.nl/
├── leadscraper/          # Python backend (FastAPI)
│   ├── src/
│   │   ├── api/          # API routes
│   │   ├── services/     # Business logic
│   │   ├── models/       # Data models
│   │   └── config/       # Settings & prompts
│   └── data/             # SQLite database
│
└── frontend/             # React frontend
    └── src/
        ├── components/   # UI components
        ├── hooks/        # React hooks
        └── types/        # TypeScript types
```
