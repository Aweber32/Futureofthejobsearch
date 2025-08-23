import Link from 'next/link';
import Layout from '../components/Layout';

export default function Home(){
  return (
    <Layout>
      <div className="text-center my-4">
        <img src="/logo.svg" alt="logo" width="120" height="120" />
        <h1 className="mt-3">Future of the Job Search</h1>
        <p className="text-muted">Connecting great companies with the right talent.</p>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-md-6">
          <Link href="/seeker/login" className="card card-chooser text-dark">
            <div>
              <h3>Job Seeker</h3>
              <p className="text-muted">Find roles tailored to you</p>
            </div>
          </Link>
        </div>
        <div className="col-md-6">
          <Link href="/poster/login" className="card card-chooser text-dark">
            <div>
              <h3>Job Poster</h3>
              <p className="text-muted">Post roles and discover candidates</p>
            </div>
          </Link>
        </div>
      </div>

      <div className="row mb-5">
        <div className="col-md-8">
          <h4>About the business</h4>
          <p>Placeholder: explain the business here. This will describe how we help employers and job seekers.</p>
        </div>
        <div className="col-md-4">
          <h5>Stats</h5>
          <ul className="list-unstyled">
            <li>1000+ Roles posted</li>
            <li>500+ Companies</li>
            <li>10k+ Candidates</li>
          </ul>
        </div>
      </div>
    </Layout>
  )
}
