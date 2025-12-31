import type { THSRAvailability } from '../types/api.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function loadAvailability(): THSRAvailability[] {
  try {
    const fixtureFile = join(__dirname, '../../tests/fixtures/thsr-availability.json');
    const data = readFileSync(fixtureFile, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to load availability data:', error);
    return [];
  }
}

const availabilityData = loadAvailability();
export default availabilityData;
