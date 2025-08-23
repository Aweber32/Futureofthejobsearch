import Link from 'next/link';
import Layout from '../../../components/Layout';

export default function EditCompany(){
  const placeholder = {
    name: 'Acme Co',
    email: 'hello@acme.test',
    website: 'https://acme.test',
    logo: '/logo.svg'
  }

  return (
    <Layout title="Edit company">
      <h2>Edit company</h2>
      <form className="mt-3">
        <div className="mb-3">
          <label className="form-label">Company name</label>
          <input className="form-control" defaultValue={placeholder.name} />
        </div>

        <div className="row">
          <div className="col-md-6 mb-3">
            <label className="form-label">Contact email</label>
            <input className="form-control" defaultValue={placeholder.email} />
          </div>
          <div className="col-md-6 mb-3">
            <label className="form-label">Website</label>
            <input className="form-control" defaultValue={placeholder.website} />
          </div>
        </div>

        <div className="mb-3">
          <label className="form-label">Logo URL</label>
          <input className="form-control" defaultValue={placeholder.logo} />
        </div>

        <div className="d-flex gap-2">
          <Link href="/poster/dashboard" className="btn btn-primary">Save (placeholder)</Link>
          <Link href="/poster/dashboard" className="btn btn-outline-secondary">Cancel</Link>
        </div>
      </form>
    </Layout>
  )
}
