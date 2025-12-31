import type { THSRTrainDelay } from '../types/api.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function loadTrainDelay(): THSRTrainDelay[] {
  try {
    const fixtureFile = join(__dirname, '../../tests/fixtures/thsr-train-delay.json');
    const data = readFileSync(fixtureFile, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to load train delay data:', error);
    return [];
  }
}

const trainDelayData = loadTrainDelay();
export default trainDelayData;
