import type { LeadFilters, LeadStatus, CallStatus } from '../types/lead';

interface FilterPanelProps {
  filters: LeadFilters;
  onFiltersChange: (filters: LeadFilters) => void;
}

export function FilterPanel({ filters, onFiltersChange }: FilterPanelProps) {
  const handleChange = (key: keyof LeadFilters, value: unknown) => {
    onFiltersChange({ ...filters, [key]: value || undefined });
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6">
      <h3 className="text-sm font-medium text-gray-700 mb-3">Filters</h3>
      <div className="flex flex-wrap gap-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Status</label>
          <select
            value={filters.status || ''}
            onChange={(e) => handleChange('status', e.target.value as LeadStatus)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md"
          >
            <option value="">Alle</option>
            <option value="scraped">Gescraped</option>
            <option value="enriched">Verrijkt</option>
            <option value="pitch_ready">Pitch klaar</option>
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Bel Status</label>
          <select
            value={filters.call_status || ''}
            onChange={(e) => handleChange('call_status', e.target.value as CallStatus)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md"
          >
            <option value="">Alle</option>
            <option value="not_called">Niet gebeld</option>
            <option value="called">Gebeld</option>
            <option value="interested">Interesse</option>
            <option value="rejected">Afgewezen</option>
          </select>
        </div>

        <div className="flex items-end gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={filters.has_website === true}
              onChange={(e) => handleChange('has_website', e.target.checked || undefined)}
              className="rounded border-gray-300"
            />
            Heeft website
          </label>
        </div>

        <div className="flex items-end gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={filters.has_phone === true}
              onChange={(e) => handleChange('has_phone', e.target.checked || undefined)}
              className="rounded border-gray-300"
            />
            Heeft telefoon
          </label>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Min medewerkers</label>
          <input
            type="number"
            value={filters.min_employees || ''}
            onChange={(e) => handleChange('min_employees', e.target.value ? Number(e.target.value) : undefined)}
            min={1}
            className="w-20 px-2 py-1.5 text-sm border border-gray-300 rounded-md"
            placeholder="0"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Max medewerkers</label>
          <input
            type="number"
            value={filters.max_employees || ''}
            onChange={(e) => handleChange('max_employees', e.target.value ? Number(e.target.value) : undefined)}
            min={1}
            className="w-20 px-2 py-1.5 text-sm border border-gray-300 rounded-md"
            placeholder="100"
          />
        </div>
      </div>
    </div>
  );
}
