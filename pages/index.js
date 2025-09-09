import Link from 'next/link';
import Layout from '../components/Layout';

export default function Home(){
  return (
    <Layout>
      <div className="text-center my-4">
        <img src="/logo.svg" alt="logo" width="120" height="120" className="mb-3" />
        <h1 className="mt-3 mb-3">Future of the Job Search</h1>
        <p className="text-muted lead">Connecting great companies with the right talent.</p>
      </div>

      <div className="row g-3 g-md-4 mb-4">
        <div className="col-12 col-md-6">
          <Link href="/seeker/login" className="card card-chooser text-dark d-block">
            <div>
              <h3>Job Seeker</h3>
              <p className="text-muted mb-0">Find roles tailored to you</p>
            </div>
          </Link>
        </div>
        <div className="col-12 col-md-6">
          <Link href="/poster/login" className="card card-chooser text-dark d-block">
            <div>
              <h3>Job Poster</h3>
              <p className="text-muted mb-0">Post roles and discover candidates</p>
            </div>
          </Link>
        </div>
      </div>

      <div className="row mb-5">
        <div className="col-12 col-md-8 mb-4 mb-md-0">
          <div className="card h-100">
            <div className="card-body">
              <h4 className="card-title">About the business</h4>
              <p className="card-text">We revolutionize job searching and hiring by providing a modern, intuitive platform that connects the right people with the right opportunities. Our streamlined approach saves time for both job seekers and employers.</p>
            </div>
          </div>
        </div>
        <div className="col-12 col-md-4">
          <div className="card h-100">
            <div className="card-body">
              <h5 className="card-title">Platform Stats</h5>
              <ul className="list-unstyled mb-0">
                <li className="mb-2"><strong>1000+</strong> Roles posted</li>
                <li className="mb-2"><strong>500+</strong> Companies</li>
                <li className="mb-0"><strong>10k+</strong> Candidates</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
