// API Configuration for Production
const API_BASE_URL = 'https://futureofthejobsearch-api-brd3cjc3f2debhek.centralus-01.azurewebsites.net';

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