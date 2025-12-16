import { useState, useEffect, useRef } from 'react';
import type { Lead, CallStatus } from '../types/lead';

interface CallModeProps {
  leads: Lead[];
  onClose: () => void;
  onUpdateLead: (leadId: string, updates: { call_status?: CallStatus; call_notes?: string }) => Promise<Lead>;
  onGeneratePitch: (leadId: string) => Promise<Lead>;
}

const callStatusOptions: { value: CallStatus; label: string; color: string }[] = [
  { value: 'not_called', label: 'Niet gebeld', color: 'bg-gray-200' },
  { value: 'called', label: 'Gebeld', color: 'bg-yellow-200' },
  { value: 'interested', label: 'Interesse', color: 'bg-green-200' },
  { value: 'rejected', label: 'Afgewezen', color: 'bg-red-200' },
];

export function CallMode({ leads, onClose, onUpdateLead, onGeneratePitch }: CallModeProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [notes, setNotes] = useState('');
  const [generatingPitch, setGeneratingPitch] = useState(false);
  const [copied, setCopied] = useState(false);
  const [localLeads, setLocalLeads] = useState<Lead[]>(leads);

  const notesRef = useRef(notes);
  notesRef.current = notes;

  const currentLead = localLeads[currentIndex];

  useEffect(() => {
    if (currentLead) {
      setNotes(currentLead.call_notes || '');
    }
  }, [currentIndex, currentLead?.id]);

  const saveNotes = async () => {
    if (currentLead && notesRef.current !== currentLead.call_notes) {
      try {
        const updated = await onUpdateLead(currentLead.id, { call_notes: notesRef.current });
        setLocalLeads(prev => prev.map(l => l.id === updated.id ? updated : l));
      } catch (e) {
        console.error('Failed to save notes:', e);
      }
    }
  };

  const goToPrevious = async () => {
    if (currentIndex > 0) {
      await saveNotes();
      setCurrentIndex(prev => prev - 1);
    }
  };

  const goToNext = async () => {
    if (currentIndex < localLeads.length - 1) {
      await saveNotes();
      setCurrentIndex(prev => prev + 1);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't navigate if typing in textarea
      if (e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goToPrevious();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goToNext();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, localLeads.length, onClose]);

  const handleStatusChange = async (status: CallStatus) => {
    if (currentLead) {
      try {
        const updated = await onUpdateLead(currentLead.id, { call_status: status });
        setLocalLeads(prev => prev.map(l => l.id === updated.id ? updated : l));
      } catch (e) {
        console.error('Failed to update status:', e);
      }
    }
  };

  const handleGeneratePitch = async () => {
    if (currentLead) {
      setGeneratingPitch(true);
      try {
        const updated = await onGeneratePitch(currentLead.id);
        setLocalLeads(prev => prev.map(l => l.id === updated.id ? updated : l));
      } catch (e) {
        console.error('Failed to generate pitch:', e);
      } finally {
        setGeneratingPitch(false);
      }
    }
  };

  const copyPitch = () => {
    if (currentLead?.pitch) {
      navigator.clipboard.writeText(currentLead.pitch);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!currentLead) {
    return (
      <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 text-center">
          <p className="text-gray-600 mb-4">Geen leads geselecteerd voor bellen.</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            Sluiten
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-primary-600 text-white px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Bel-modus</h2>
          <div className="flex items-center gap-4">
            <span className="text-primary-200">
              Lead {currentIndex + 1} van {leads.length}
            </span>
            <button
              onClick={onClose}
              className="text-white hover:text-primary-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Company Info */}
          <div className="mb-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">
                  {currentLead.company_name}
                </h3>
                {currentLead.address && (
                  <p className="text-gray-500 text-sm mt-1">
                    {currentLead.address}, {currentLead.postal_code} {currentLead.city}
                  </p>
                )}
              </div>
              {/* Google Rating & Employee Count */}
              <div className="flex items-center gap-4">
                {currentLead.google_rating && (
                  <div className="text-center">
                    <div className="flex items-center gap-1 text-yellow-500">
                      <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <span className="font-bold text-gray-900">{currentLead.google_rating.toFixed(1)}</span>
                    </div>
                    {currentLead.review_count && (
                      <span className="text-xs text-gray-500">{currentLead.review_count} reviews</span>
                    )}
                  </div>
                )}
                {currentLead.employee_estimate && (
                  <div className="text-center px-3 py-1 bg-blue-50 rounded-lg">
                    <div className="font-bold text-blue-700">{currentLead.employee_estimate}</div>
                    <span className="text-xs text-blue-600">medewerkers</span>
                  </div>
                )}
              </div>
            </div>

            {/* Contact Info Grid */}
            <div className="grid grid-cols-2 gap-3 text-sm bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="font-medium text-gray-600">Eigenaar:</span>
                <span className="text-gray-900">{currentLead.owner_name || 'Onbekend'}</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span className="font-medium text-gray-600">Telefoon:</span>
                {currentLead.phone ? (
                  <a href={`tel:${currentLead.phone}`} className="text-primary-600 hover:text-primary-800 font-semibold text-lg">
                    {currentLead.phone}
                  </a>
                ) : (
                  <span className="text-gray-400">Niet beschikbaar</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
                <span className="font-medium text-gray-600">Website:</span>
                {currentLead.website ? (
                  <a href={currentLead.website.startsWith('http') ? currentLead.website : `https://${currentLead.website}`} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-800 truncate">
                    {currentLead.website.replace(/^https?:\/\//, '')}
                  </a>
                ) : (
                  <span className="text-gray-400">Niet beschikbaar</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="font-medium text-gray-600">Plaats:</span>
                <span className="text-gray-900">{currentLead.city}</span>
              </div>
            </div>

            {/* Description */}
            {currentLead.description && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-700 italic">"{currentLead.description}"</p>
              </div>
            )}

            {/* Services & Specializations */}
            {(currentLead.services.length > 0 || currentLead.specializations.length > 0) && (
              <div className="mt-4">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Diensten & Specialisaties</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {currentLead.specializations.map((spec, i) => (
                    <span key={`spec-${i}`} className="px-2 py-1 bg-primary-100 text-primary-800 text-xs rounded-full font-medium">
                      {spec}
                    </span>
                  ))}
                  {currentLead.services.slice(0, 6).map((service, i) => (
                    <span key={`svc-${i}`} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                      {service}
                    </span>
                  ))}
                  {currentLead.services.length > 6 && (
                    <span className="px-2 py-1 text-gray-500 text-xs">
                      +{currentLead.services.length - 6} meer
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Pitch Section */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-gray-900">Pitch</h4>
              <div className="flex gap-2">
                {currentLead.pitch && (
                  <button
                    onClick={copyPitch}
                    className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-1"
                  >
                    {copied ? (
                      <>
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Gekopieerd!
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                        </svg>
                        Kopieer
                      </>
                    )}
                  </button>
                )}
                <button
                  onClick={handleGeneratePitch}
                  disabled={generatingPitch}
                  className="px-3 py-1 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 flex items-center gap-1"
                >
                  {generatingPitch ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Genereren...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      {currentLead.pitch ? 'Regenereer' : 'Genereer Pitch'}
                    </>
                  )}
                </button>
              </div>
            </div>
            {currentLead.pitch ? (
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {currentLead.pitch}
              </p>
            ) : (
              <p className="text-gray-400 italic">
                Nog geen pitch gegenereerd. Klik op "Genereer Pitch" om een gepersonaliseerde pitch te maken.
              </p>
            )}
          </div>

          {/* Notes */}
          <div className="mb-6">
            <label className="block font-semibold text-gray-900 mb-2">Notities</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={saveNotes}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              placeholder="Notities van het gesprek..."
            />
          </div>

          {/* Call Status */}
          <div>
            <label className="block font-semibold text-gray-900 mb-2">Status</label>
            <div className="flex gap-2">
              {callStatusOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleStatusChange(option.value)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    currentLead.call_status === option.value
                      ? `${option.color} ring-2 ring-offset-2 ring-primary-500`
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Navigation Footer */}
        <div className="border-t px-6 py-4 flex items-center justify-between bg-gray-50">
          <button
            onClick={goToPrevious}
            disabled={currentIndex === 0}
            className="px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Vorige
          </button>

          <span className="text-sm text-gray-500">
            Gebruik ← → toetsen om te navigeren
          </span>

          <button
            onClick={goToNext}
            disabled={currentIndex === leads.length - 1}
            className="px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            Volgende
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
