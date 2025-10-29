import Layout from '../../components/Layout'
import Link from 'next/link'

export default function MyAnalytics(){
  return (
    <Layout title="My Analytics">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0">My Analytics</h2>
        <Link href="/seeker/dashboard" className="btn btn-outline-secondary">Return</Link>
      </div>
      <div className="card shadow-sm border-0" style={{borderRadius: '12px'}}>
        <div className="card-body">
          <p className="mb-0 text-muted">Analytics coming soon. You'll see profile views, conversation stats, and interest trends here.</p>
        </div>
      </div>
    </Layout>
  )
}
