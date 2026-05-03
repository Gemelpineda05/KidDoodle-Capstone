// API Configuration
// Image-to-Story API configuration

// Choose your deployment environment
const ENVIRONMENT = 'render'; // 'local', 'railway', 'render', 'heroku'

const API_URLS = {
  local: 'http://192.168.0.193:8000',
  railway: 'https://your-project-name.railway.app', // Replace with your Railway URL
  render: 'https://kidoodle-api.onrender.com', // Replace with your Render URL
  heroku: 'https://your-app-name.herokuapp.com' // Replace with your Heroku URL
};

export const API_CONFIG = {
  // API endpoint based on environment
  baseUrl: API_URLS[ENVIRONMENT],
  endpoints: {
    health: '/health',
    generateStory: '/generate-story-base64'
  }
};

// Helper function to switch environments
export const switchEnvironment = (env) => {
  if (API_URLS[env]) {
    console.log(`Switching to ${env} environment: ${API_URLS[env]}`);
    return API_URLS[env];
  }
  console.warn(`Environment ${env} not found, using local`);
  return API_URLS.local;
};
