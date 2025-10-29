import { useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { API_CONFIG } from '../../config/api'

const API = API_CONFIG.BASE_URL

export default function Settings(){
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [seekerId, setSeekerId] = useState(null)
  const [currentEmail, setCurrentEmail] = useState('')

  // Change Email state
  const [newEmail, setNewEmail] = useState('')
  const [emailPassword, setEmailPassword] = useState('')
  const [changingEmail, setChangingEmail] = useState(false)

  // Password reset link state
  const [resetLinkMessage, setResetLinkMessage] = useState('')

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('fjs_token') : null
    if (!token){ router.push('/seeker/login'); return }
    (async () => {
      try{
        const res = await fetch(`${API}/api/seekers/me`, { headers: { Authorization: `Bearer ${token}` } })
        if (!res.ok) throw new Error('Unauthorized')
        const data = await res.json()
        setSeekerId(data?.seeker?.id ?? data?.seeker?.Id ?? null)
        setCurrentEmail(data?.user?.email ?? '')
        setNewEmail(data?.user?.email ?? '')
      }catch(err){ setError(err?.message || 'Failed to load') }
      finally{ setLoading(false) }
    })()
  }, [])

  async function handleChangeEmail(e){
    e.preventDefault()
    setMessage(''); setError(''); setChangingEmail(true)
    const token = localStorage.getItem('fjs_token')
    try{
      const res = await fetch(`${API}/api/seekers/change-email`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ newEmail: newEmail, password: emailPassword })
      })
      const body = await res.json().catch(()=>({}))
      if (!res.ok) throw new Error(body?.error || 'Failed to update email')
      setCurrentEmail(body?.email ?? newEmail)
      setMessage('Email updated successfully')
      setEmailPassword('')
    }catch(err){ setError(err?.message || 'Failed to update email') }
    finally{ setChangingEmail(false) }
  }

  // Removed direct change-password; using email reset link instead

  async function handleSendResetLink(){
    setResetLinkMessage(''); setError(''); setMessage('')
    try{
      const res = await fetch(`${API}/api/seekers/password-reset-request`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ email: currentEmail })
      })
      await res.json().catch(()=>({}))
      setResetLinkMessage('If an account exists, a reset link has been sent to your email.')
    }catch(err){ setError(err?.message || 'Failed to send reset link') }
  }

  async function handleDeleteAccount(){
    if (!seekerId) return
    const confirmed = window.confirm('This will permanently delete your account and data. Are you sure?')
    if (!confirmed) return
    const token = localStorage.getItem('fjs_token')
    setMessage(''); setError('')
    try{
      const res = await fetch(`${API}/api/seekers/${seekerId}`, { method:'DELETE', headers: { Authorization: `Bearer ${token}` } })
      const body = await res.json().catch(()=>({}))
      if (!res.ok) throw new Error(body?.error || 'Failed to delete account')
      // Clear token and redirect to signup
      localStorage.removeItem('fjs_token')
      router.push('/seeker/signup')
    }catch(err){ setError(err?.message || 'Failed to delete account') }
  }

  return (
    <Layout title="Settings">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0">Settings</h2>
        <Link href="/seeker/dashboard" className="btn btn-outline-secondary">Return</Link>
      </div>

      {loading ? (
        <div className="text-muted">Loading…</div>
      ) : (
        <>
          {(message || error) && (
            <div className={`alert ${error ? 'alert-danger' : 'alert-success'}`} role="alert">
              {error || message}
            </div>
          )}

          {/* Account Section */}
          <div className="card shadow-sm border-0 mb-4" style={{borderRadius:'12px'}}>
            <div className="card-body">
              <h5 className="mb-3">Account</h5>

              <div className="mb-4">
                <h6 className="text-muted">Change Email</h6>
                <form onSubmit={handleChangeEmail} className="row g-2 align-items-end">
                  <div className="col-12 col-md-5">
                    <label className="form-label small text-muted">Current Email</label>
                    <input className="form-control" type="email" value={currentEmail} disabled />
                  </div>
                  <div className="col-12 col-md-4">
                    <label className="form-label small">New Email</label>
                    <input className="form-control" type="email" value={newEmail} onChange={e=>setNewEmail(e.target.value)} required />
                  </div>
                  <div className="col-12 col-md-3">
                    <label className="form-label small">Password</label>
                    <input className="form-control" type="password" value={emailPassword} onChange={e=>setEmailPassword(e.target.value)} required />
                  </div>
                  <div className="col-12 mt-2">
                    <button className="btn btn-primary" disabled={changingEmail}>Update Email</button>
                  </div>
                </form>
              </div>

              <div>
                <h6 className="text-muted">Password</h6>
                <button type="button" className="btn btn-outline-secondary" onClick={handleSendResetLink}>Email me a secure password reset link</button>
                {resetLinkMessage && <p className="text-muted small mt-2 mb-0">{resetLinkMessage}</p>}
              </div>
            </div>
          </div>

          {/* Discontinue Account Section */}
          <div className="card shadow-sm border-0" style={{borderRadius:'12px'}}>
            <div className="card-body">
              <h5 className="mb-3 text-danger">Discontinue Account</h5>
              <p className="text-muted">Discontinuing your account will permanently remove your profile, messages, and any uploaded files (resume/video) where possible. This action cannot be undone.</p>
              <button className="btn btn-outline-danger" onClick={handleDeleteAccount} disabled={!seekerId}>Delete My Account</button>
            </div>
          </div>
        </>
      )}
    </Layout>
  )
}
