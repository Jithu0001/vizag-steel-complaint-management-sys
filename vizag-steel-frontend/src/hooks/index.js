import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { complaintService } from '../services/services';
import { onSocketEvent } from '../services/socket';

// ── useComplaints: paginated complaint list with real-time updates ─────────────
export const useComplaints = (initialFilters = {}) => {
  const [filters, setFilters] = useState({ page: 1, limit: 20, ...initialFilters });
  const qc = useQueryClient();

  const query = useQuery(['complaints', filters], () => complaintService.getAll(filters), {
    keepPreviousData: true, staleTime: 30000,
  });

  // Invalidate on real-time complaint events
  useEffect(() => {
    const cleanups = [
      onSocketEvent('complaint:new', () => qc.invalidateQueries('complaints')),
      onSocketEvent('status:changed', () => qc.invalidateQueries('complaints')),
    ];
    return () => cleanups.forEach((fn) => fn?.());
  }, [qc]);

  const updateFilter = useCallback((updates) => {
    setFilters((f) => ({ ...f, ...updates, page: 1 }));
  }, []);

  return {
    complaints: query.data?.data?.data?.complaints || [],
    pagination: query.data?.data?.data?.pagination || {},
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    filters,
    setFilters: updateFilter,
    setPage: (page) => setFilters((f) => ({ ...f, page })),
    refetch: query.refetch,
  };
};

// ── useGeolocation: get GPS coordinates ───────────────────────────────────────
export const useGeolocation = () => {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getLocation = useCallback(() => {
    if (!navigator.geolocation) { setError('Geolocation not supported'); return; }
    setLoading(true); setError(null);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocation({ latitude: coords.latitude, longitude: coords.longitude, accuracy: Math.round(coords.accuracy) });
        setLoading(false);
      },
      (err) => { setError(err.message); setLoading(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  return { location, loading, error, getLocation, clear: () => setLocation(null) };
};

// ── useSocketEvent: subscribe to a socket event ───────────────────────────────
export const useSocketEvent = (event, handler, deps = []) => {
  useEffect(() => {
    const cleanup = onSocketEvent(event, handler);
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, ...deps]);
};

// ── useDebounce ───────────────────────────────────────────────────────────────
export const useDebounce = (value, delay = 300) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
};
