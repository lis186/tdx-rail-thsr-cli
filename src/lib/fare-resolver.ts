import type { THSRODFare, Fare } from '../types/api.js';
import { StationResolver } from './station-resolver.js';
import { applyODataOptions, type ODataOptions } from './odata-utils.js';
import thsrStations from '../data/stations.js';

export interface FareBreakdown {
  ticketType: number;
  fareClass: number;
  cabinClass: number;
  price: number;
  description?: string;
}

export interface ResolvedFare {
  from: string;
  to: string;
  standardFare: number;
  fareBreakdown?: FareBreakdown[];
  direction?: number;
}

/**
 * FareResolver - resolves fares between stations
 * Parses THSR ODFare data into readable format
 */
export class FareResolver {
  private fares: Map<string, THSRODFare>;
  private stationResolver: StationResolver;

  constructor(fares: THSRODFare[]) {
    this.fares = new Map();
    this.stationResolver = new StationResolver(thsrStations);

    // Index fares by origin-destination key
    for (const fare of fares) {
      const key = `${fare.OriginStationID}-${fare.DestinationStationID}`;
      this.fares.set(key, fare);
    }
  }

  /**
   * Get fare between two stations by ID
   */
  getFare(originId: string, destinationId: string): ResolvedFare | null {
    const key = `${originId}-${destinationId}`;
    const fareData = this.fares.get(key);

    if (!fareData) {
      return null;
    }

    // Find standard fare (usually the first with lowest price)
    const standardFare = this.findStandardFare(fareData.Fares);

    return {
      from: fareData.OriginStationName.Zh_tw,
      to: fareData.DestinationStationName.Zh_tw,
      standardFare: standardFare,
      fareBreakdown: this.parseFareBreakdown(fareData.Fares),
      direction: fareData.Direction,
    };
  }

  /**
   * Get fare by station names
   */
  getFareByName(
    originName: string,
    destinationName: string
  ): ResolvedFare | null {
    const originStation = this.stationResolver.resolveStation(originName);
    const destStation = this.stationResolver.resolveStation(destinationName);

    if (!originStation || !destStation) {
      return null;
    }

    return this.getFare(originStation.StationID, destStation.StationID);
  }

  /**
   * Get fare by station IDs and date
   */
  getFareByDate(originId: string, destinationId: string, date: string): ResolvedFare | null {
    const key = `${originId}-${destinationId}`;
    const fareData = this.fares.get(key);

    if (!fareData) {
      return null;
    }

    // Check if date is within effective/expiry date range
    if (fareData.EffectiveDate && fareData.ExpiryDate) {
      if (date < fareData.EffectiveDate || date > fareData.ExpiryDate) {
        return null;
      }
    }

    // Find standard fare (usually the first with lowest price)
    const standardFare = this.findStandardFare(fareData.Fares);

    return {
      from: fareData.OriginStationName.Zh_tw,
      to: fareData.DestinationStationName.Zh_tw,
      standardFare: standardFare,
      fareBreakdown: this.parseFareBreakdown(fareData.Fares),
      direction: fareData.Direction,
    };
  }

  /**
   * Get fare by station names and date
   */
  getFareByNameAndDate(
    originName: string,
    destinationName: string,
    date: string
  ): ResolvedFare | null {
    const originStation = this.stationResolver.resolveStation(originName);
    const destStation = this.stationResolver.resolveStation(destinationName);

    if (!originStation || !destStation) {
      return null;
    }

    return this.getFareByDate(originStation.StationID, destStation.StationID, date);
  }

  /**
   * Get all fares for a specific date
   */
  getAllFaresByDate(date: string): THSRODFare[] {
    return Array.from(this.fares.values()).filter((fareData) => {
      if (!fareData.EffectiveDate || !fareData.ExpiryDate) {
        // Include fares without date restrictions
        return true;
      }
      return date >= fareData.EffectiveDate && date <= fareData.ExpiryDate;
    });
  }

  /**
   * Find the standard/lowest fare price
   */
  private findStandardFare(fares: Fare[]): number {
    if (fares.length === 0) return 0;

    return Math.min(...fares.map((f) => f.Price));
  }

  /**
   * Parse fare data into readable breakdown
   */
  private parseFareBreakdown(fares: Fare[]): FareBreakdown[] {
    const breakdown: FareBreakdown[] = [];

    // Group by cabin class
    const grouped = new Map<number, Fare[]>();

    for (const fare of fares) {
      const key = fare.CabinClass;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(fare);
    }

    // Convert to readable format
    for (const [cabinClass, classFares] of grouped) {
      for (const fare of classFares) {
        breakdown.push({
          ticketType: fare.TicketType,
          fareClass: fare.FareClass,
          cabinClass: fare.CabinClass,
          price: fare.Price,
          description: this.describeFare(fare),
        });
      }
    }

    return breakdown;
  }

  /**
   * Describe a fare entry in human-readable text
   */
  private describeFare(fare: Fare): string {
    const cabinNames: Record<number, string> = {
      1: '標準車廂',
      2: '商務車廂',
      3: '自由座',
    };

    const classNames: Record<number, string> = {
      1: '全票',
      9: '優惠票',
    };

    const cabin = cabinNames[fare.CabinClass] || `車廂${fare.CabinClass}`;
    const ticketClass = classNames[fare.FareClass] || `票種${fare.FareClass}`;

    return `${cabin} - ${ticketClass}`;
  }

  /**
   * List all available routes
   */
  listRoutes(): Array<{ from: string; to: string; fromId: string; toId: string }> {
    const routes: Array<{
      from: string;
      to: string;
      fromId: string;
      toId: string;
    }> = [];

    for (const fareData of this.fares.values()) {
      routes.push({
        from: fareData.OriginStationName.Zh_tw,
        fromId: fareData.OriginStationID,
        to: fareData.DestinationStationName.Zh_tw,
        toId: fareData.DestinationStationID,
      });
    }

    return routes;
  }

  /**
   * Get all routes originating from a station
   */
  getRoutesFrom(stationId: string): Array<{ to: string; toId: string }> {
    const routes: Array<{ to: string; toId: string }> = [];

    for (const fareData of this.fares.values()) {
      if (fareData.OriginStationID === stationId) {
        routes.push({
          to: fareData.DestinationStationName.Zh_tw,
          toId: fareData.DestinationStationID,
        });
      }
    }

    return routes;
  }

  /**
   * Get all routes terminating at a station
   */
  getRoutesTo(stationId: string): Array<{ from: string; fromId: string }> {
    const routes: Array<{ from: string; fromId: string }> = [];

    for (const fareData of this.fares.values()) {
      if (fareData.DestinationStationID === stationId) {
        routes.push({
          from: fareData.OriginStationName.Zh_tw,
          fromId: fareData.OriginStationID,
        });
      }
    }

    return routes;
  }

  /**
   * Get all fares with OData query options
   * Supports $select, $filter, $orderby, $top, $skip
   */
  getAllFaresWithOData(options: ODataOptions): (THSRODFare | Record<string, unknown>)[] {
    const faresArray = Array.from(this.fares.values());
    const faresAsRecords = faresArray as unknown as Record<string, unknown>[];
    return applyODataOptions(faresAsRecords, options) as (THSRODFare | Record<string, unknown>)[];
  }
}
