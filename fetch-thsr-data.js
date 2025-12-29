import 'dotenv/config';
import { $fetch } from 'ofetch';
import fs from 'fs';
import path from 'path';

const TDX_BASE_URL = 'https://tdx.transportdata.tw/api/basic';
const clientId = process.env.TDX_CLIENT_ID;
const clientSecret = process.env.TDX_CLIENT_SECRET;

// Get OAuth token
async function getToken() {
  const response = await $fetch('https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }).toString(),
  });
  return response.access_token;
}

// Fetch THSR Station data
async function fetchStations(token) {
  console.log('Fetching THSR Station data...');
  const response = await $fetch(`${TDX_BASE_URL}/v2/Rail/THSR/Station?$format=JSON&$top=100`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
  });
  return response;
}

// Fetch THSR Fare data
async function fetchFares(token) {
  console.log('Fetching THSR Fare data...');
  const response = await $fetch(`${TDX_BASE_URL}/v2/Rail/THSR/ODFare?$format=JSON&$top=100`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
  });
  return response;
}

async function main() {
  try {
    const token = await getToken();
    console.log('OAuth token obtained');

    const stations = await fetchStations(token);
    const fares = await fetchFares(token);

    // Save fixtures
    const fixturesDir = './tests/fixtures';
    if (!fs.existsSync(fixturesDir)) {
      fs.mkdirSync(fixturesDir, { recursive: true });
    }

    fs.writeFileSync(
      path.join(fixturesDir, 'thsr-stations.json'),
      JSON.stringify(stations, null, 2)
    );
    
    fs.writeFileSync(
      path.join(fixturesDir, 'thsr-fares.json'),
      JSON.stringify(fares, null, 2)
    );

    console.log(`✅ Saved ${stations.length} stations to tests/fixtures/thsr-stations.json`);
    console.log(`✅ Saved fares data to tests/fixtures/thsr-fares.json`);

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
