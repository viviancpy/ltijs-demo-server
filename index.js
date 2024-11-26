require('dotenv').config()
const path = require('path')
const routes = require('./src/routes')

const lti = require('ltijs').Provider

// Setup
lti.setup(process.env.LTI_KEY,
  {
    url: process.env.DB_URL,
    connection: { user: process.env.DB_USER, pass: process.env.DB_PASS }
  }, {
    staticPath: path.join(__dirname, './public'), // Path to static files
    cookies: {
      secure: true, // Set secure to true if the testing platform is in a different domain and https is being used
      sameSite: 'None' // Set sameSite to 'None' if the testing platform is in a different domain and https is being used
    },
    devMode: false // Set DevMode to true if the testing platform is in a different domain and https is not being used
  })

// When receiving successful LTI launch redirects to app
lti.onConnect(async (token, req, res) => {
  return res.sendFile(path.join(__dirname, './public/index.html'))
})

// When receiving deep linking request redirects to deep screen
lti.onDeepLinking(async (token, req, res) => {
  return lti.redirect(res, '/deeplink', { newResource: true })
})

// Setting up routes
lti.app.use(routes)

// Setup function
const setup = async () => {
  await lti.deploy({ port: process.env.PORT })

    // VIV - TODO: move this platform registration part to a lambda function  
    // Define the platform configuration
    const platformConfig = {
      url: process.env.PLATFORM_URL,
      name: process.env.PLATFORM_NAME,
      clientId: process.env.PLATFORM_TOOL_CLIENT_ID,
      authenticationEndpoint: process.env.PLATFORM_AUTH_ENDPOINT,
      accesstokenEndpoint: process.env.PLATFORM_ACCESS_TOKEN_ENDPOINT,
      authConfig: {
        method: process.env.PLATFORM_AUTH_METHOD,
        key: process.env.PLATFORM_AUTH_KEY
      }
    };

    console.log('Registering platform with config:', platformConfig);

    // First check if platform exists
    try {
      const existingPlatform = await dyDb.Get(null, 'platforms', { platformUrl: platformConfig.url });
      console.log('Existing platform check result:', existingPlatform);
    } catch (err) {
      console.error('Error checking existing platform:', err);
    }

    // Register platform
    try {
      await lti.registerPlatform(platformConfig);
      console.log('Platform registered successfully');
    } catch (err) {
      console.error('Platform registration error:', err);
      throw err;
    }

}

setup()
