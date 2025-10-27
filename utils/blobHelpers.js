// Helper to detect if a URL is a path-only blob reference (e.g., "container/blob.png")
export function isPathOnlyBlob(url) {
  if (!url) return false;
  // If it starts with http(s), it's already a full URL
  if (url.startsWith('http://') || url.startsWith('https://')) return false;
  // Otherwise, assume it's a path-only reference
  return true;
}

// Sign a blob URL by calling the backend /api/uploads/sign endpoint
export async function signBlobUrl(pathOrUrl, token, minutes = 60) {
  if (!pathOrUrl) return null;
  
  // If it's already a full URL, return as-is (or optionally re-sign)
  if (!isPathOnlyBlob(pathOrUrl)) {
    // Optionally, you could always re-sign here if you want fresh SAS
    return pathOrUrl;
  }

  // Otherwise, sign the path-only reference
  try {
    // Always use the full API URL from config (frontend and backend are separate App Services)
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    
    // Construct a full blob URL from the path-only reference
    const fullBlobUrl = `https://futureofthejobsearch.blob.core.windows.net/${pathOrUrl}`;
    const encodedUrl = encodeURIComponent(fullBlobUrl);
    
    // Remove any trailing slashes and ensure clean URL construction
    const cleanApiUrl = apiUrl.replace(/\/+$/, '');
    const signEndpoint = `${cleanApiUrl}/api/uploads/sign`;
    
    console.log('[Blob Helper] Signing URL:', { pathOrUrl, fullBlobUrl, apiUrl, signEndpoint });
    
    const res = await fetch(`${signEndpoint}?url=${encodedUrl}&minutes=${minutes}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    
    console.log('[Blob Helper] Sign response:', { status: res.status, ok: res.ok });
    
    if (!res.ok) {
      const errText = await res.text();
      console.error('[Blob Helper] Failed to sign blob URL:', errText);
      return null;
    }
    const data = await res.json();
    console.log('[Blob Helper] Signed URL:', data.url);
    return data.url;
  } catch (err) {
    console.error('[Blob Helper] Error signing blob URL:', err);
    return null;
  }
}

// Hook to sign a blob URL on mount/update
import { useEffect, useState } from 'react';

export function useSignedBlobUrl(pathOrUrl, token) {
  const [signedUrl, setSignedUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('[useSignedBlobUrl] Hook called with:', { pathOrUrl, hasToken: !!token });
    
    if (!pathOrUrl) {
      console.log('[useSignedBlobUrl] No path/URL provided, returning null');
      setSignedUrl(null);
      setLoading(false);
      return;
    }

    // If already a full URL, use as-is
    if (!isPathOnlyBlob(pathOrUrl)) {
      console.log('[useSignedBlobUrl] Already a full URL, using as-is:', pathOrUrl);
      setSignedUrl(pathOrUrl);
      setLoading(false);
      return;
    }

    // Otherwise, sign it
    console.log('[useSignedBlobUrl] Path-only reference detected, signing:', pathOrUrl);
    setLoading(true);
    signBlobUrl(pathOrUrl, token).then(url => {
      console.log('[useSignedBlobUrl] Got signed URL:', url);
      setSignedUrl(url);
      setLoading(false);
    });
  }, [pathOrUrl, token]);

  return { signedUrl, loading };
}
