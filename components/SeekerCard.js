import { useSignedBlobUrl } from '../utils/blobHelpers';

export default function SeekerCard({ seeker = {} }){
  const firstName = seeker?.firstName ?? seeker?.FirstName ?? seeker?.user?.firstName ?? seeker?.user?.name ?? '';
  const lastName = seeker?.lastName ?? seeker?.LastName ?? '';
  const name = (firstName || lastName) ? `${firstName} ${lastName}`.trim() : 'Job Seeker';
  const summary = seeker?.headline ?? '';
  const resumeRaw = seeker?.resumeUrl ?? seeker?.ResumeUrl ?? '';
  const videoRaw = seeker?.videoUrl ?? seeker?.VideoUrl ?? '';
  
  // Sign blob URLs
  const token = typeof window !== 'undefined' ? localStorage.getItem('fjs_token') : null;
  const { signedUrl: resume } = useSignedBlobUrl(resumeRaw, token);
  const { signedUrl: video } = useSignedBlobUrl(videoRaw, token);

  return (
    <div className="d-flex align-items-center">
      <div style={{width:64, height:64, background:'#f1f3f5', borderRadius:8}} className="me-3 d-flex align-items-center justify-content-center">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4z" stroke="#6c757d" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/><path d="M20 21v-1c0-2.21-3.58-4-8-4s-8 1.79-8 4v1" stroke="#6c757d" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </div>
      <div>
        <div className="h5 mb-0">{name}</div>
        {summary ? <small className="text-muted d-block">{summary}</small> : <small className="text-muted d-block">No summary provided</small>}
        <div className="mt-1">
          {resume && <a href={resume} target="_blank" rel="noreferrer" className="me-2">Resume</a>}
          {video && <a href={video} target="_blank" rel="noreferrer">Video</a>}
        </div>
      </div>
    </div>
  );
}
