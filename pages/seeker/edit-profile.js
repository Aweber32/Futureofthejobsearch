import Link from 'next/link';
import Layout from '../../components/Layout';

export default function EditProfile(){
  const placeholder = { name: 'Alex Seeker', email: 'alex@seeker.test' };
  return (
    <Layout title="Edit profile">
      <h2>Edit profile</h2>
      <form className="mt-3">
        <div className="mb-3">
          <label className="form-label">Full name</label>
          <input className="form-control" defaultValue={placeholder.name} />
        </div>
        <div className="mb-3">
          <label className="form-label">Email</label>
          <input className="form-control" defaultValue={placeholder.email} />
        </div>
        <div className="d-flex gap-2">
          <Link href="/seeker/dashboard" className="btn btn-primary">Save (placeholder)</Link>
          <Link href="/seeker/dashboard" className="btn btn-outline-secondary">Cancel</Link>
        </div>
      </form>
    </Layout>
  )
}
