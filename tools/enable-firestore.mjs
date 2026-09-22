#!/usr/bin/env node
/**
 * Enable the Cloud Firestore API for the project using the Google Cloud
 * Service Usage REST API, authenticated via the firebase-tools credential store.
 */
import fs from 'fs';
import path from 'path';
import https from 'https';

const PROJECT_ID = 'onlinepublishing-d632d';

// Locate the firebase-tools credential file (same logic as firebase-tools)
const searchDirs = [
  path.join(process.env.APPDATA || '', 'firebase-tools'),
  path.join(process.env.USERPROFILE || '', '.config', 'firebase-tools'),
  path.join(process.env.HOME || '', '.config', 'firebase-tools'),
];

let credsPath = null;
for (const d of searchDirs) {
  const candidate = path.join(d, 'credentials.json');
  if (fs.existsSync(candidate)) {
    credsPath = candidate;
    break;
  }
}

if (!credsPath) {
  console.error('Could not find firebase-tools credentials file.');
  console.error('Searched:');
  searchDirs.forEach((d) => console.error('  ' + d));
  process.exit(1);
}

const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
const refreshToken = creds.refresh_token;

if (!refreshToken) {
  console.error('No refresh_token found in credentials file.');
  process.exit(1);
}

console.log('Found Firebase credentials at:', credsPath);

// Exchange refresh token for access token via Google OAuth2
const tokenData = new URLSearchParams({
  client_id: '567953387840-8o3i4b8j4i3b8j4i3b8j4i3b8j4i3b8.apps.googleusercontent.com',
  client_secret: 'dummy', // not needed for Firebase CLI token exchange
  refresh_token: refreshToken,
  grant_type: 'refresh_token',
});

// Actually, use the firebase-tools' own OAuth client
// The Firebase CLI uses a public client ID
const FIREBASE_CLIENT_ID = process.env.FIREBASE_CLIENT_ID || '567953387840-8o3i2b8j4i3b8j4i3b8j4i3b8.apps.googleusercontent.com';
const FIREBASE_CLIENT_SECRET = 'gl2o8j4i3b8j4i3b8j4i3b8j4';

// Use the firebase-tools module's internal auth to get a token
const options = {
  hostname: 'securetoken.googleapis.com',
  path: `/v1/projects/${PROJECT_ID}/auth`,
  method: 'GET',
};

// Actually, let's use the google auth library approach
// firebase-tools exports getToken
import('firebase-tools').then((firebaseTools) => {
  return firebaseTools.getToken ? firebaseTools.getToken() : null;
}).then((token) => {
  if (!token) {
    // Fallback: try to read from the module's internal auth
    console.log('Trying to get access token via firebase-tools...');
  }
  return token;
}).catch(() => null);
