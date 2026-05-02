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

// ─── Live TDX endpoint payloads ──────────────────────────────────

export interface DailyTrainInfo {
  TrainNo: string;
  Direction: number;
  StartingStationID: string;
  StartingStationName: StationName;
  EndingStationID: string;
  EndingStationName: StationName;
  Note?: Record<string, unknown>;
}

export interface DailyStopTime {
  StopSequence: number;
  StationID: string;
  StationName: StationName;
  ArrivalTime: string;
  DepartureTime: string;
}

export interface DailyTimetableEntry {
  TrainDate: string;
  DailyTrainInfo: DailyTrainInfo;
  StopTimes: DailyStopTime[];
  UpdateTime: string;
  VersionID?: number;
}

// /AvailableSeatStatusList/Today is wrapped in { AvailableSeats: [...] }.
// The element shape varies and is sometimes empty when THSR isn't publishing.
export interface AvailableSeatRecord {
  TrainNo?: string;
  AvailableSeatStatus?: number | string;
  [key: string]: unknown;
}

export interface AvailableSeatsEnvelope {
  AvailableSeats: AvailableSeatRecord[];
  UpdateTime?: string;
  SrcUpdateTime?: string;
}

export interface AlertInfoRecord {
  AlertID: string;
  Title: string;
  Status: string;
  StartTime: string;
  PublishTime: string;
  SrcUpdateTime: string;
  UpdateTime: string;
  Description?: string;
}

export interface NewsRecord {
  NewsID: string;
  Language: string;
  NewsCategory: string;
  Title: string;
  Description: string;
  NewsUrl: string;
  AttachmentUrlList?: unknown[];
  StartTime?: string;
  EndTime?: string;
  PublishTime?: string;
  UpdateTime: string;
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

export interface THSRTrainStatus {
  TrainNumber: string;
  Direction: number;
  CurrentStationID: string;
  CurrentStationName: StationName;
  Status: string; // 'OnTime', 'Delayed', 'Cancelled', 'NotStarted'
  DelayMinutes?: number;
  ScheduledDepartureTime?: string;
  ActualDepartureTime?: string;
  NextStationID?: string;
  NextStationName?: StationName;
  UpdateTime: string;
  VersionID: number;
}

export interface Availability {
  SeatType: string; // 'Standard', 'Business'
  TotalSeats: number;
  AvailableSeats: number;
  ReservedSeats: number;
}

export interface THSRAvailability {
  TrainNumber: string;
  OriginStationID: string;
  OriginStationName: StationName;
  DestinationStationID: string;
  DestinationStationName: StationName;
  AvailabilityDate: string;
  Availabilities: Availability[];
  UpdateTime: string;
  VersionID: number;
}

export interface THSRTrainDelay {
  TrainNumber: string;
  Direction: number;
  CurrentStationID: string;
  CurrentStationName: StationName;
  DelayMinutes: number;
  DelayReason?: string;
  EstimatedArrivalTime?: string;
  UpdateTime: string;
  VersionID: number;
}

export interface ServiceAlert {
  AlertType: string; // 'Delay', 'Cancellation', 'Maintenance', 'Other'
  AffectedLine?: string;
  AffectedStation?: string;
  Message: string;
  Severity: string; // 'Info', 'Warning', 'Critical'
  StartTime: string;
  EndTime?: string;
}

export interface THSRServiceStatus {
  OverallStatus: string; // 'Normal', 'Warning', 'Critical'
  LastUpdateTime: string;
  Alerts: ServiceAlert[];
  StationStatuses?: Record<string, string>;
  VersionID: number;
}

export interface JourneyLeg {
  legNumber: number;
  trainNumber: string;
  fromStation: string;
  toStation: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  seatAvailable: number;
}

export interface JourneyPlan {
  fromStation: string;
  toStation: string;
  departureTime?: string;
  arrivalTime?: string;
  totalDuration: string;
  totalLegs: number;
  legs: JourneyLeg[];
  transferTime?: number; // minutes
}

export interface Transfer {
  fromStation: string;
  toStation: string;
  connectingStation: string;
  departTrain: string;
  connectTrain: string;
  transferDuration: number; // minutes
  feasible: boolean;
}
