require('dotenv').config()
const path = require('path')
const routes = require('./src/routes')
const Database = require('./src/ltiDatabase.js')
const handlebars = require('handlebars');
const fs = require('fs').promises;
const TableauService = require('./src/tableau');
const lti = require('ltijs').Provider

// Create an instance of the service
const tableauService = new TableauService();

// Setup ltijs-sequelize using the same arguments as Sequelize's generic contructor
const db = new Database({
  url: process.env.DB_URL,
  connection: { user: process.env.DB_USER, pass: process.env.DB_PASS }
})

// Setup
lti.setup(process.env.LTI_KEY,
  {
    plugin: db,
    dynamic: true
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
  try {
    return res.sendFile(path.join(__dirname, './public/template.html'))
    // Get the user name from the token
    const platformUserName = token.platformContext.custom.username || token.user;
    
    // Read the template file
    const templateContent = await fs.readFile(
      path.join(__dirname, './public/template.html'), 
      'utf8'
    );

    // Compile the template
    const template = handlebars.compile(templateContent);

    // Get Tableau site URL and JWT token
    const siteUrl = tableauService.getTableauSiteUrl(platformUserName);
    const siteJwt = tableauService.createTableauJwtToken(platformUserName);

    // Render the template with the values
    const html = template({
      siteUrl: siteUrl,
      siteJwt: siteJwt
    });

    // Send the rendered HTML
    console.log("html...");
    console.log(html);
    res.setHeader('Content-Type', 'text/html');
    return res.send(html);

  } catch (err) {
    console.error('Error in onConnect:', err);
    return res.status(500).send('An error occurred while loading the page');
  }
})

// When receiving deep linking request redirects to deep screen
lti.onDeepLinking(async (token, req, res) => {
  return lti.redirect(res, '/deeplink', { newResource: true })
})

// Setting up routes
lti.app.use(routes)

// Setup function
const setup = async () => {
  await lti.deploy({ port: process.env.PORT });

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
  // Register platform
  try {
    await lti.registerPlatform(platformConfig);
    console.log('Platform registered successfully');
  } catch (err) {
    console.warn('Ignoring as platform may be already created. Platform registration error:', err);
  }

  // // First check if platform exists
  // try {
  //   const existingPlatform = await lti.Database.Get(null, 'platforms', { platformUrl: platformConfig.url });
  //   console.log('Existing platform check result:', existingPlatform);
  // } catch (err) {
  //   console.error('Error checking existing platform:', err);
  // }

  // // Register platform
  // try {
  //   await lti.registerPlatform(platformConfig);
  //   console.log('Platform registered successfully');
  // } catch (err) {
  //   console.error('Platform registration error:', err);
  //   throw err;
  // }

  // VIV: TODO move this part to a lambda function
  // Insert connected app
  // Create ConnectedApp configuration
  const connectedAppConfig = {
    platformUrl: process.env.PLATFORM_URL,
    clientId: process.env.PLATFORM_TOOL_CLIENT_ID,
    siteUrl: process.env.TABLEAU_SITE_URL || 'https://10ax.online.tableau.com/t/keproaussite',
    connectedAppClientId: process.env.TABLEAU_CLIENT_ID || 'your-tableau-client-id',
    connectedAppSecretId: process.env.TABLEAU_SECRET_ID || 'your-tableau-secret-id',
    connectedAppSecretKey: process.env.TABLEAU_SECRET_KEY || 'your-tableau-secret-key'
  };

  const appUserMapping = {
    platformUrl: process.env.PLATFORM_URL,
    clientId: process.env.PLATFORM_TOOL_CLIENT_ID,
    platformUserName: "teacher1",
    site: {
      siteUrl: "https://10ax.online.tableau.com/t/keproaussite/views/ScorePoC/ScoreDashboard",
      siteUserName: "vivian.py.chan@kepro.com.hk"
    }
  }

  try {
    await db.Insert(false, 'connectedApp', connectedAppConfig);
    console.log('Connected App configuration inserted successfully');
  } catch (err) {
    if (err.code === 11000) {
      // Duplicate key error (document already exists)
      console.log('Connected App configuration already exists, skipping insertion');
    } else {
      console.error('Error inserting Connected App configuration:', err);
    }
  }

  try {
    await db.Insert(false, 'appUser', appUserMapping)
    console.log('App User configuration inserted successfully');
  } catch (err) {
    if (err.code === 11000) {
      // Duplicate key error (document already exists)
      console.log('App User configuration already exists, skipping insertion');
    } else {
      console.error('Error inserting App User configuration:', err);
    }
  }

}

setup()





