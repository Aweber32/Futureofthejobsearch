import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';

function titleizePath(pathname) {
  if (!pathname || pathname === '/') return 'Home';
  const parts = pathname.split('/').filter(Boolean);
  const clean = parts
    .map(p => p.replace(/[-_]/g, ' '))
    .map(p => p.charAt(0).toUpperCase() + p.slice(1));
  return clean.join(' / ') || 'Current Page';
}

export default function FeedbackWidget() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState('page'); // 'page' or 'overall'
  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const pageName = useMemo(() => titleizePath(router.pathname), [router.pathname]);
  const ratingLabel = scope === 'page' ? `Rating for ${pageName}` : 'Overall rating';

  useEffect(() => {
    if (!open) {
      setRating(0);
      setNotes('');
      setMessage('');
      setScope('page');
      setLoading(false);
    }
  }, [open]);

  const handleSubmit = async (evt) => {
    evt.preventDefault();
    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const res = await fetch(`${apiUrl}/api/feedback/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageName,
          scope,
          rating,
          notes: notes || null
        })
      });
      if (res.ok) {
        setMessage('✓ Thanks! Your feedback was saved.');
        setTimeout(() => setOpen(false), 1500);
      } else {
        const err = await res.json();
        setMessage(`Error: ${err.error || 'Failed to save'}`);
      }
    } catch (err) {
      console.error('[FeedbackWidget] Error:', err);
      setMessage('Error: Could not save feedback.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="feedback-fab shadow-lg"
        onClick={() => setOpen(true)}
        aria-label="Open feedback form"
      >
        Feedback
      </button>

      {open && (
        <div className="feedback-panel shadow-lg">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <div>
              <div className="small text-muted">Current page</div>
              <div className="fw-semibold">{pageName}</div>
            </div>
            <button type="button" className="btn btn-sm btn-light" onClick={() => setOpen(false)} disabled={loading} aria-label="Close feedback">×</button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label fw-semibold">Scope</label>
              <div className="d-flex gap-2">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="radio"
                    id="scope-page"
                    name="scope"
                    value="page"
                    checked={scope === 'page'}
                    onChange={() => setScope('page')}
                    disabled={loading}
                  />
                  <label className="form-check-label" htmlFor="scope-page">This page</label>
                </div>
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="radio"
                    id="scope-overall"
                    name="scope"
                    value="overall"
                    checked={scope === 'overall'}
                    onChange={() => setScope('overall')}
                    disabled={loading}
                  />
                  <label className="form-check-label" htmlFor="scope-overall">Overall</label>
                </div>
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label fw-semibold">{ratingLabel}</label>
              <div className="feedback-stars" role="radiogroup" aria-label={ratingLabel}>
                {[1,2,3,4,5].map(star => (
                  <button
                    key={star}
                    type="button"
                    className={`star-btn ${rating >= star ? 'filled' : ''}`}
                    aria-label={`${star} star${star > 1 ? 's' : ''}`}
                    onClick={() => setRating(star)}
                    disabled={loading}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label fw-semibold" htmlFor="feedback-notes">Notes (optional)</label>
              <textarea
                id="feedback-notes"
                className="form-control"
                rows={3}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="What worked well? What could be better?"
                disabled={loading}
              />
            </div>

            {message && <div className={`alert ${message.startsWith('✓') ? 'alert-success' : 'alert-danger'} py-2 mb-3`}>{message}</div>}

            <div className="d-flex justify-content-end gap-2">
              <button type="button" className="btn btn-light" onClick={() => setOpen(false)} disabled={loading}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={rating === 0 || loading}>
                {loading ? 'Saving...' : 'Submit'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
