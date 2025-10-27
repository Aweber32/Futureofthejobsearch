import 'bootstrap/dist/css/bootstrap.min.css';
import '../styles/globals.css';
import { useEffect } from 'react';

export default function MyApp({ Component, pageProps }) {
  useEffect(() => {
    // Import Bootstrap JS only on client side
    import('bootstrap/dist/js/bootstrap.bundle.min.js');
    
    // Diagnostic: Log environment variables
    console.log('[_app.js] NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL);
    console.log('[_app.js] NODE_ENV:', process.env.NODE_ENV);
  }, []);

  return <Component {...pageProps} />;
}
