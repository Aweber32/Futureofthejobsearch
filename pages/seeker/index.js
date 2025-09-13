import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function Seeker(){
  const router = useRouter();

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('fjs_token') : null;
    if (token) {
      // User is logged in, redirect to dashboard
      router.push('/seeker/dashboard');
    } else {
      // User is not logged in, redirect to login
      router.push('/seeker/login');
    }
  }, [router]);

  return (
    <Layout title="Job seeker">
      <div className="text-center">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-2">Redirecting...</p>
      </div>
    </Layout>
  );
}
