// If you're using CryptoJS as an external dependency, you'll need to import it
const CryptoJS = require('crypto-js');

// Helper function for base64url encoding
function base64url(source) {
    let encodedSource = CryptoJS.enc.Base64.stringify(source);
    encodedSource = encodedSource.replace(/=+$/, '');
    encodedSource = encodedSource.replace(/\+/g, '-');
    encodedSource = encodedSource.replace(/\//g, '_');
    return encodedSource;
}

class TableauService {
    constructor() {
        this.connectedAppConfig = {
            clientId: process.env.TABLEAU_CLIENT_ID,
            secretId: process.env.TABLEAU_SECRET_ID,
            secretKey: process.env.TABLEAU_SECRET_KEY
        };
    }

    getTableauSiteUrl() {
        return process.env.TABLEAU_SITE_URL;
    }

    createTableauJwtToken(platformUserName) {
        let config = this.connectedAppConfig;

        const iss = config.clientId;
        const kid = config.secretId;
        const secret = config.secretKey;
        const scp = ["tableau:views:embed"];

        const header = {
            "alg": "HS256",
            "typ": "JWT",
            "iss": iss,
            "kid": kid,
        };

        const stringifiedHeader = CryptoJS.enc.Utf8.parse(JSON.stringify(header));
        const encodedHeader = base64url(stringifiedHeader);

        let tableauUserName = '';
        if (platformUserName == 'student1' || platformUserName == 'parent1') {
            tableauUserName = 'viviancpy@gmail.com';
        } else if (platformUserName == 'student2' || platformUserName == 'parent2') {
            tableauUserName = 'vivian.py.chan@kepro.com.au';
        } else if (platformUserName == 'teacher1') {
            tableauUserName = 'vivian.py.chan@kepro.com.hk';
        }

        const claimSet = {
            "sub": tableauUserName,
            "aud": "tableau",
            "nbf": Math.round(new Date().getTime()/1000)-100,
            "jti": new Date().getTime().toString(),
            "iss": iss,
            "scp": scp,
            "exp": Math.round(new Date().getTime()/1000)+100
        };

        const stringifiedData = CryptoJS.enc.Utf8.parse(JSON.stringify(claimSet));
        const encodedData = base64url(stringifiedData);
        const token = encodedHeader + "." + encodedData;
        const signature = CryptoJS.HmacSHA256(token, secret);
        const signedToken = token + "." + base64url(signature);

        return signedToken;
    }
}

// Export the class
module.exports = TableauService;
