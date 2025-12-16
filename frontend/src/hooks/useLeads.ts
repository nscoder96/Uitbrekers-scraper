import { useState, useCallback } from 'react';
import type { Lead, LeadsResponse, LeadFilters, CallStatus } from '../types/lead';

const API_BASE = '/api';

export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLeads = useCallback(async (filters?: LeadFilters) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filters?.status) params.set('status', filters.status);
      if (filters?.call_status) params.set('call_status', filters.call_status);
      if (filters?.has_website !== undefined) params.set('has_website', String(filters.has_website));
      if (filters?.has_phone !== undefined) params.set('has_phone', String(filters.has_phone));
      if (filters?.min_employees) params.set('min_employees', String(filters.min_employees));
      if (filters?.max_employees) params.set('max_employees', String(filters.max_employees));

      const response = await fetch(`${API_BASE}/leads?${params}`);
      if (!response.ok) throw new Error('Failed to fetch leads');

      const data: LeadsResponse = await response.json();
      setLeads(data.leads);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const updateLead = useCallback(async (
    leadId: string,
    updates: { call_status?: CallStatus; call_notes?: string; owner_name?: string }
  ) => {
    try {
      const response = await fetch(`${API_BASE}/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) throw new Error('Failed to update lead');

      const updatedLead: Lead = await response.json();
      setLeads(prev => prev.map(l => l.id === leadId ? updatedLead : l));
      return updatedLead;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  }, []);

  const deleteLead = useCallback(async (leadId: string) => {
    try {
      const response = await fetch(`${API_BASE}/leads/${leadId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete lead');

      setLeads(prev => prev.filter(l => l.id !== leadId));
      setTotal(prev => prev - 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  }, []);

  const generatePitch = useCallback(async (leadId: string) => {
    try {
      const response = await fetch(`${API_BASE}/generate-pitch/${leadId}`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to generate pitch');

      const updatedLead: Lead = await response.json();
      setLeads(prev => prev.map(l => l.id === leadId ? updatedLead : l));
      return updatedLead;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  }, []);

  const generatePitches = useCallback(async (leadIds: string[]) => {
    try {
      const response = await fetch(`${API_BASE}/generate-pitches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_ids: leadIds }),
      });

      if (!response.ok) throw new Error('Failed to generate pitches');

      // Refresh leads to get updated pitches
      await fetchLeads();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  }, [fetchLeads]);

  return {
    leads,
    total,
    loading,
    error,
    fetchLeads,
    updateLead,
    deleteLead,
    generatePitch,
    generatePitches,
  };
}
