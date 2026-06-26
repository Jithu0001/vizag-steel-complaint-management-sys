
import React, { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { MapPin, Upload, X, RefreshCw } from 'lucide-react';
import { complaintService } from '../../services/services';
import { Button, Input, Select, Card } from '../../components/common/UI';
import { toast } from 'react-toastify';

const CATEGORIES = [
  { value: 'ELECTRICAL',   label: '⚡ Electrical'    },
  { value: 'SAFETY',       label: '🦺 Safety'         },
  { value: 'CIVIL',        label: '🏗️ Civil'          },
  { value: 'MECHANICAL',   label: '⚙️ Mechanical'     },
  { value: 'ENVIRONMENTAL',label: '🌿 Environmental'  },
  { value: 'HOUSEKEEPING', label: '🧹 Housekeeping'   },
  { value: 'IT',           label: '💻 IT'             },
  { value: 'OTHER',        label: '📌 Other'          },
];

export default function NewComplaintPage() {
  const navigate = useNavigate();
  const [form, setForm]         = useState({ title: '', description: '', category: 'ELECTRICAL', zone: '', building: '' });
  const [photos, setPhotos]     = useState([]);
  const [location, setLocation] = useState(null);
  const [locLoading, setLocLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const watchIdRef = useRef(null);   // ← track watchPosition handle

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  /* ── Dropzone ─────────────────────────────────────────────────────── */
  const onDrop = useCallback((accepted) => {
    const newFiles   = accepted.slice(0, 5 - photos.length);
    const withPreview = newFiles.map((f) => Object.assign(f, { preview: URL.createObjectURL(f) }));
    setPhotos((p) => [...p, ...withPreview].slice(0, 5));
  }, [photos.length]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'image/*': [] }, maxFiles: 5, maxSize: 10 * 1024 * 1024,
  });

  /* ── GPS — accurate location capture ─────────────────────────────── */
  const stopWatch = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  };

  const getLocation = () => {
  if (!navigator.geolocation) {
    toast.error('Geolocation is not supported by your browser.');
    return;
  }

  setLocLoading(true);
  setLocation(null);
  stopWatch();

  const ACCURACY_THRESHOLD = 50; // ← raised from 25 m; 25 is too tight indoors
  const MAX_WAIT_MS        = 15000;
  let bestSoFar            = null;
  let timeoutHandle        = null;

  const done = (pos) => {
    stopWatch();
    clearTimeout(timeoutHandle);
    setLocation({
      latitude:  pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy:  Math.round(pos.coords.accuracy),
    });
    setLocLoading(false);
    toast.success(`Location captured — ±${Math.round(pos.coords.accuracy)} m accuracy`);
  };

  const onSuccess = (pos) => {
    if (!bestSoFar || pos.coords.accuracy < bestSoFar.coords.accuracy) {
      bestSoFar = pos;
    }
    if (pos.coords.accuracy <= ACCURACY_THRESHOLD) {
      done(pos);
    }
  };

  const onError = (err) => {
    // ── Fix 2 (root cause) ───────────────────────────────────────────
    // TIMEOUT (code 3) fires on each individual watchPosition tick that
    // exceeds `timeout`, NOT on the overall wait. Returning here lets the
    // watch keep running; the hard cap (setTimeout below) owns the deadline.
    if (err.code === 3) return;
    // ─────────────────────────────────────────────────────────────────

    stopWatch();
    clearTimeout(timeoutHandle);
    setLocLoading(false);

    if (bestSoFar) {
      setLocation({
        latitude:  bestSoFar.coords.latitude,
        longitude: bestSoFar.coords.longitude,
        accuracy:  Math.round(bestSoFar.coords.accuracy),
      });
      toast.warn(
        `Using best available fix — ±${Math.round(bestSoFar.coords.accuracy)} m. Enable GPS for better accuracy.`
      );
    } else {
      const msg =
        err.code === 1
          ? 'Location permission denied. Please allow location access and try again.'
          : 'Location unavailable. Ensure GPS/Wi-Fi is on and try again.';
      toast.error(msg);
    }
  };

  watchIdRef.current = navigator.geolocation.watchPosition(
    onSuccess,
    onError,
    {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: MAX_WAIT_MS, // ← Fix 1: match the hard cap so a single-tick
                            //   timeout doesn't trigger onError prematurely
    }
  );

  // Hard cap — use best fix seen so far after MAX_WAIT_MS
  timeoutHandle = setTimeout(() => {
    stopWatch();
    if (bestSoFar) {
      done(bestSoFar);
    } else {
      setLocLoading(false);
      toast.error('Could not determine location. Move to an open area and try again.');
    }
  }, MAX_WAIT_MS);
};
  /* ── Submit ───────────────────────────────────────────────────────── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!location) { toast.error('Please capture your location first'); return; }

    setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => v && fd.append(k, v));
      fd.append('latitude',  location.latitude);
      fd.append('longitude', location.longitude);
      photos.forEach((p) => fd.append('photos', p));

      await complaintService.create(fd);
      toast.success('Complaint submitted successfully!');
      navigate('/complaints');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Render ───────────────────────────────────────────────────────── */
  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '4px' }}>Raise a Complaint</h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px' }}>
          Describe the issue — photos and location help resolve it faster.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Basic info */}
        <Card>
          <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '18px' }}>Issue Details</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Input label="Title *" placeholder="e.g. Electrical fault in Assembly Line 3" value={form.title} onChange={set('title')} required />
            <Select label="Category *" options={CATEGORIES} value={form.category} onChange={set('category')} />
            <div>
              <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '6px' }}>Description *</label>
              <textarea
                placeholder="Describe the problem in detail — what you see, when it started, any hazards..."
                value={form.description} onChange={set('description')} required
                rows={4}
                style={{
                  width: '100%', background: 'var(--color-bg-input)', border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)', padding: '10px 14px', fontSize: '14px',
                  color: 'var(--color-text-primary)', outline: 'none', resize: 'vertical',
                  fontFamily: 'var(--font-sans)', boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Input label="Zone / Area"        placeholder="e.g. Zone-B"         value={form.zone}     onChange={set('zone')}     />
              <Input label="Building / Section" placeholder="e.g. Assembly Block B" value={form.building} onChange={set('building')} />
            </div>
          </div>
        </Card>

        {/* Location capture */}
        <Card>
          <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>📍 Location *</h2>
          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '14px' }}>
            Precise GPS coordinates help maintenance teams navigate to the problem.
            For best accuracy, use outdoors or near a window.
          </p>

          {location ? (
            <div>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px', background: 'var(--color-success-muted)',
                borderRadius: 'var(--radius-md)', border: '1px solid var(--color-success)',
              }}>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-success)' }}>✓ Location Captured</p>
                  <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: 2 }}>
                    {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                    {' · '}
                    <span style={{ color: location.accuracy <= 25 ? 'var(--color-success)' : location.accuracy <= 50 ? 'var(--color-warning)' : 'var(--color-danger)' }}>
                      ±{location.accuracy} m
                    </span>
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {/* Re-capture button for better accuracy */}
                  <button
                    type="button" onClick={getLocation}
                    title="Recapture for better accuracy"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
                  >
                    <RefreshCw size={15} />
                  </button>
                  <button
                    type="button" onClick={() => { stopWatch(); setLocation(null); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Accuracy hint */}
              {location.accuracy > 50 && (
                <p style={{ fontSize: '11px', color: 'var(--color-warning)', marginTop: 8 }}>
                  ⚠ Low accuracy (±{location.accuracy} m). Move outdoors or near a window and press ↺ to re-capture.
                </p>
              )}
            </div>
          ) : (
            <Button type="button" variant="secondary" onClick={getLocation} loading={locLoading} style={{ width: '100%' }}>
              <MapPin size={16} />
              {locLoading ? 'Acquiring accurate location…' : 'Capture Current Location'}
            </Button>
          )}
        </Card>

        {/* Photo upload */}
        <Card>
          <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>📷 Photos</h2>
          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '14px' }}>Up to 5 photos, max 10 MB each. Clear photos speed up resolution.</p>

          <div
            {...getRootProps()}
            style={{
              border: `2px dashed ${isDragActive ? 'var(--color-accent)' : 'var(--color-border)'}`,
              borderRadius: 'var(--radius-md)', padding: '28px', textAlign: 'center',
              cursor: 'pointer', transition: 'var(--transition)',
              background: isDragActive ? 'var(--color-accent-muted)' : 'var(--color-bg-input)',
            }}
          >
            <input {...getInputProps()} />
            <Upload size={28} color="var(--color-text-muted)" style={{ marginBottom: '8px' }} />
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>Drag photos here or click to browse</p>
            <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>JPG, PNG, WEBP · {photos.length}/5 uploaded</p>
          </div>

          {photos.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', marginTop: '14px' }}>
              {photos.map((f, i) => (
                <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                  <img src={f.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    type="button"
                    onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))}
                    style={{
                      position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.7)', border: 'none',
                      borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <Button type="button" variant="secondary" onClick={() => navigate(-1)}>Cancel</Button>
          <Button type="submit" loading={submitting}>Submit Complaint</Button>
        </div>
      </form>
    </div>
  );
}

