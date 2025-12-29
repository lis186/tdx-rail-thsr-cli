import type { THSRODFare } from '../types/api.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load fares from fixture file
function loadFares(): THSRODFare[] {
  try {
    const fixtureFile = join(__dirname, '../../tests/fixtures/thsr-fares.json');
    const data = readFileSync(fixtureFile, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to load fares data:', error);
    return [];
  }
}

const faresData = loadFares();

export default faresData;
