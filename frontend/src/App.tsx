import { useState, useEffect, useCallback } from 'react';
import { ScrapeForm } from './components/ScrapeForm';
import { FilterPanel } from './components/FilterPanel';
import { LeadsTable } from './components/LeadsTable';
import { CallMode } from './components/CallMode';
import { Login } from './components/Login';
import { useLeads } from './hooks/useLeads';
import { useScrape } from './hooks/useScrape';
import type { Lead, LeadFilters } from './types/lead';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('isLoggedIn') === 'true';
  });

  const { leads, total, loading: leadsLoading, error: leadsError, fetchLeads, updateLead, generatePitch, generatePitches } = useLeads();
  const { loading: scrapeLoading, error: scrapeError, scrape, enrich, exportCsv } = useScrape();

  const [filters, setFilters] = useState<LeadFilters>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showCallMode, setShowCallMode] = useState(false);
  const [callModeLeads, setCallModeLeads] = useState<Lead[]>([]);

  // Fetch leads on mount and when filters change (must be before any conditional returns!)
  useEffect(() => {
    if (isLoggedIn) {
      fetchLeads(filters);
    }
  }, [fetchLeads, filters, isLoggedIn]);

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    setIsLoggedIn(false);
  };

  // Show login screen if not logged in
  if (!isLoggedIn) {
    return <Login onLogin={() => setIsLoggedIn(true)} />;
  }

  const handleScrape = async (
    searchTerm: string,
    region: string,
    maxLeads: number,
    minEmployees?: number,
    maxEmployees?: number,
    autoEnrich?: boolean
  ) => {
    try {
      await scrape({
        search_term: searchTerm,
        region,
        max_leads: maxLeads,
        min_employees: minEmployees,
        max_employees: maxEmployees,
        auto_enrich: autoEnrich,
      });
      await fetchLeads(filters);
    } catch (err) {
      console.error('Scrape failed:', err);
    }
  };

  const handleEnrich = async () => {
    try {
      await enrich(selectedIds.length > 0 ? selectedIds : undefined);
      await fetchLeads(filters);
    } catch (err) {
      console.error('Enrich failed:', err);
    }
  };

  const handleSelect = useCallback((id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedIds.length === leads.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(leads.map(l => l.id));
    }
  }, [leads, selectedIds.length]);

  const handleGeneratePitches = async () => {
    const ids = selectedIds.length > 0 ? selectedIds : leads.map(l => l.id);
    try {
      await generatePitches(ids);
    } catch (err) {
      console.error('Generate pitches failed:', err);
    }
  };

  const handleStartCallMode = () => {
    // Use selected leads or all leads with pitch
    const leadsToCall = selectedIds.length > 0
      ? leads.filter(l => selectedIds.includes(l.id))
      : leads.filter(l => l.pitch);

    if (leadsToCall.length === 0) {
      alert('Selecteer leads of genereer eerst pitches om te starten met bellen.');
      return;
    }

    setCallModeLeads(leadsToCall);
    setShowCallMode(true);
  };

  const handleViewLead = (lead: Lead) => {
    setCallModeLeads([lead]);
    setShowCallMode(true);
  };

  const loading = leadsLoading || scrapeLoading;
  const error = leadsError || scrapeError;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-primary-700 text-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Uitbrekers.nl</h1>
              <p className="text-primary-200 text-sm">Lead Scraper voor Hoveniers</p>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-lg font-semibold">{total} leads</p>
                <p className="text-primary-200 text-sm">
                  {leads.filter(l => l.pitch).length} met pitch
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 bg-primary-600 hover:bg-primary-500 rounded-md text-sm font-medium transition-colors"
              >
                Uitloggen
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            <strong>Fout:</strong> {error}
          </div>
        )}

        {/* Scrape Form */}
        <ScrapeForm
          onScrape={handleScrape}
          onEnrich={handleEnrich}
          loading={loading}
        />

        {/* Filter Panel */}
        <FilterPanel
          filters={filters}
          onFiltersChange={setFilters}
        />

        {/* Action Bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {selectedIds.length > 0 && (
              <span className="text-sm text-gray-600">
                {selectedIds.length} geselecteerd
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleGeneratePitches}
              disabled={loading}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Genereer Pitches {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}
            </button>
            <button
              onClick={exportCsv}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export CSV
            </button>
            <button
              onClick={handleStartCallMode}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              Start Bellen
            </button>
          </div>
        </div>

        {/* Leads Table */}
        <LeadsTable
          leads={leads}
          selectedIds={selectedIds}
          onSelect={handleSelect}
          onSelectAll={handleSelectAll}
          onViewLead={handleViewLead}
        />

        {/* Loading Overlay */}
        {loading && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-40">
            <div className="bg-white rounded-lg px-8 py-6 flex items-center gap-4 shadow-xl">
              <svg className="animate-spin h-8 w-8 text-primary-600" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="text-lg font-medium text-gray-700">Bezig met laden...</span>
            </div>
          </div>
        )}
      </main>

      {/* Call Mode Modal */}
      {showCallMode && (
        <CallMode
          leads={callModeLeads}
          onClose={() => {
            setShowCallMode(false);
            fetchLeads(filters); // Refresh to get updated leads
          }}
          onUpdateLead={updateLead}
          onGeneratePitch={generatePitch}
        />
      )}
    </div>
  );
}

export default App;
