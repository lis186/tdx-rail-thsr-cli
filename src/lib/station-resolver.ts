import type { THSRStation, StationInfo } from '../types/api';
import { applyODataOptions, type ODataOptions } from './odata-utils';

/**
 * StationResolver - resolves station names to station data
 * Supports:
 * - Chinese names (台北, 台中, etc.)
 * - English names (Taipei, Taichung, etc.)
 * - Station codes (TPE, TAC, etc.)
 * - Fuzzy matching and partial names
 * - OData query parameters ($select, $filter, $orderby, $top, $skip)
 */
export class StationResolver {
  private stations: THSRStation[];

  constructor(stations: THSRStation[]) {
    this.stations = stations;
  }

  /**
   * Normalize search string for comparison
   */
  private normalize(text: string): string {
    return text.toLowerCase().trim();
  }

  /**
   * Calculate similarity score between two strings (0-1)
   */
  private calculateSimilarity(text1: string, text2: string): number {
    const s1 = this.normalize(text1);
    const s2 = this.normalize(text2);

    if (s1 === s2) return 1;
    if (s1.includes(s2) || s2.includes(s1)) return 0.9;

    // Levenshtein distance
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return 1 - editDistance / longer.length;
  }

  /**
   * Calculate Levenshtein distance
   */
  private levenshteinDistance(s1: string, s2: string): number {
    const track = Array(s2.length + 1)
      .fill(null)
      .map(() => Array(s1.length + 1).fill(0));

    for (let i = 0; i <= s1.length; i += 1) {
      track[0][i] = i;
    }
    for (let j = 0; j <= s2.length; j += 1) {
      track[j][0] = j;
    }

    for (let j = 1; j <= s2.length; j += 1) {
      for (let i = 1; i <= s1.length; i += 1) {
        const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
        track[j][i] = Math.min(
          track[j][i - 1] + 1,
          track[j - 1][i] + 1,
          track[j - 1][i - 1] + indicator
        );
      }
    }

    return track[s2.length][s1.length];
  }

  /**
   * Resolve a station by name/code
   * Returns the first match with highest similarity score
   */
  resolveStation(query: string): THSRStation | null {
    const normalizedQuery = this.normalize(query);

    // Exact matches first
    for (const station of this.stations) {
      if (this.normalize(station.StationName.Zh_tw) === normalizedQuery) {
        return station;
      }
      if (this.normalize(station.StationName.En) === normalizedQuery) {
        return station;
      }
      if (this.normalize(station.StationCode) === normalizedQuery) {
        return station;
      }
      if (this.normalize(station.StationID) === normalizedQuery) {
        return station;
      }
    }

    // Fuzzy match - find best match
    let bestMatch: THSRStation | null = null;
    let bestScore = 0.7; // Minimum similarity threshold

    for (const station of this.stations) {
      const zhScore = this.calculateSimilarity(query, station.StationName.Zh_tw);
      const enScore = this.calculateSimilarity(query, station.StationName.En);
      const codeScore = this.calculateSimilarity(query, station.StationCode);

      const maxScore = Math.max(zhScore, enScore, codeScore);

      if (maxScore > bestScore) {
        bestScore = maxScore;
        bestMatch = station;
      }
    }

    return bestMatch;
  }

  /**
   * Get all stations
   */
  getAllStations(): THSRStation[] {
    return [...this.stations];
  }

  /**
   * Search stations by query (partial match)
   */
  searchStations(query: string): THSRStation[] {
    const normalizedQuery = this.normalize(query);

    return this.stations.filter((station) => {
      const zhMatch = this.normalize(station.StationName.Zh_tw).includes(normalizedQuery);
      const enMatch = this.normalize(station.StationName.En).includes(normalizedQuery);
      const cityMatch = this.normalize(station.LocationCity).includes(normalizedQuery);
      const codeMatch = this.normalize(station.StationCode).includes(normalizedQuery);

      return zhMatch || enMatch || cityMatch || codeMatch;
    });
  }

  /**
   * Get normalized station info
   */
  getStationInfo(query: string): StationInfo | null {
    const station = this.resolveStation(query);
    if (!station) return null;

    return {
      id: station.StationID,
      code: station.StationCode,
      name: station.StationName.Zh_tw,
      city: station.LocationCity,
      address: station.StationAddress,
      position: {
        lon: station.StationPosition.PositionLon,
        lat: station.StationPosition.PositionLat,
      },
    };
  }

  /**
   * Get all stations with OData query options
   * Supports $select, $filter, $orderby, $top, $skip
   */
  getAllStationsWithOData(options: ODataOptions): (THSRStation | Record<string, unknown>)[] {
    const stationsAsRecords = this.stations as unknown as Record<string, unknown>[];
    return applyODataOptions(stationsAsRecords, options) as (THSRStation | Record<string, unknown>)[];
  }
}
