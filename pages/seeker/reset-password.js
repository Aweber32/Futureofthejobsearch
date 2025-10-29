import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import Link from 'next/link'
import { API_CONFIG } from '../../config/api'

const API = API_CONFIG.BASE_URL

export default function ResetPassword(){
  const router = useRouter()
  const { uid, token } = router.query

  const [newPassword, setNewPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function onSubmit(e){
    e.preventDefault()
    setSubmitting(true); setMessage(''); setError('')
    try{
      const res = await fetch(`${API}/api/seekers/password-reset-confirm`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ userId: uid, token, newPassword })
      })
      const body = await res.json().catch(()=>({}))
      if (!res.ok) throw new Error(body?.error || 'Failed to reset password')
      setMessage('Password updated. Redirecting to sign in…')
      setTimeout(() => router.push('/seeker/login'), 1500)
    }catch(err){ setError(err?.message || 'Failed to reset password') }
    finally{ setSubmitting(false) }
  }

  return (
    <Layout title="Reset Password">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0">Reset Password</h2>
        <Link href="/seeker/login" className="btn btn-outline-secondary">Return</Link>
      </div>

      {(message || error) && (
        <div className={`alert ${error ? 'alert-danger' : 'alert-success'}`}>{error || message}</div>
      )}

      <div className="card shadow-sm border-0" style={{borderRadius:'12px'}}>
        <div className="card-body">
          <form onSubmit={onSubmit}>
            <div className="mb-3">
              <label className="form-label">New Password</label>
              <input type="password" className="form-control" value={newPassword} onChange={e=>setNewPassword(e.target.value)} required />
              <div className="form-text">Must be at least 8 characters and include a number.</div>
            </div>
            <button className="btn btn-primary" disabled={submitting}>Set New Password</button>
          </form>
        </div>
      </div>
    </Layout>
  )
}
