/**
 * THSR API Type Definitions
 * Based on TDX v2 Rail/THSR endpoints
 */

export interface StationName {
  Zh_tw: string;
  En: string;
}

export interface StationPosition {
  PositionLon: number;
  PositionLat: number;
  GeoHash: string;
}

export interface THSRStation {
  StationUID: string;
  StationID: string;
  StationCode: string;
  StationName: StationName;
  StationAddress: string;
  OperatorID: string;
  StationPosition: StationPosition;
  LocationCity: string;
  LocationCityCode: string;
  LocationTown: string;
  LocationTownCode: string;
  UpdateTime: string;
  VersionID: number;
}

export interface Fare {
  TicketType: number;
  FareClass: number;
  CabinClass: number;
  Price: number;
}

export interface THSRODFare {
  OriginStationID: string;
  OriginStationName: StationName;
  DestinationStationID: string;
  DestinationStationName: StationName;
  Direction: number;
  Fares: Fare[];
  EffectiveDate?: string;
  ExpiryDate?: string;
}

export interface StationInfo {
  id: string;
  code: string;
  name: string;
  city: string;
  address: string;
  position?: {
    lon: number;
    lat: number;
  };
}

export interface FareInfo {
  from: string;
  to: string;
  fares: {
    standard: number;
    businessClass?: number;
    studentDiscount?: number;
  };
}

export interface Operator {
  OperatorID: string;
  OperatorCode: string;
  OperatorName: StationName;
  OperatorPhone?: string;
  OperatorWebsiteUrl?: string;
  UpdateTime: string;
  VersionID: number;
}

export interface THSRSchedule {
  TrainNumber: string;
  Direction: number;
  StartingStationID: string;
  StartingStationName: StationName;
  EndingStationID: string;
  EndingStationName: StationName;
  ScheduleDate: string;
  StopTimes: ScheduleStop[];
  OperatorID: string;
  UpdateTime: string;
  VersionID: number;
}

export interface ScheduleStop {
  StationID: string;
  StationName: StationName;
  ArrivalTime?: string;
  DepartureTime?: string;
  StopSequence: number;
}
