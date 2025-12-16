// API configuratie
// In development: proxy via vite naar localhost:8000
// In production: gebruik VITE_API_URL environment variable

export const API_BASE = import.meta.env.VITE_API_URL || '/api';
