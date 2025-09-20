// API Configuration - simplified
// Behavior:
// - If ENV === 'PROD' then use the production API URL
// - Otherwise use the LOCAL_API constant below

const PROD_API = 'https://futureofthejobsearch-api-brd3cjc3f2debhek.centralus-01.azurewebsites.net';
// Local API used during development
const LOCAL_API = 'http://localhost:5000';

const API_BASE_URL = (typeof process !== 'undefined') && (process.env?.ENV === 'PROD') ? PROD_API : LOCAL_API;

export const API_CONFIG = {
  BASE_URL: API_BASE_URL,
  API_URL: API_BASE_URL,
  ENDPOINTS: {
    LOGIN: `${API_BASE_URL}/api/seekers/login`,
    REGISTER: `${API_BASE_URL}/api/seekers/register`,
    // Add other endpoints as needed
  }
};

export default API_CONFIG;