-- =====================================================================
-- DORAGO TRAVEL PLATFORM - SUPABASE POSTGRESQL MIGRATION
-- Schema version: 1.0.0 (MVP)
-- Architecture: UUID PKs, Soft Deletion, Provenance, Field-Level Overrides, RLS
-- =====================================================================

-- Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. USER PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    display_name TEXT,
    home_airport_code VARCHAR(10),
    home_airport_name TEXT,
    preferred_currency VARCHAR(3) DEFAULT 'USD',
    timezone TEXT DEFAULT 'UTC',
    time_format_24h BOOLEAN DEFAULT FALSE,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMPTZ
);

-- 2. USER SETTINGS & PREFERENCES
CREATE TABLE IF NOT EXISTS public.user_settings (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    notifications_enabled BOOLEAN DEFAULT TRUE,
    flight_departure_reminder_minutes INT DEFAULT 120,
    hotel_checkin_reminder_minutes INT DEFAULT 60,
    offline_cache_enabled BOOLEAN DEFAULT TRUE,
    analytics_consent BOOLEAN DEFAULT TRUE,
    marketing_consent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. TRIPS
CREATE TABLE IF NOT EXISTS public.trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    primary_destination TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    timezone TEXT DEFAULT 'UTC' NOT NULL,
    purpose VARCHAR(20) DEFAULT 'leisure' CHECK (purpose IN ('leisure', 'business', 'bleisure', 'other')),
    status VARCHAR(20) DEFAULT 'upcoming' CHECK (status IN ('draft', 'upcoming', 'current', 'completed', 'archived')),
    cover_image_url TEXT,
    notes TEXT,
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_trips_owner_start ON public.trips(owner_user_id, start_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_trips_status ON public.trips(owner_user_id, status) WHERE deleted_at IS NULL;

-- 4. TRIP DESTINATIONS
CREATE TABLE IF NOT EXISTS public.trip_destinations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    destination_name TEXT NOT NULL,
    country_code VARCHAR(5),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    order_index INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 5. TRAVELER PROFILES & TRIP TRAVELERS
CREATE TABLE IF NOT EXISTS public.traveler_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    is_primary_user BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.trip_travelers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    traveler_id UUID NOT NULL REFERENCES public.traveler_profiles(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'traveler' CHECK (role IN ('organizer', 'traveler', 'viewer')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(trip_id, traveler_id)
);

-- 6. PLAN ITEMS (CORE ITINERARY)
CREATE TABLE IF NOT EXISTS public.plan_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    plan_type VARCHAR(50) NOT NULL CHECK (plan_type IN (
        'flight', 'lodging', 'car_rental', 'rail', 'bus', 'ferry', 'cruise',
        'rideshare', 'parking', 'dining', 'activity', 'event', 'meeting',
        'tour', 'attraction', 'ticket', 'insurance', 'visa_appointment', 'custom_note', 'generic_reservation'
    )),
    title TEXT NOT NULL,
    start_at_local VARCHAR(30) NOT NULL,
    end_at_local VARCHAR(30),
    timezone TEXT DEFAULT 'UTC' NOT NULL,
    start_at_utc TIMESTAMPTZ NOT NULL,
    end_at_utc TIMESTAMPTZ,
    is_all_day BOOLEAN DEFAULT FALSE,
    provider_name TEXT,
    confirmation_number TEXT,
    location_name TEXT,
    address TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    cost_amount NUMERIC(12, 2),
    cost_currency VARCHAR(3) DEFAULT 'USD',
    notes TEXT,
    website_url TEXT,
    contact_phone TEXT,
    contact_email TEXT,
    status VARCHAR(20) DEFAULT 'confirmed' CHECK (status IN ('proposed', 'confirmed', 'tentative', 'cancelled', 'completed')),
    source_type VARCHAR(20) DEFAULT 'manual' CHECK (source_type IN ('manual', 'ai_import', 'forwarded_email', 'provider_sync')),
    source_id UUID,
    ai_confidence NUMERIC(4, 3),
    assigned_traveler_names TEXT[],
    details_json JSONB DEFAULT '{}'::jsonb,
    version_number INT DEFAULT 1 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_plan_items_trip_time ON public.plan_items(trip_id, start_at_utc) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_plan_items_confirmation ON public.plan_items(confirmation_number) WHERE deleted_at IS NULL AND confirmation_number IS NOT NULL;

-- 7. PLAN FIELD SOURCES & USER OVERRIDES (PROVENANCE)
CREATE TABLE IF NOT EXISTS public.plan_field_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES public.plan_items(id) ON DELETE CASCADE,
    field_name TEXT NOT NULL,
    field_value JSONB,
    source_type VARCHAR(30) NOT NULL, -- 'ai_extraction', 'user_override', 'manual_entry'
    confidence NUMERIC(4, 3),
    source_snippet TEXT,
    user_override BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 8. PLAN VERSIONS (HISTORY / AUDIT TRAIL)
CREATE TABLE IF NOT EXISTS public.plan_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES public.plan_items(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    change_source VARCHAR(30) NOT NULL,
    snapshot_json JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 9. REMINDERS
CREATE TABLE IF NOT EXISTS public.plan_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES public.plan_items(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reminder_type VARCHAR(30) NOT NULL, -- '1_day_before', '2_hours_before', '1_hour_before', '30_min_before', 'custom'
    trigger_at_utc TIMESTAMPTZ NOT NULL,
    is_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 10. DOCUMENTS & FILES
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL,
    plan_id UUID REFERENCES public.plan_items(id) ON DELETE SET NULL,
    file_name TEXT NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    storage_path TEXT NOT NULL,
    document_category VARCHAR(30) DEFAULT 'other' CHECK (document_category IN (
        'boarding_pass', 'ticket', 'hotel_voucher', 'rental_agreement',
        'receipt', 'insurance_policy', 'qr_screenshot', 'passport_scan', 'other'
    )),
    ocr_extracted_text TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_documents_trip ON public.documents(trip_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_documents_plan ON public.documents(plan_id) WHERE deleted_at IS NULL;

-- 11. IMPORT SOURCES & PARSER RUNS
CREATE TABLE IF NOT EXISTS public.import_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    source_channel VARCHAR(30) NOT NULL, -- 'text_paste', 'file_upload', 'image_upload'
    raw_text TEXT,
    file_path TEXT,
    file_name TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'parsed', 'reviewed', 'accepted', 'rejected', 'failed')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_import_sources_user_time ON public.import_sources(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.parser_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    import_source_id UUID NOT NULL REFERENCES public.import_sources(id) ON DELETE CASCADE,
    parser_model TEXT NOT NULL,
    overall_confidence NUMERIC(4, 3),
    proposed_trip_title TEXT,
    proposed_destination TEXT,
    extracted_plans_json JSONB NOT NULL,
    warnings_json JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(20) DEFAULT 'success',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 12. PRODUCT ANALYTICS & EVENTS (PRIVACY COMPLIANT)
CREATE TABLE IF NOT EXISTS public.analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    event_name VARCHAR(50) NOT NULL,
    properties_json JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traveler_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_travelers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_field_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parser_runs ENABLE ROW LEVEL SECURITY;

-- Profiles: users can only view and edit their own profile
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- User Settings
CREATE POLICY "Users manage own settings" ON public.user_settings FOR ALL USING (auth.uid() = user_id);

-- Trips: users can only manage trips they own
CREATE POLICY "Users view own trips" ON public.trips FOR SELECT USING (auth.uid() = owner_user_id AND deleted_at IS NULL);
CREATE POLICY "Users insert own trips" ON public.trips FOR INSERT WITH CHECK (auth.uid() = owner_user_id);
CREATE POLICY "Users update own trips" ON public.trips FOR UPDATE USING (auth.uid() = owner_user_id);
CREATE POLICY "Users delete own trips" ON public.trips FOR DELETE USING (auth.uid() = owner_user_id);

-- Plan Items: users can only access plans for their trips
CREATE POLICY "Users manage own plan items" ON public.plan_items FOR ALL USING (
    auth.uid() = user_id AND deleted_at IS NULL
);

-- Documents: users can only access their own documents
CREATE POLICY "Users manage own documents" ON public.documents FOR ALL USING (
    auth.uid() = user_id AND deleted_at IS NULL
);

-- Import Sources & Parser Runs
CREATE POLICY "Users manage own imports" ON public.import_sources FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users view own parser runs" ON public.parser_runs FOR ALL USING (
    EXISTS (SELECT 1 FROM public.import_sources s WHERE s.id = import_source_id AND s.user_id = auth.uid())
);
