import type { THSRSchedule } from '../types/api.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load schedules from fixture file
function loadSchedules(): THSRSchedule[] {
  try {
    const fixtureFile = join(__dirname, '../../tests/fixtures/thsr-schedules.json');
    const data = readFileSync(fixtureFile, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to load schedules data:', error);
    return [];
  }
}

const schedulesData = loadSchedules();

export default schedulesData;
