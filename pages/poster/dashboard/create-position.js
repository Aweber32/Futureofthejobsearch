import Link from 'next/link';
import Layout from '../../../components/Layout';

export default function CreatePosition(){
  const placeholder = {
    title: 'Senior Backend Engineer',
    location: 'Remote',
    type: 'Full-time',
    description: 'Build and maintain APIs'
  }
  return (
    <Layout title="Create Position">
      <h2>Create position</h2>
      <form className="mt-3">
        <div className="mb-3">
          <label className="form-label">Title</label>
          <input className="form-control" defaultValue={placeholder.title} />
        </div>
        <div className="row">
          <div className="col-md-6 mb-3">
            <label className="form-label">Location</label>
            <input className="form-control" defaultValue={placeholder.location} />
          </div>
          <div className="col-md-6 mb-3">
            <label className="form-label">Type</label>
            <input className="form-control" defaultValue={placeholder.type} />
          </div>
        </div>
        <div className="mb-3">
          <label className="form-label">Description</label>
          <textarea className="form-control" rows={6} defaultValue={placeholder.description}></textarea>
        </div>
        <div className="d-flex gap-2">
          <Link href="/poster/dashboard" className="btn btn-primary">Save (placeholder)</Link>
          <Link href="/poster/dashboard" className="btn btn-outline-secondary">Cancel</Link>
        </div>
      </form>
    </Layout>
  )
}
