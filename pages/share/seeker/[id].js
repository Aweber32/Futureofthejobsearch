// Legacy route no longer used for security (ID enumeration). Redirect visitors to homepage.
export default function LegacySeekerIdShareRedirect(){
  if (typeof window !== 'undefined') {
    window.location.replace('/');
  }
  return null;
}
