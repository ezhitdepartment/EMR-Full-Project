-- V1__init.sql
-- Replaces Supabase's auth.users + public.profiles with a single table.
-- We control password hashing ourselves now (BCrypt via Spring Security),
-- so there's no separate "auth" table/provider — just one users table.

CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- gives us gen_random_uuid()

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    username        VARCHAR(150) NOT NULL UNIQUE,
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,   -- BCrypt hash, set by the app, never plaintext

    role            VARCHAR(30)  NOT NULL,
    -- Mirrors src/data/roles.js ROLE_OPTIONS — keep both in sync if you add a role.
    CONSTRAINT chk_users_role CHECK (role IN (
        'admin', 'doctor', 'er_nurse', 'opd_nurse', 'med_tech',
        'xray_tech', 'cashier', 'pharmacist', 'staff'
    )),

    prefix          VARCHAR(20)  NOT NULL DEFAULT '',
    first_name      VARCHAR(100) NOT NULL DEFAULT '',
    last_name       VARCHAR(100) NOT NULL DEFAULT '',
    license_number  VARCHAR(100) NOT NULL DEFAULT '',
    photo           TEXT, -- base64 data URL, same pattern your Supabase profiles.photo used

    status          VARCHAR(20)  NOT NULL DEFAULT 'active',
    CONSTRAINT chk_users_status CHECK (status IN ('active', 'suspended')),

    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_role   ON users (role);
CREATE INDEX idx_users_status ON users (status);

-- Keeps updated_at current on every UPDATE, without the app having to remember to set it.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
