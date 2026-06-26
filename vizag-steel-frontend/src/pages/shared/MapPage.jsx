import React, { useEffect, useRef } from 'react';
import { useQuery } from 'react-query';
import { MapPin } from 'lucide-react';
import { complaintService } from '../../services/services';
import { Card, Spinner } from '../../components/common/UI';

const PRIORITY_COLOR = { low: '#10B981', medium: '#F59E0B', high: '#F97316', critical: '#EF4444' };
const STATUS_COLOR = { pending: '#94A3B8', in_progress: '#F59E0B', resolved: '#10B981', escalated: '#EF4444' };

export default function MapPage() {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);

  const { data, isLoading } = useQuery('heatmap', () => complaintService.getHeatmap({}), { staleTime: 120000 });
  const points = data?.data?.data?.points || [];

  const { data: nearby } = useQuery(
    'nearby',
    () => complaintService.getNearby({ longitude: 83.2185, latitude: 17.6868, radius: 2000 }),
    { staleTime: 60000 }
  );
  const nearbyComplaints = nearby?.data?.data?.complaints || [];

  useEffect(() => {
    if (!mapRef.current || mapInstance.current || typeof window === 'undefined') return;

    // Leaflet is loaded via CDN in index.html
    const L = window.L;
    if (!L) return;

    // Center on Vizag Steel Plant
    const map = L.map(mapRef.current).setView([17.6868, 83.2185], 14);
    mapInstance.current = map;

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '©OpenStreetMap ©CartoDB',
      maxZoom: 19,
    }).addTo(map);

    return () => { map.remove(); mapInstance.current = null; };
  }, []);

  useEffect(() => {
    const L = window.L;
    if (!mapInstance.current || !L || !points.length) return;

    points.forEach(({ lat, lng, priority, status, category }) => {
      const color = PRIORITY_COLOR[priority] || '#3B82F6';
      L.circleMarker([lat, lng], {
        radius: 8, fillColor: color, color: '#fff', weight: 1, opacity: 0.9, fillOpacity: 0.7,
      })
        .bindPopup(`<strong>${category}</strong><br>Status: ${status}<br>Priority: ${priority}`)
        .addTo(mapInstance.current);
    });
  }, [points]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '4px' }}>Complaint Map</h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px' }}>
          {points.length} complaint locations plotted · Color = priority
        </p>
      </div>

      {/* Legend */}
      <Card style={{ padding: '12px 20px' }}>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: 600 }}>PRIORITY:</span>
          {Object.entries(PRIORITY_COLOR).map(([k, v]) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: v }} />
              <span style={{ color: 'var(--color-text-secondary)', textTransform: 'capitalize' }}>{k}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Map */}
      <Card style={{ padding: 0, overflow: 'hidden', height: '500px' }}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Spinner size={32} />
          </div>
        ) : (
          <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
        )}
      </Card>

      {/* Nearby list */}
      {nearbyComplaints.length > 0 && (
        <Card>
          <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '14px' }}>
            <MapPin size={15} style={{ marginRight: '6px' }} />Nearby Complaints (2km radius)
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {nearbyComplaints.slice(0, 5).map((c) => (
              <div key={c._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: 'var(--color-bg-elevated)', borderRadius: 'var(--radius-md)', fontSize: '13px' }}>
                <div>
                  <span style={{ fontWeight: 500 }}>{c.title}</span>
                  <span style={{ color: 'var(--color-text-muted)', marginLeft: '8px', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>{c.complaintNumber}</span>
                </div>
                <span style={{ color: `var(--priority-${c.priority})`, fontWeight: 600, fontSize: '12px' }}>{c.priority?.toUpperCase()}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
