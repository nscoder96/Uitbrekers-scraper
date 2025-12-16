import type { Lead } from '../types/lead';

interface LeadsTableProps {
  leads: Lead[];
  selectedIds: string[];
  onSelect: (id: string) => void;
  onSelectAll: () => void;
  onViewLead: (lead: Lead) => void;
}

const statusLabels: Record<string, { label: string; color: string }> = {
  scraped: { label: 'Gescraped', color: 'bg-gray-100 text-gray-800' },
  enriched: { label: 'Verrijkt', color: 'bg-blue-100 text-blue-800' },
  pitch_ready: { label: 'Pitch klaar', color: 'bg-green-100 text-green-800' },
};

const callStatusLabels: Record<string, { label: string; color: string }> = {
  not_called: { label: 'Niet gebeld', color: 'bg-gray-100 text-gray-600' },
  called: { label: 'Gebeld', color: 'bg-yellow-100 text-yellow-800' },
  interested: { label: 'Interesse', color: 'bg-green-100 text-green-800' },
  rejected: { label: 'Afgewezen', color: 'bg-red-100 text-red-800' },
};

export function LeadsTable({ leads, selectedIds, onSelect, onSelectAll, onViewLead }: LeadsTableProps) {
  const allSelected = leads.length > 0 && selectedIds.length === leads.length;

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 w-12">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onSelectAll}
                  className="rounded border-gray-300"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Bedrijf
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Plaats
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Telefoon
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rating
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Bel Status
              </th>
              <th className="px-4 py-3 w-20"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {leads.map((lead) => {
              const status = statusLabels[lead.status];
              const callStatus = callStatusLabels[lead.call_status];

              return (
                <tr
                  key={lead.id}
                  className={`hover:bg-gray-50 cursor-pointer ${selectedIds.includes(lead.id) ? 'bg-primary-50' : ''}`}
                  onClick={() => onViewLead(lead)}
                >
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(lead.id)}
                      onChange={() => onSelect(lead.id)}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{lead.company_name}</div>
                    {lead.owner_name && (
                      <div className="text-sm text-gray-500">{lead.owner_name}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{lead.city}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {lead.phone ? (
                      <a
                        href={`tel:${lead.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-primary-600 hover:text-primary-800"
                      >
                        {lead.phone}
                      </a>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {lead.google_rating ? (
                      <div className="flex items-center gap-1">
                        <span className="text-yellow-500">★</span>
                        <span>{lead.google_rating.toFixed(1)}</span>
                        {lead.review_count && (
                          <span className="text-gray-400">({lead.review_count})</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${status.color}`}>
                      {status.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${callStatus.color}`}>
                      {callStatus.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {lead.pitch && (
                      <span className="text-green-600" title="Pitch beschikbaar">
                        ✓
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {leads.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          Geen leads gevonden. Start een scrape om leads te verzamelen.
        </div>
      )}
    </div>
  );
}
