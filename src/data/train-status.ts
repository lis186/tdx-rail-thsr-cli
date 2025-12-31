import type { THSRTrainStatus } from '../types/api.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load train status from fixture file
function loadTrainStatus(): THSRTrainStatus[] {
  try {
    const fixtureFile = join(__dirname, '../../tests/fixtures/thsr-train-status.json');
    const data = readFileSync(fixtureFile, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to load train status data:', error);
    return [];
  }
}

const trainStatusData = loadTrainStatus();

export default trainStatusData;
