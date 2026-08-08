-- V10__reports_and_audit.sql

-- Ledger of "recent reports" the Reports page lists — the reports
-- themselves are computed live from patients/encounters/consultations,
-- this table just records that a report was generated and by whom.
CREATE TABLE generated_reports (
    id                VARCHAR(30) PRIMARY KEY DEFAULT generate_daily_sequence_id('RPT-'),
    report_type       VARCHAR(100) NOT NULL,
    year              INT NOT NULL,

    -- Denormalized on purpose (same reasoning as login_events below): if
    -- this person's account changes later, the report still correctly
    -- shows who generated it *at the time*.
    generated_by      UUID REFERENCES users (id) ON DELETE SET NULL,
    generated_by_name VARCHAR(150),

    row_count int NOT NULL DEFAULT 0,
    status    VARCHAR(30) NOT NULL DEFAULT 'Completed',

    generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_generated_reports_year ON generated_reports (year);


-- One row per successful sign-in — backs the Audit Logs page. Fields are
-- copied in at the moment of login rather than joined from `users` at
-- read time: if an admin changes someone's role next week, last month's
-- login rows still correctly show the role they had at the time.
CREATE TABLE login_events (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID REFERENCES users (id) ON DELETE SET NULL,
    username       VARCHAR(150) NOT NULL,
    role           VARCHAR(30)  NOT NULL,
    prefix         VARCHAR(30)  NOT NULL DEFAULT '',
    first_name     VARCHAR(100),
    last_name      VARCHAR(100),
    email          VARCHAR(255),
    license_number VARCHAR(100) NOT NULL DEFAULT '',
    logged_in_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_login_events_logged_in_at ON login_events (logged_in_at DESC);
CREATE INDEX idx_login_events_user         ON login_events (user_id);
