import { useState } from 'react';

interface ScrapeFormProps {
  onScrape: (searchTerm: string, region: string, maxLeads: number, minEmployees?: number, maxEmployees?: number, autoEnrich?: boolean) => Promise<void>;
  onEnrich: () => Promise<void>;
  loading: boolean;
}

export function ScrapeForm({ onScrape, onEnrich, loading }: ScrapeFormProps) {
  const [searchTerm, setSearchTerm] = useState('hovenier');
  const [region, setRegion] = useState('Zuid-Holland, Nederland');
  const [maxLeads, setMaxLeads] = useState(50);
  const [minEmployees, setMinEmployees] = useState<number | ''>('');
  const [maxEmployees, setMaxEmployees] = useState<number | ''>('');
  const [autoEnrich, setAutoEnrich] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onScrape(
      searchTerm,
      region,
      maxLeads,
      minEmployees || undefined,
      maxEmployees || undefined,
      autoEnrich
    );
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h2 className="text-lg font-semibold mb-4">Scrape Configuratie</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Zoekterm
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              placeholder="hovenier"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Regio
            </label>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="Zuid-Holland, Nederland">Zuid-Holland</option>
              <option value="Noord-Holland, Nederland">Noord-Holland</option>
              <option value="Utrecht, Nederland">Utrecht</option>
              <option value="Noord-Brabant, Nederland">Noord-Brabant</option>
              <option value="Gelderland, Nederland">Gelderland</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max leads
            </label>
            <input
              type="number"
              value={maxLeads}
              onChange={(e) => setMaxLeads(Number(e.target.value))}
              min={1}
              max={200}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Min medewerkers
            </label>
            <input
              type="number"
              value={minEmployees}
              onChange={(e) => setMinEmployees(e.target.value ? Number(e.target.value) : '')}
              min={1}
              placeholder="Geen min"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max medewerkers
            </label>
            <input
              type="number"
              value={maxEmployees}
              onChange={(e) => setMaxEmployees(e.target.value ? Number(e.target.value) : '')}
              min={1}
              placeholder="Geen max"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div className="md:col-span-2 flex items-end">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={autoEnrich}
                onChange={(e) => setAutoEnrich(e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-gray-700">
                Auto-verrijken (website data ophalen voor medewerker filter)
              </span>
            </label>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Scrapen...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Start Scrapen
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onEnrich}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Verrijk Leads
          </button>
        </div>
      </form>
    </div>
  );
}
