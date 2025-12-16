import { useState, useCallback } from 'react';
import type { ScrapeRequest, ScrapeResponse } from '../types/lead';
import { API_BASE } from '../config';

export function useScrape() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrape = useCallback(async (request: ScrapeRequest): Promise<ScrapeResponse> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Scrape failed');
      }

      return await response.json();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const enrich = useCallback(async (leadIds?: string[]): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/enrich`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_ids: leadIds }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Enrich failed');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const exportCsv = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/export/csv`);
      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leads_export_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    }
  }, []);

  return {
    loading,
    error,
    scrape,
    enrich,
    exportCsv,
  };
}
