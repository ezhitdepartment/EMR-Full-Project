# hospital-backend

Spring Boot 3 / Java 21 REST API for the **E. Zarate Hospital** system — a self-hosted
Electronic Medical Records (EMR) and hospital operations platform. Replaces the
project's original Supabase backend (Auth, Storage, Realtime, Postgres, RLS) with a
fully self-hosted stack: this API + PostgreSQL, no third-party service dependency.

> Full technical reference (architecture, schema, complete API list, design patterns)
> lives in the companion **Technical Documentation**. Deployment/ops procedures live in
> the **Operations & Deployment Runbook**. Feature walkthroughs for staff live in the
> **End-User Manual**. This README covers just what you need to get the backend
> running locally.

## Status

Feature-complete for the current scope: 13 controllers, ~65 endpoints, 24 database
tables, JWT-based auth, role-based access control. Actively maintained — see
`src/main/resources/db/migration/` for the full change history (V1–V18 as of this
writing).

## 1. Prerequisites

| Tool | Version | Check |
|---|---|---|
| JDK | 21 | `java -version` |
| Maven | 3.9+ (optional — see below) | `mvn -version` |
| PostgreSQL | 16 (via Docker, or native install) | — |
| Docker Desktop | latest | for the bundled `docker-compose.yml` Postgres |

You don't strictly need Maven installed globally — an IDE with Java support (IntelliJ
IDEA, VS Code + "Extension Pack for Java") bundles its own and resolves dependencies
automatically on import.

## 2. Quick Start

```bash
# 1. Start Postgres (from the folder containing docker-compose.yml)
docker compose up -d

# 2. Run the backend
mvn spring-boot:run
```

Default port: `8080`. Swagger UI: `http://localhost:8080/swagger-ui.html` — the
fastest way to exercise any endpoint without Postman. OpenAPI spec:
`http://localhost:8080/v3/api-docs`.

Flyway applies every migration in `db/migration/` automatically on startup — no
separate migration step needed.

A one-click `start-ezarate.bat` launcher (starts Postgres, backend, and the frontend
together) is available at the project root — see the Ops Runbook for details.

## 3. Configuration / Profiles

Active profile is picked via `SPRING_PROFILES_ACTIVE`:

- **`local`** (default) — Postgres on `localhost:5432/ezarate_hospital`, a built-in
  JWT secret fallback for convenience (never reuse this value anywhere else).
- **`nas`** — reads `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD`, and
  a **required** `JWT_SECRET` from the environment (no fallback — the app deliberately
  refuses to start without one). Name predates the current deployment target (a
  dedicated Windows Server, not a NAS) — functionally correct either way.

Full environment variable reference: see the Operations & Deployment Runbook.

## 4. Folder Structure

```
src/main/java/com/ezarate/hospital/
├── HospitalBackendApplication.java   # entry point
├── config/                           # CORS, Swagger, JPA/auditing, security config
├── security/                         # JWT filter, JwtService, password encoder
└── modules/                          # one package per business domain, each
    ├── auth/                         #   controller/service/repository/entity/dto
    ├── user/                         # staff account admin (Roles page)
    ├── patient/                      # patient records
    ├── encounter/                    # registration, triage, waivers, census no.
    ├── laborder/                     # lab/x-ray orders, tests, queue, result files
    ├── medicineprescription/         # prescriptions
    ├── consultation/                 # consultation history (nurse/doctor entries)
    ├── patientdocument/              # EMR, discharge, konsulta, medcert, etc.
    ├── admittedpatient/              # Admitted Patients view/discharge
    ├── report/                       # generated report ledger
    ├── notification/                 # role-targeted notifications
    ├── auditlog/                     # login event history
    └── referencedata/                # doctors, lab test catalog, medicine catalog
```

`src/main/resources/`
```
application.yml         # shared config (JWT, CORS, Flyway, actuator)
application-local.yml   # local Postgres overrides
application-nas.yml     # server deployment overrides (see §3)
db/migration/           # Flyway SQL migrations (V1__init.sql, V2__..., ...)
```

## 5. Key Design Decisions

- **Schema owned by Flyway, not Hibernate** — `ddl-auto: validate`. Every schema
  change is a new migration file, never a hand-edit of an already-applied one.
- **No database-level Row-Level Security** — access control is enforced in the
  controller layer (Spring Security + role checks), not in Postgres, unlike the
  original Supabase/RLS design this replaced.
- **Human-readable, race-safe sequence IDs** (`E-20260803-0001`,
  `LAB-20260803-0001`, ...) generated via an atomic per-day counter table
  (`generate_daily_sequence_id()`), not `COUNT(*) + 1`.
- **Typed core + JSONB hybrid** for the Consultation Form — a handful of
  report/filter-relevant fields are real columns; the rest of the 100+-field form
  lives in a `details JSONB` column.

See the Technical Documentation for the full write-up of these and other patterns.

## 6. Dependencies

| Dependency | Purpose |
|---|---|
| `spring-boot-starter-web` | REST controllers, embedded Tomcat |
| `spring-boot-starter-data-jpa` | Entities/repositories over Postgres |
| `spring-boot-starter-validation` | `@Valid` DTO validation |
| `spring-boot-starter-security` | Auth, route protection |
| `jjwt-api` / `jjwt-impl` / `jjwt-jackson` (0.12.6) | Issue & verify JWTs |
| `postgresql` | JDBC driver |
| `flyway-core` + `flyway-database-postgresql` | Versioned schema migrations |
| `lombok` (1.18.42, pinned above Spring Boot's managed version) | Less boilerplate |
| `springdoc-openapi-starter-webmvc-ui` (2.6.0) | Swagger UI |
| `spring-boot-starter-actuator` | `/actuator/health`, `/actuator/info` |
| `spring-boot-devtools` | Auto-restart on save during dev (excluded from packaged JAR) |
| `spring-boot-starter-test` + `spring-security-test` | Unit/integration tests |

## 7. Building for Deployment

```bash
mvn clean package
java -jar target/hospital-backend.jar
```

See the Operations & Deployment Runbook for the full Windows Server deployment plan
(NSSM service wrapper, environment variables, backup strategy).