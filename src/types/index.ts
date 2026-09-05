/**
 * Dorago Domain Types & Schemas
 * Source of truth: Dorago Enterprise PRD & MVP Architecture
 */

export type PlanCategory =
  | 'flight'
  | 'lodging'
  | 'car_rental'
  | 'rail'
  | 'bus'
  | 'ferry'
  | 'cruise'
  | 'rideshare'
  | 'parking'
  | 'dining'
  | 'activity'
  | 'event'
  | 'meeting'
  | 'tour'
  | 'attraction'
  | 'ticket'
  | 'insurance'
  | 'visa_appointment'
  | 'custom_note'
  | 'generic_reservation';

export type PlanStatus = 'proposed' | 'confirmed' | 'tentative' | 'cancelled' | 'completed';
export type TripPurpose = 'leisure' | 'business' | 'bleisure' | 'other';
export type TripStatus = 'draft' | 'upcoming' | 'current' | 'completed' | 'archived';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  homeAirportCode?: string;
  homeAirportName?: string;
  preferredCurrency: string;
  timezone: string;
  timeFormat24h: boolean;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserSettings {
  userId: string;
  notificationsEnabled: boolean;
  flightDepartureReminderMinutes: number;
  hotelCheckinReminderMinutes: number;
  offlineCacheEnabled: boolean;
  analyticsConsent: boolean;
  marketingConsent: boolean;
}

export interface TripDestination {
  id: string;
  tripId: string;
  destinationName: string;
  countryCode?: string;
  latitude?: number;
  longitude?: number;
  orderIndex: number;
}

export interface TravelerProfile {
  id: string;
  userId: string;
  fullName: string;
  email?: string;
  phone?: string;
  isPrimaryUser: boolean;
}

export interface Trip {
  id: string;
  ownerUserId: string;
  title: string;
  primaryDestination: string;
  additionalDestinations?: string[];
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  timezone: string;
  purpose: TripPurpose;
  status: TripStatus;
  coverImageUrl?: string;
  notes?: string;
  travelerCount: number;
  travelers?: TravelerProfile[];
  isArchived: boolean;
  planCount?: number;
  totalCostGrouped?: Record<string, number>;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

// Type-specific details payloads
export interface FlightDetails {
  airline: string;
  flightNumber: string;
  departureAirport: string;
  arrivalAirport: string;
  departureTerminal?: string;
  departureGate?: string;
  arrivalTerminal?: string;
  arrivalGate?: string;
  recordLocator?: string; // PNR
  ticketNumber?: string;
  seat?: string;
  cabinClass?: string; // Economy, Premium, Business, First
  aircraft?: string;
  boardingGroup?: string;
  baggageClaim?: string;
}

export interface LodgingDetails {
  propertyName: string;
  address?: string;
  checkInTime?: string;
  checkOutTime?: string;
  roomType?: string;
  guestNames?: string[];
  cancellationPolicy?: string;
  depositAmount?: number;
  phone?: string;
}

export interface CarRentalDetails {
  rentalCompany: string;
  pickupLocation: string;
  pickupTime?: string;
  dropoffLocation: string;
  dropoffTime?: string;
  carClass?: string;
  membershipNumber?: string;
  insurancePolicy?: string;
  fuelPolicy?: string;
  driverName?: string;
}

export interface RailBusDetails {
  carrier: string;
  departureStation: string;
  arrivalStation: string;
  routeNumber?: string;
  platform?: string;
  trainNumber?: string;
  seatNumber?: string;
  coachNumber?: string;
  ticketNumber?: string;
  stops?: string[];
}

export interface DiningDetails {
  venueName: string;
  address?: string;
  partySize?: number;
  bookingReference?: string;
  dressCode?: string;
  cancellationPolicy?: string;
  seatingArea?: string;
}

export interface ActivityEventDetails {
  venueName: string;
  address?: string;
  ticketCount?: number;
  bookingReference?: string;
  organizer?: string;
  dressCode?: string;
  meetingPoint?: string;
  ticketType?: string;
}

export interface PlanItem {
  id: string;
  tripId: string;
  userId: string;
  planType: PlanCategory;
  title: string;
  startAtLocal: string; // ISO-like local representation YYYY-MM-DDTHH:mm
  endAtLocal?: string;
  timezone: string;
  startAtUtc: string;   // ISO UTC
  endAtUtc?: string;
  isAllDay: boolean;
  providerName?: string;
  confirmationNumber?: string;
  locationName?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  costAmount?: number;
  costCurrency?: string;
  notes?: string;
  websiteUrl?: string;
  contactPhone?: string;
  contactEmail?: string;
  status: PlanStatus;
  sourceType: 'manual' | 'ai_import' | 'forwarded_email' | 'provider_sync';
  sourceId?: string;
  aiConfidence?: number;
  assignedTravelerNames?: string[];
  details: FlightDetails | LodgingDetails | CarRentalDetails | RailBusDetails | DiningDetails | ActivityEventDetails | Record<string, any>;
  versionNumber: number;
  userOverrides?: Record<string, boolean>; // e.g. { departureGate: true }
  documentCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface PlanVersion {
  id: string;
  planId: string;
  versionNumber: number;
  changeSource: 'manual' | 'ai_import' | 'user_override' | 'system';
  snapshotJson: Partial<PlanItem>;
  createdAt: string;
}

export interface PlanReminder {
  id: string;
  planId: string;
  userId: string;
  reminderType: '1_day_before' | '2_hours_before' | '1_hour_before' | '30_min_before' | 'custom';
  triggerAtUtc: string;
  isSent: boolean;
  createdAt: string;
}

export type DocumentCategory =
  | 'boarding_pass'
  | 'ticket'
  | 'hotel_voucher'
  | 'rental_agreement'
  | 'receipt'
  | 'insurance_policy'
  | 'qr_screenshot'
  | 'passport_scan'
  | 'other';

export interface TravelDocument {
  id: string;
  userId: string;
  tripId?: string;
  planId?: string;
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
  mimeType: string;
  storagePath: string;
  downloadUrl?: string;
  documentCategory: DocumentCategory;
  ocrExtractedText?: string;
  createdAt: string;
  updatedAt: string;
}

// AI Extraction Structures
export interface ExtractedField<T = string | number | null> {
  value: T;
  confidence: number; // 0.00 to 1.00
  sourceSnippet?: string;
  userOverride?: boolean;
}

export interface ExtractedPlanProposal {
  tempId: string;
  planType: PlanCategory;
  title: string;
  overallConfidence: number;
  fields: {
    airline?: ExtractedField<string | null>;
    flightNumber?: ExtractedField<string | null>;
    departureAirport?: ExtractedField<string | null>;
    arrivalAirport?: ExtractedField<string | null>;
    departureDate?: ExtractedField<string | null>;
    departureTime?: ExtractedField<string | null>;
    arrivalDate?: ExtractedField<string | null>;
    arrivalTime?: ExtractedField<string | null>;
    departureTerminal?: ExtractedField<string | null>;
    departureGate?: ExtractedField<string | null>;
    arrivalTerminal?: ExtractedField<string | null>;
    arrivalGate?: ExtractedField<string | null>;
    confirmationNumber?: ExtractedField<string | null>;
    seat?: ExtractedField<string | null>;
    cabinClass?: ExtractedField<string | null>;
    
    // Hotel / Stay
    propertyName?: ExtractedField<string | null>;
    address?: ExtractedField<string | null>;
    checkInDate?: ExtractedField<string | null>;
    checkInTime?: ExtractedField<string | null>;
    checkOutDate?: ExtractedField<string | null>;
    checkOutTime?: ExtractedField<string | null>;
    roomType?: ExtractedField<string | null>;
    
    // Car / Rail / Dining / General
    providerName?: ExtractedField<string | null>;
    pickupLocation?: ExtractedField<string | null>;
    dropoffLocation?: ExtractedField<string | null>;
    partySize?: ExtractedField<number | null>;
    reservationTime?: ExtractedField<string | null>;
    costAmount?: ExtractedField<number | null>;
    costCurrency?: ExtractedField<string | null>;
    notes?: ExtractedField<string | null>;
    [key: string]: ExtractedField<any> | undefined;
  };
  warnings: string[];
  isDuplicate?: boolean;
  duplicatePlanId?: string;
  duplicateReason?: string;
  selectedForImport: boolean;
}

export interface ParserResult {
  sourceId: string;
  parserVersion: string;
  proposedTripTitle?: string;
  proposedDestination?: string;
  proposedStartDate?: string;
  proposedEndDate?: string;
  plans: ExtractedPlanProposal[];
  overallConfidence: number;
  warnings: string[];
  rawSummary?: string;
}

export interface AnalyticsEvent {
  eventName: string;
  properties?: Record<string, any>;
  timestamp: string;
}
