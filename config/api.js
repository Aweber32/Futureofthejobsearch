// API Configuration - robust for Next.js and runtime injection
// Resolution order (first found wins):
// 1. window.__ENV.API_BASE (runtime injected by hosting)
// 2. process.env.NEXT_PUBLIC_API_BASE (set at build time / CI)
// 3. process.env.NEXT_PUBLIC_ENV === 'PROD' ? hardcoded PROD : LOCAL

const PROD_API = 'https://futureofthejobsearch-api-brd3cjc3f2debhek.centralus-01.azurewebsites.net';
const LOCAL_API = 'http://localhost:5000';

//function getApiBase(){
 // try{
    // runtime injection pattern used by some hosting platforms
   // if (typeof window !== 'undefined' && window.__ENV && window.__ENV.API_BASE) return window.__ENV.API_BASE;
    // Next.js public env (available on client and server when prefixed with NEXT_PUBLIC_)
   // if (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_API_BASE) return process.env.NEXT_PUBLIC_API_BASE;
    // fallback to checking NEXT_PUBLIC_ENV
   // if (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_ENV === 'PROD') return PROD_API;
  //}catch(e){}
  // default to local during development
  //return LOCAL_API;
//}

//const API_BASE_URL = getApiBase();

const API_BASE_URL = PROD_API; // hardcode to PROD for now, since runtime injection not working on Azure

export const API_CONFIG = {
  BASE_URL: API_BASE_URL,
  API_URL: API_BASE_URL,
  ENDPOINTS: {
    LOGIN: `${API_BASE_URL}/api/seekers/login`,
    REGISTER: `${API_BASE_URL}/api/seekers/register`,
  }
};

export default API_CONFIG;