/**
 * Dorago Seed Data (Development & Demo mode)
 * Sample San Francisco trip per PRD Section 53
 */

import { Trip, PlanItem, TravelDocument } from '../types';

export const SAMPLE_USER_ID = 'usr_dorago_demo_77';

export const SEED_TRIPS: Trip[] = [
  {
    id: 'trip_sfo_2026',
    ownerUserId: SAMPLE_USER_ID,
    title: 'San Francisco Weekend',
    primaryDestination: 'San Francisco, CA',
    additionalDestinations: ['Napa Valley, CA'],
    startDate: '2026-09-18',
    endDate: '2026-09-22',
    timezone: 'America/Los_Angeles',
    purpose: 'leisure',
    status: 'current',
    coverImageUrl: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?q=80&w=1200&auto=format&fit=crop',
    notes: 'Long weekend exploring Union Square, Mission culinary tour, Golden Gate park and wine country.',
    travelerCount: 2,
    travelers: [
      { id: 'trav_1', userId: SAMPLE_USER_ID, fullName: 'Alex Rivera', isPrimaryUser: true, email: 'alex@example.com' },
      { id: 'trav_2', userId: SAMPLE_USER_ID, fullName: 'Morgan Chen', isPrimaryUser: false, email: 'morgan@example.com' },
    ],
    isArchived: false,
    planCount: 4,
    totalCostGrouped: { USD: 1420.50 },
    createdAt: '2026-09-01T10:00:00Z',
    updatedAt: '2026-09-04T12:00:00Z',
  },
  {
    id: 'trip_tokyo_2026',
    ownerUserId: SAMPLE_USER_ID,
    title: 'Autumn in Tokyo & Kyoto',
    primaryDestination: 'Tokyo, Japan',
    additionalDestinations: ['Kyoto, Japan', 'Osaka, Japan'],
    startDate: '2026-11-05',
    endDate: '2026-11-16',
    timezone: 'Asia/Tokyo',
    purpose: 'leisure',
    status: 'upcoming',
    coverImageUrl: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?q=80&w=1200&auto=format&fit=crop',
    notes: 'Foliage season, Shinkansen rail pass activated, dining reservations at Ginza & Gion.',
    travelerCount: 2,
    travelers: [
      { id: 'trav_1', userId: SAMPLE_USER_ID, fullName: 'Alex Rivera', isPrimaryUser: true },
    ],
    isArchived: false,
    planCount: 3,
    totalCostGrouped: { USD: 3100, JPY: 145000 },
    createdAt: '2026-08-15T08:30:00Z',
    updatedAt: '2026-08-20T14:10:00Z',
  }
];

export const SEED_PLANS: PlanItem[] = [
  {
    id: 'plan_flight_ua211',
    tripId: 'trip_sfo_2026',
    userId: SAMPLE_USER_ID,
    planType: 'flight',
    title: 'Flight UA 211 · Chicago to San Francisco',
    startAtLocal: '2026-09-18T16:20',
    endAtLocal: '2026-09-18T18:55',
    timezone: 'America/Chicago',
    startAtUtc: '2026-09-18T21:20:00Z',
    endAtUtc: '2026-09-19T01:55:00Z',
    isAllDay: false,
    providerName: 'United Airlines',
    confirmationNumber: 'X7Y9PL',
    locationName: "O'Hare International Airport (ORD)",
    address: '10000 W Balmoral Ave, Chicago, IL 60666',
    latitude: 41.9742,
    longitude: -87.9073,
    costAmount: 480.00,
    costCurrency: 'USD',
    notes: 'Carry-on luggage only. Mobile boarding passes downloaded in Apple Wallet.',
    status: 'confirmed',
    sourceType: 'manual',
    details: {
      airline: 'United Airlines',
      flightNumber: 'UA 211',
      departureAirport: 'ORD',
      arrivalAirport: 'SFO',
      departureTerminal: 'Terminal 1',
      departureGate: 'Gate B12',
      arrivalTerminal: 'Terminal 3',
      arrivalGate: 'Gate 74',
      seat: '14B (Economy Plus)',
      cabinClass: 'Economy Plus',
      aircraft: 'Boeing 777-200',
      boardingGroup: 'Group 2',
      recordLocator: 'X7Y9PL',
    },
    versionNumber: 1,
    documentCount: 1,
    createdAt: '2026-09-01T10:15:00Z',
    updatedAt: '2026-09-01T10:15:00Z',
  },
  {
    id: 'plan_hotel_example',
    tripId: 'trip_sfo_2026',
    userId: SAMPLE_USER_ID,
    planType: 'lodging',
    title: 'The Example Hotel Check-in',
    startAtLocal: '2026-09-18T20:00',
    endAtLocal: '2026-09-22T11:00',
    timezone: 'America/Los_Angeles',
    startAtUtc: '2026-09-19T03:00:00Z',
    endAtUtc: '2026-09-22T18:00:00Z',
    isAllDay: false,
    providerName: 'The Example Hotel San Francisco',
    confirmationNumber: 'HTL-882190',
    locationName: 'The Example Hotel',
    address: '123 Market Street, San Francisco, CA 94105',
    latitude: 37.7925,
    longitude: -122.3970,
    costAmount: 720.50,
    costCurrency: 'USD',
    contactPhone: '+1 (415) 555-0199',
    notes: 'Late check-in requested after 8:00 PM. High floor bay view room.',
    status: 'confirmed',
    sourceType: 'manual',
    details: {
      propertyName: 'The Example Hotel San Francisco',
      address: '123 Market Street, San Francisco, CA 94105',
      checkInTime: '20:00',
      checkOutTime: '11:00',
      roomType: 'Deluxe King Bay View',
      cancellationPolicy: 'Free cancellation up to 48 hours before check-in',
    },
    versionNumber: 1,
    documentCount: 1,
    createdAt: '2026-09-01T10:30:00Z',
    updatedAt: '2026-09-01T10:30:00Z',
  },
  {
    id: 'plan_dinner_mission',
    tripId: 'trip_sfo_2026',
    userId: SAMPLE_USER_ID,
    planType: 'dining',
    title: 'Dinner at Mission Bistro',
    startAtLocal: '2026-09-18T21:00',
    endAtLocal: '2026-09-18T22:45',
    timezone: 'America/Los_Angeles',
    startAtUtc: '2026-09-19T04:00:00Z',
    endAtUtc: '2026-09-19T05:45:00Z',
    isAllDay: false,
    providerName: 'OpenTable',
    confirmationNumber: 'OT-44912',
    locationName: 'Mission Bistro',
    address: '2540 Mission St, San Francisco, CA 94110',
    latitude: 37.7587,
    longitude: -122.4191,
    costAmount: 180.00,
    costCurrency: 'USD',
    notes: 'Table for 2. Chef tasting menu reservation with wine pairing.',
    status: 'confirmed',
    sourceType: 'manual',
    details: {
      venueName: 'Mission Bistro',
      partySize: 2,
      bookingReference: 'OT-44912',
      dressCode: 'Smart Casual',
    },
    versionNumber: 1,
    documentCount: 0,
    createdAt: '2026-09-01T11:00:00Z',
    updatedAt: '2026-09-01T11:00:00Z',
  },
  {
    id: 'plan_activity_ggp',
    tripId: 'trip_sfo_2026',
    userId: SAMPLE_USER_ID,
    planType: 'activity',
    title: 'Golden Gate Park & Japanese Tea Garden',
    startAtLocal: '2026-09-19T10:00',
    endAtLocal: '2026-09-19T13:30',
    timezone: 'America/Los_Angeles',
    startAtUtc: '2026-09-19T17:00:00Z',
    endAtUtc: '2026-09-19T20:30:00Z',
    isAllDay: false,
    providerName: 'SF Botanical & Tea Garden',
    confirmationNumber: 'TKT-99120',
    locationName: 'Japanese Tea Garden',
    address: '75 Hagiwara Tea Garden Dr, San Francisco, CA 94118',
    latitude: 37.7704,
    longitude: -122.4700,
    costAmount: 40.00,
    costCurrency: 'USD',
    notes: 'Timed admission tickets booked for 10:00 AM entrance.',
    status: 'confirmed',
    sourceType: 'manual',
    details: {
      venueName: 'Japanese Tea Garden',
      ticketCount: 2,
      ticketType: 'General Admission',
    },
    versionNumber: 1,
    documentCount: 0,
    createdAt: '2026-09-01T11:30:00Z',
    updatedAt: '2026-09-01T11:30:00Z',
  }
];

export const SEED_DOCUMENTS: TravelDocument[] = [
  {
    id: 'doc_boarding_pass_1',
    userId: SAMPLE_USER_ID,
    tripId: 'trip_sfo_2026',
    planId: 'plan_flight_ua211',
    fileName: 'United_UA211_Boarding_Pass.pdf',
    fileType: 'pdf',
    fileSizeBytes: 245000,
    mimeType: 'application/pdf',
    storagePath: '/documents/sfo/ua211_boarding_pass.pdf',
    documentCategory: 'boarding_pass',
    createdAt: '2026-09-01T10:16:00Z',
    updatedAt: '2026-09-01T10:16:00Z',
  },
  {
    id: 'doc_hotel_voucher',
    userId: SAMPLE_USER_ID,
    tripId: 'trip_sfo_2026',
    planId: 'plan_hotel_example',
    fileName: 'Example_Hotel_Booking_Confirmation.pdf',
    fileType: 'pdf',
    fileSizeBytes: 184000,
    mimeType: 'application/pdf',
    storagePath: '/documents/sfo/example_hotel_voucher.pdf',
    documentCategory: 'hotel_voucher',
    createdAt: '2026-09-01T10:31:00Z',
    updatedAt: '2026-09-01T10:31:00Z',
  }
];

export class SeedData {
  static initialize(): void {
    const rawTrips = localStorage.getItem('dorago_trips');
    if (!rawTrips || JSON.parse(rawTrips).length === 0) {
      localStorage.setItem('dorago_trips', JSON.stringify(SEED_TRIPS));
      localStorage.setItem('dorago_plans', JSON.stringify(SEED_PLANS));
      localStorage.setItem('dorago_documents', JSON.stringify(SEED_DOCUMENTS));
    }
  }

  static reset(): void {
    localStorage.setItem('dorago_trips', JSON.stringify(SEED_TRIPS));
    localStorage.setItem('dorago_plans', JSON.stringify(SEED_PLANS));
    localStorage.setItem('dorago_documents', JSON.stringify(SEED_DOCUMENTS));
  }
}

