import { useRouter } from 'next/router';
import { ArrowLeft } from 'lucide-react';

export default function BackButton() {
  const router = useRouter();
  
  // Don't show back button on homepage, dashboard pages, or swiping pages
  if (
    router.pathname === '/' || 
    router.pathname.includes('/dashboard') ||
    router.pathname === '/poster/find-candidates' ||
    router.pathname === '/seeker/find-positions'
  ) {
    return null;
  }

  const handleBack = () => {
    // If there's history, go back. Otherwise, go to appropriate home page
    if (window.history.length > 1) {
      router.back();
    } else {
      // Determine appropriate home based on current path
      if (router.pathname.startsWith('/poster')) {
        router.push('/poster/dashboard');
      } else if (router.pathname.startsWith('/seeker')) {
        router.push('/seeker/dashboard');
      } else {
        router.push('/');
      }
    }
  };

  return (
    <button
      onClick={handleBack}
      className="btn btn-link text-decoration-none d-flex align-items-center gap-2 p-0 mb-3"
      style={{ 
        fontSize: '14px',
        color: 'var(--bs-secondary)',
        transition: 'color 0.2s'
      }}
      onMouseEnter={(e) => e.currentTarget.style.color = 'var(--bs-primary)'}
      onMouseLeave={(e) => e.currentTarget.style.color = 'var(--bs-secondary)'}
    >
      <ArrowLeft size={18} />
      <span>Back</span>
    </button>
  );
}
