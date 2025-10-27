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
    // Use the same API base URL logic as the rest of the app
    const apiUrl = typeof window !== 'undefined' && window.location.hostname !== 'localhost' 
      ? '' // Use relative URL when deployed (same origin)
      : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000');
    
    // Construct a full blob URL from the path-only reference
    const fullBlobUrl = `https://futureofthejobsearch.blob.core.windows.net/${pathOrUrl}`;
    const encodedUrl = encodeURIComponent(fullBlobUrl);
    
    const res = await fetch(`${apiUrl}/api/uploads/sign?url=${encodedUrl}&minutes=${minutes}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (!res.ok) {
      console.error('Failed to sign blob URL:', await res.text());
      return null;
    }
    const data = await res.json();
    return data.url;
  } catch (err) {
    console.error('Error signing blob URL:', err);
    return null;
  }
}

// Hook to sign a blob URL on mount/update
import { useEffect, useState } from 'react';

export function useSignedBlobUrl(pathOrUrl, token) {
  const [signedUrl, setSignedUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!pathOrUrl) {
      setSignedUrl(null);
      setLoading(false);
      return;
    }

    // If already a full URL, use as-is
    if (!isPathOnlyBlob(pathOrUrl)) {
      setSignedUrl(pathOrUrl);
      setLoading(false);
      return;
    }

    // Otherwise, sign it
    setLoading(true);
    signBlobUrl(pathOrUrl, token).then(url => {
      setSignedUrl(url);
      setLoading(false);
    });
  }, [pathOrUrl, token]);

  return { signedUrl, loading };
}
