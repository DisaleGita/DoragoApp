"""Initial server-authoritative Dorago schema.

Revision ID: 0001
Revises: None
"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def timestamps() -> list[sa.Column]:
    return [
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    ]


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("email", sa.String(320), nullable=False),
        sa.Column("email_verified_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("display_name", sa.String(200)),
        sa.Column("home_airport_code", sa.String(10)),
        sa.Column("home_airport_name", sa.String(200)),
        sa.Column("preferred_currency", sa.String(3), server_default="USD", nullable=False),
        sa.Column("timezone", sa.String(100), server_default="UTC", nullable=False),
        sa.Column("time_format_24h", sa.Boolean(), server_default=sa.false(), nullable=False),
        *timestamps(),
        sa.Column("deleted_at", sa.DateTime(timezone=True)),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "user_settings",
        sa.Column(
            "user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
        ),
        sa.Column("notifications_enabled", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("offline_cache_enabled", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("analytics_consent", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("marketing_consent", sa.Boolean(), server_default=sa.false(), nullable=False),
        *timestamps(),
    )
    op.create_table(
        "otp_challenges",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("email", sa.String(320), nullable=False),
        sa.Column("code_digest", sa.String(64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("attempt_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("max_attempts", sa.Integer(), nullable=False),
        sa.Column("consumed_at", sa.DateTime(timezone=True)),
        sa.Column("requested_ip_digest", sa.String(64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_otp_challenges_email", "otp_challenges", ["email"])
    op.create_table(
        "auth_sessions",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("device_name", sa.String(200)),
        sa.Column("client_type", sa.String(20), nullable=False),
        sa.Column("ip_digest", sa.String(64), nullable=False),
        sa.Column("user_agent", sa.String(500)),
        sa.Column("revoked_at", sa.DateTime(timezone=True)),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=False),
        *timestamps(),
        sa.CheckConstraint("client_type IN ('web','mobile')", name="ck_auth_sessions_client_type"),
    )
    op.create_index("ix_auth_sessions_user_id", "auth_sessions", ["user_id"])
    op.create_table(
        "refresh_tokens",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "session_id",
            sa.Uuid(),
            sa.ForeignKey("auth_sessions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("family_id", sa.Uuid(), nullable=False),
        sa.Column("token_digest", sa.String(64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True)),
        sa.Column("revoked_at", sa.DateTime(timezone=True)),
        sa.Column(
            "replaced_by_id", sa.Uuid(), sa.ForeignKey("refresh_tokens.id", ondelete="SET NULL")
        ),
    )
    op.create_index("ix_refresh_tokens_session_id", "refresh_tokens", ["session_id"])
    op.create_index("ix_refresh_tokens_family_id", "refresh_tokens", ["family_id"])
    op.create_index(
        "ix_refresh_tokens_token_digest", "refresh_tokens", ["token_digest"], unique=True
    )

    op.create_table(
        "trips",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "owner_user_id",
            sa.Uuid(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("title", sa.String(300), nullable=False),
        sa.Column("primary_destination", sa.String(300), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("timezone", sa.String(100), nullable=False),
        sa.Column("purpose", sa.String(20), server_default="leisure", nullable=False),
        sa.Column("status", sa.String(20), server_default="upcoming", nullable=False),
        sa.Column("cover_image_url", sa.String(1000)),
        sa.Column("notes", sa.Text()),
        sa.Column("is_archived", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("version", sa.Integer(), server_default="1", nullable=False),
        *timestamps(),
        sa.Column("deleted_at", sa.DateTime(timezone=True)),
        sa.CheckConstraint("end_date >= start_date", name="ck_trips_date_range"),
        sa.CheckConstraint(
            "purpose IN ('leisure','business','bleisure','other')", name="ck_trips_purpose"
        ),
        sa.CheckConstraint(
            "status IN ('draft','upcoming','current','completed','archived')",
            name="ck_trips_status",
        ),
    )
    op.create_index("ix_trips_owner_user_id", "trips", ["owner_user_id"])
    op.create_index("ix_trips_owner_start", "trips", ["owner_user_id", "start_date"])
    op.create_table(
        "trip_destinations",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "trip_id", sa.Uuid(), sa.ForeignKey("trips.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("destination_name", sa.String(300), nullable=False),
        sa.Column("country_code", sa.String(5)),
        sa.Column("latitude", sa.Float()),
        sa.Column("longitude", sa.Float()),
        sa.Column("order_index", sa.Integer(), server_default="0", nullable=False),
        *timestamps(),
    )
    op.create_index("ix_trip_destinations_trip_id", "trip_destinations", ["trip_id"])
    op.create_table(
        "traveler_profiles",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("full_name", sa.String(200), nullable=False),
        sa.Column("email", sa.String(320)),
        sa.Column("phone", sa.String(50)),
        sa.Column("is_primary_user", sa.Boolean(), server_default=sa.false(), nullable=False),
        *timestamps(),
        sa.Column("deleted_at", sa.DateTime(timezone=True)),
    )
    op.create_index("ix_traveler_profiles_user_id", "traveler_profiles", ["user_id"])
    op.create_table(
        "trip_travelers",
        sa.Column(
            "trip_id", sa.Uuid(), sa.ForeignKey("trips.id", ondelete="CASCADE"), primary_key=True
        ),
        sa.Column(
            "traveler_id",
            sa.Uuid(),
            sa.ForeignKey("traveler_profiles.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("role", sa.String(20), server_default="traveler", nullable=False),
        *timestamps(),
        sa.CheckConstraint(
            "role IN ('organizer','traveler','viewer')", name="ck_trip_travelers_role"
        ),
    )

    op.create_table(
        "import_sources",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("source_channel", sa.String(30), nullable=False),
        sa.Column("raw_text", sa.Text()),
        sa.Column("file_storage_key", sa.String(1000)),
        sa.Column("file_name", sa.String(500)),
        sa.Column("mime_type", sa.String(100)),
        sa.Column("status", sa.String(20), server_default="pending", nullable=False),
        *timestamps(),
        sa.CheckConstraint(
            "status IN ('pending','parsed','accepted','rejected','failed')",
            name="ck_import_sources_status",
        ),
        sa.CheckConstraint(
            "source_channel IN ('text_paste','file_upload')",
            name="ck_import_sources_channel",
        ),
    )
    op.create_index("ix_import_sources_user_id", "import_sources", ["user_id"])
    op.create_table(
        "parser_runs",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "import_source_id",
            sa.Uuid(),
            sa.ForeignKey("import_sources.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("parser_model", sa.String(100), nullable=False),
        sa.Column("overall_confidence", sa.Numeric(4, 3)),
        sa.Column("extracted_result", postgresql.JSONB()),
        sa.Column("warnings", postgresql.JSONB(), server_default="[]", nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("error_code", sa.String(100)),
        *timestamps(),
        sa.CheckConstraint("status IN ('success','failed')", name="ck_parser_runs_status"),
    )
    op.create_index("ix_parser_runs_import_source_id", "parser_runs", ["import_source_id"])

    plan_types = "'flight','lodging','car_rental','rail','bus','ferry','cruise','shuttle','rideshare','parking','dining','meeting','event','activity','tour','attraction','ticket','insurance','visa_appointment','custom_note','generic_reservation'"
    op.create_table(
        "plan_items",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "trip_id", sa.Uuid(), sa.ForeignKey("trips.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("plan_type", sa.String(50), nullable=False),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("start_local", sa.DateTime(timezone=False), nullable=False),
        sa.Column("start_timezone", sa.String(100), nullable=False),
        sa.Column("start_utc", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_local", sa.DateTime(timezone=False)),
        sa.Column("end_timezone", sa.String(100)),
        sa.Column("end_utc", sa.DateTime(timezone=True)),
        sa.Column("is_all_day", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("provider_name", sa.String(300)),
        sa.Column("confirmation_number", sa.String(200)),
        sa.Column("location_name", sa.String(500)),
        sa.Column("address", sa.String(1000)),
        sa.Column("latitude", sa.Float()),
        sa.Column("longitude", sa.Float()),
        sa.Column("cost_amount", sa.Numeric(12, 2)),
        sa.Column("cost_currency", sa.String(3)),
        sa.Column("notes", sa.Text()),
        sa.Column("website_url", sa.String(1000)),
        sa.Column("contact_phone", sa.String(50)),
        sa.Column("contact_email", sa.String(320)),
        sa.Column("status", sa.String(20), server_default="confirmed", nullable=False),
        sa.Column("source_type", sa.String(30), server_default="manual", nullable=False),
        sa.Column("source_id", sa.Uuid(), sa.ForeignKey("import_sources.id", ondelete="SET NULL")),
        sa.Column("ai_confidence", sa.Numeric(4, 3)),
        sa.Column(
            "assigned_traveler_names", postgresql.JSONB(), server_default="[]", nullable=False
        ),
        sa.Column("details", postgresql.JSONB(), server_default="{}", nullable=False),
        sa.Column("version", sa.Integer(), server_default="1", nullable=False),
        *timestamps(),
        sa.Column("deleted_at", sa.DateTime(timezone=True)),
        sa.CheckConstraint(f"plan_type IN ({plan_types})", name="ck_plan_items_type"),
        sa.CheckConstraint(
            "status IN ('proposed','confirmed','tentative','cancelled','completed')",
            name="ck_plan_items_status",
        ),
        sa.CheckConstraint(
            "source_type IN ('manual','ai_import','forwarded_email','provider_sync')",
            name="ck_plan_items_source_type",
        ),
        sa.CheckConstraint("cost_amount IS NULL OR cost_amount >= 0", name="ck_plan_items_cost"),
    )
    op.create_index("ix_plan_items_trip_id", "plan_items", ["trip_id"])
    op.create_index("ix_plan_items_start_utc", "plan_items", ["start_utc"])
    op.create_index("ix_plan_items_confirmation_number", "plan_items", ["confirmation_number"])
    op.create_index("ix_plan_items_source_id", "plan_items", ["source_id"])
    op.create_table(
        "plan_field_sources",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "plan_id", sa.Uuid(), sa.ForeignKey("plan_items.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("field_name", sa.String(200), nullable=False),
        sa.Column("field_value", postgresql.JSONB()),
        sa.Column("source_type", sa.String(30), nullable=False),
        sa.Column("confidence", sa.Numeric(4, 3)),
        sa.Column("source_snippet", sa.Text()),
        sa.Column("user_override", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_plan_field_sources_plan_id", "plan_field_sources", ["plan_id"])
    op.create_table(
        "plan_versions",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "plan_id", sa.Uuid(), sa.ForeignKey("plan_items.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("change_source", sa.String(30), nullable=False),
        sa.Column("snapshot", postgresql.JSONB(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("plan_id", "version", name="uq_plan_versions_plan_version"),
    )
    op.create_index("ix_plan_versions_plan_id", "plan_versions", ["plan_id"])
    op.create_table(
        "plan_reminders",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "plan_id", sa.Uuid(), sa.ForeignKey("plan_items.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column(
            "user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("reminder_type", sa.String(30), nullable=False),
        sa.Column("trigger_at_utc", sa.DateTime(timezone=True), nullable=False),
        sa.Column("is_sent", sa.Boolean(), server_default=sa.false(), nullable=False),
        *timestamps(),
        sa.CheckConstraint(
            "reminder_type IN ('at_start','30_minutes_before','1_hour_before','2_hours_before','1_day_before','custom')",
            name="ck_plan_reminders_type",
        ),
    )
    op.create_index("ix_plan_reminders_plan_id", "plan_reminders", ["plan_id"])
    op.create_index("ix_plan_reminders_user_id", "plan_reminders", ["user_id"])
    op.create_table(
        "documents",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column(
            "trip_id", sa.Uuid(), sa.ForeignKey("trips.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("plan_id", sa.Uuid(), sa.ForeignKey("plan_items.id", ondelete="SET NULL")),
        sa.Column("file_name", sa.String(500), nullable=False),
        sa.Column("extension", sa.String(20), nullable=False),
        sa.Column("file_size_bytes", sa.BigInteger(), nullable=False),
        sa.Column("mime_type", sa.String(100), nullable=False),
        sa.Column("storage_key", sa.String(1000), nullable=False, unique=True),
        sa.Column("document_category", sa.String(30), server_default="other", nullable=False),
        *timestamps(),
        sa.Column("deleted_at", sa.DateTime(timezone=True)),
        sa.CheckConstraint(
            "document_category IN ('boarding_pass','ticket','hotel_voucher','rental_agreement','receipt','insurance_policy','qr_screenshot','passport_scan','other')",
            name="ck_documents_category",
        ),
        sa.CheckConstraint("file_size_bytes > 0", name="ck_documents_file_size"),
    )
    op.create_index("ix_documents_user_id", "documents", ["user_id"])
    op.create_index("ix_documents_trip_id", "documents", ["trip_id"])
    op.create_index("ix_documents_plan_id", "documents", ["plan_id"])
    op.create_table(
        "analytics_events",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("event_name", sa.String(100), nullable=False),
        sa.Column("properties", postgresql.JSONB(), server_default="{}", nullable=False),
        *timestamps(),
    )
    op.create_index("ix_analytics_events_user_id", "analytics_events", ["user_id"])
    op.create_table(
        "processed_mutations",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("mutation_id", sa.Uuid(), nullable=False),
        sa.Column("operation", sa.String(30), nullable=False),
        sa.Column("result", postgresql.JSONB(), nullable=False),
        *timestamps(),
        sa.UniqueConstraint("user_id", "mutation_id", name="uq_processed_mutations_user_mutation"),
    )
    op.create_index("ix_processed_mutations_user_id", "processed_mutations", ["user_id"])

    op.execute("""
        CREATE FUNCTION dorago_set_updated_at() RETURNS trigger AS $$
        BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
        $$ LANGUAGE plpgsql
    """)
    for table in (
        "users",
        "user_settings",
        "auth_sessions",
        "trips",
        "trip_destinations",
        "traveler_profiles",
        "trip_travelers",
        "import_sources",
        "parser_runs",
        "plan_items",
        "plan_reminders",
        "documents",
        "analytics_events",
        "processed_mutations",
    ):
        op.execute(
            f"CREATE TRIGGER trg_{table}_updated_at BEFORE UPDATE ON {table} "
            "FOR EACH ROW EXECUTE FUNCTION dorago_set_updated_at()"
        )


def downgrade() -> None:
    for table in (
        "processed_mutations",
        "analytics_events",
        "documents",
        "plan_reminders",
        "plan_versions",
        "plan_field_sources",
        "plan_items",
        "parser_runs",
        "import_sources",
        "trip_travelers",
        "traveler_profiles",
        "trip_destinations",
        "trips",
        "refresh_tokens",
        "auth_sessions",
        "otp_challenges",
        "user_settings",
        "users",
    ):
        op.drop_table(table)
    op.execute("DROP FUNCTION IF EXISTS dorago_set_updated_at()")
