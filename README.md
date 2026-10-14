# Sahachar

Sahachar is the Faculty Sensitization Course portal for IIT Kharagpur. Faculty can sign in with an email verification code, watch course modules, take quizzes, track progress, and keep course notes. Administrators can manage module content and review faculty completion records and assessment attempts.

## Development

### Libraries / Frameworks Used

- [React 19](https://react.dev/) — frontend components.
- [Vite 8](https://vite.dev/) — development server and production builds.
- [React Router](https://reactrouter.com/) — client-side routing.
- [Lucide React](https://lucide.dev/) — icons.
- [React YouTube](https://github.com/tjallingt/react-youtube) — lecture video player.
- [Express 5](https://expressjs.com/) — authentication, courses, progress, and admin APIs.
- [PostgreSQL 16](https://www.postgresql.org/) / [node-postgres](https://node-postgres.com/) — persistent data.
- [Nodemailer](https://nodemailer.com/) — verification codes and course-query emails.
- [Oxlint](https://oxc.rs/docs/guide/usage/linter) — lint checks.
- [Docker Compose](https://docs.docker.com/compose/) — app and database deployment.

### File Structure

```text
.
├── data/
│   ├── comdir.pdf            # Source communication directory for optional imports
│   └── faculty.json          # Reviewed faculty dataset for database imports
├── public/                   # Static public assets
├── scripts/                  # Reusable setup and faculty-directory utilities
│   ├── parse-faculty.cjs      # PDF → faculty JSON
│   ├── filter_faculty.py     # Remove non-academic directory entries
│   ├── map_departments.py    # Normalize department names
│   ├── seed-faculty.js       # Import reviewed faculty JSON into PostgreSQL
│   └── seed-admin.js         # First-time administrator bootstrap from .env
├── server/
│   ├── auth/                # Database admin authentication, password hashing, Zimbra
│   ├── db/
│   │   ├── db.js            # Database access
│   │   └── init.sql         # Tables and initial course content
│   └── server.js            # Express API and production frontend serving
├── src/
│   ├── services/            # API client and browser-local course/progress fallbacks
│   ├── App.jsx              # Routes and client login state
│   ├── Login.jsx            # Faculty OTP and administrator login
│   ├── Dashboard.jsx        # Faculty dashboard
│   ├── AdminPortal.jsx      # Content management and completion records
│   ├── CoursePlayer.jsx     # Lecture player and progress tracking
│   ├── QuizModal.jsx        # Assessments
│   └── main.jsx             # React entry point
├── tests/                   # Password and administrator bootstrap checks
├── .env.example             # The only environment template
├── Dockerfile               # Frontend build and Express runtime
├── docker-compose.yml       # The only Compose file, for local use and deployment
├── package.json             # Dependencies and commands
└── vite.config.js           # Vite configuration and API proxy
```

- `src/` contains the frontend and its styles. Some course and progress APIs have browser-local fallback data when the backend is unavailable.
- `server/` contains the API, database schema, and mail authentication integration.
- `scripts/` contains explicit setup and maintenance tools; these are never run automatically when the application starts.
- `data/` contains the source PDF and reviewed faculty JSON used by the import tools. The PDF and faculty maintenance scripts are excluded from the Docker image; the admin seed script is included.

### Prerequisites

- [Node.js](https://nodejs.org/) **22.12 or newer** and npm for development. This meets the installed [Vite runtime requirements](https://vite.dev/guide/).
- [Docker Engine / Docker Desktop](https://docs.docker.com/get-started/get-docker/) with the **Docker Compose plugin** for container setup.
- Python 3 only if you want to use the optional faculty filtering and department-mapping scripts.
- A working SMTP account for faculty OTP login and course-query emails outside local testing.

### Environment Setup

```bash
git clone https://github.com/tsg-iitkgp/sahachar.git
cd sahachar
cp .env.example .env
```

Edit `.env` before starting the services. Set your own `DB_PASSWORD`. For the first administrator seed, also set `ADMIN_EMAIL` (a full email address) and `ADMIN_PASSWORD`. There are no default admin or database passwords. Docker requires the database password; `npm run admin:seed` requires admin credentials only when the database has not been seeded yet.

The same root `.env` is read by the Node backend and [Docker Compose](https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/). Compose changes the app's database address to `postgres:5432` for communication inside the Docker network; local tools use `localhost:5440`. Database credentials remain the same. Run the commands below from the repository root.

| Variable | Purpose / default |
| --- | --- |
| `PORT` | API and built frontend port; **9501** |
| `DB_HOST`, `DB_PORT` | Local PostgreSQL address; `localhost`, **5440** |
| `DB_USER`, `DB_NAME` | Database user and name; `fscp_admin`, `faculty_course_portal` |
| `DB_PASSWORD` | Your database password; required for Docker |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | First-time administrator seed inputs only; remove after seeding |
| `ZIMBRA_HOST`, `ZIMBRA_PORT`, `ZIMBRA_DOMAIN` | Institute IMAPS host, port, and email domain; verify these with the institute mail administrator |
| `ZIMBRA_DEV_MODE` | Optional password-authentication bypass for local faculty testing; `false`, always disabled under `NODE_ENV=production` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE` | Mail server and TLS settings; use the values provided by your SMTP service |
| `SMTP_USER`, `SMTP_PASS` | SMTP account credentials used to send faculty verification codes |
| `SUPPORT_EMAIL` | Recipient for course questions and complaints |
| `OTP_DEV_MODE` | Print verification codes in local server logs instead of emailing; `false`, always disabled under `NODE_ENV=production` |

Use single quotes around secret values containing `$` or `#`, for example `DB_PASSWORD='your-own-value'`. Keep `.env` private. Never put secrets in a `VITE_` variable: those variables can be embedded in the browser bundle. Restart services after changing environment values.

### Setting Up Locally

#### Using npm

```bash
# Install the exact dependency versions from the lockfile
npm ci

# Start just PostgreSQL using the same Compose file and .env
docker compose up -d postgres

# Seed the first administrator from .env
npm run admin:seed

# Remove ADMIN_EMAIL and ADMIN_PASSWORD from .env after successful seeding.
# Start Express and Vite together
npm run fullstack
```

Open **http://localhost:5173** for the frontend with hot reload. Express runs on **http://localhost:9501**, and Vite forwards `/api` requests to the backend port configured in `.env`.

For separate terminals, use `npm run server` and `npm run dev`. You can also use an existing PostgreSQL installation by setting the `DB_*` values in `.env` and creating the configured database and user yourself. The backend creates the schema and initial course data when it connects.

For local faculty OTP testing without SMTP, set `OTP_DEV_MODE=true` and read the verification code from the backend terminal. For normal email delivery, leave this false and fill in the SMTP settings. Administrators sign in with their database email, its part before `@`, or database user ID, using the password chosen during first-time seeding.

#### Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite frontend development server |
| `npm run server` | Start the Express backend |
| `npm run fullstack` | Start frontend and backend together |
| `npm run build` | Build the frontend into `dist/` |
| `npm start` | Start Express; also serve the built frontend when `dist/` exists |
| `npm run preview` | Preview a frontend build; does not start or proxy the API |
| `npm run lint` | Run Oxlint checks |
| `npm test` | Run password tests; database integration tests run when `TEST_DATABASE_URL` is provided |
| `npm run admin:seed` | Seed the first administrator from .env; skip when already seeded |
| `npm run faculty:parse -- [input.pdf] [output.json]` | Extract a faculty directory; defaults to `data/comdir.pdf` and `data/faculty.json` |
| `npm run faculty:seed -- [input.json]` | Import faculty into PostgreSQL; defaults to `data/faculty.json` |

### Docker

After creating and filling in `.env`:

```bash
# Check required settings without printing credentials
docker compose config --quiet

# First-time setup: build the image, start PostgreSQL, and seed the administrator
docker compose run --rm --build app npm run admin:seed

# Remove ADMIN_EMAIL and ADMIN_PASSWORD from .env after successful seeding.
# Start the app using the seeded database account
docker compose up -d

# Inspect services and backend logs
docker compose ps
docker compose logs -f app
```

Open **http://localhost:9501**. Express serves both the frontend and `/api` from this address. PostgreSQL is available to local tools at **localhost:5440** and is bound to the host's loopback interface.

```bash
# Stop the services; retain the database volume
docker compose down

# Rebuild after pulling application changes
docker compose up -d --build
```

The `pgdata` named volume retains users, progress, notes, and assessment attempts. **`docker compose down -v` deletes that database volume.** Existing volumes keep the database credentials they were initialized with; changing `.env` alone does not change a database password. When upgrading an existing deployment, use its current database credentials and back up its volume first.

### Deployment

Use the same `.env`, `Dockerfile`, and `docker-compose.yml` on the deployment host:

1. Install Docker and its Compose plugin, clone the repository, and create `.env` as described above.
2. Fill in unique admin/database passwords, verified institute mail settings, SMTP credentials, and `SUPPORT_EMAIL`. Keep both development flags false.
3. Run `docker compose config --quiet`, then `docker compose run --rm --build app npm run admin:seed` for first-time setup. Remove the admin seed values from `.env`, then run `docker compose up -d`. Later deployments use `docker compose up -d --build` without admin seed values.
4. Verify `docker compose ps`, inspect `docker compose logs app`, and check `http://localhost:9501/api/courses` on the host.
5. For a shared deployment, configure your domain and an HTTPS reverse proxy to the app on port 9501. Keep PostgreSQL port 5440 local, restrict direct app-port access as appropriate, and arrange regular database backups.

**Current access-control limitation:** login currently returns a placeholder session token, and the API does not validate it or enforce administrator permissions on protected routes. Client-side route checks are not server-side access control. Implement and verify server-side sessions and authorization before exposing this application to untrusted users. Database-backed administrator passwords do not resolve that existing limitation.

### Administrator Bootstrap

`ADMIN_EMAIL` and `ADMIN_PASSWORD` are first-run seed inputs. The explicit seed command creates the administrator profile in `users` and a salted scrypt password hash in `admin_credentials`. Hashes are kept separate from user profiles returned by the API. Hashing uses the [OWASP scrypt baseline](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html) with Node's built-in crypto module.

Once an admin credential exists, re-running the seed is a no-op, even if the environment values are changed or missing. It never resets the stored email or password. Login looks up the database account and verifies its password hash; it does not read `ADMIN_EMAIL` or `ADMIN_PASSWORD`. Admin identities cannot use the faculty development or OTP login paths.

Remove both seed values from `.env` after successful setup, and recreate any running app container so it no longer carries those values. Keep the selected password in your password manager. Later credential changes must update the database account and its password hash through trusted administration tooling; changing `.env` is not a password-reset mechanism. There is currently no password-change UI or endpoint.

### Faculty Directory Maintenance

The directory parser uses the source PDF as input. Parsing, filtering, and mapping update JSON; database importing is a separate, explicit step. PDF extraction is heuristic, so review names, emails, and departments before importing.

```bash
# Generate a separate file so the bundled directory can be reviewed first
npm run faculty:parse -- data/comdir.pdf /tmp/faculty.json
python3 scripts/filter_faculty.py /tmp/faculty.json
python3 scripts/map_departments.py /tmp/faculty.json

# After reviewing that JSON, import it into the database configured in .env
npm run faculty:seed -- /tmp/faculty.json
```

The import runs in a transaction, updates faculty names and departments by email, and creates missing progress rows. Existing account IDs are preserved. Repeated directory usernames receive distinct, stable IDs derived from their emails so separate accounts are not merged. It does not delete users or reset existing course progress or attempts. To retain a reviewed dataset for future imports, replace `data/faculty.json` with your reviewed JSON. These scripts run on the host after `npm ci`; they are excluded from the production container.

### Contributing

1. Fork the repository and create a branch for your change.
2. Follow the environment and local setup instructions above.
3. Keep reusable maintenance tools in `scripts/`. Do not add temporary scripts, generated output, caches, or credentials to the repository.
4. Run `npm test`, `npm run lint`, and `npm run build`. To exercise the administrator seed against PostgreSQL, supply `TEST_DATABASE_URL` for a disposable test database; the integration tests create and remove their own schema. For behavior changes, exercise the affected faculty/admin flow with a local database.
5. Open a pull request explaining the change and how you verified it. Update this README and `.env.example` when setup or configuration changes.

### Troubleshooting

- **Compose reports a missing variable:** fill in `DB_PASSWORD` in the root `.env`.
- **First admin seed fails:** supply `ADMIN_EMAIL` and `ADMIN_PASSWORD` for initial seeding, check the database connection, and ensure the admin ID/email does not belong to a faculty account.
- **PostgreSQL connection fails:** check `docker compose ps`, database logs, and the `DB_*` values. Inside Compose the app uses `postgres:5432`; on the host it uses `localhost:5440`.
- **Faculty login cannot send a code:** verify SMTP settings and outbound mail connectivity. For local testing only, enable `OTP_DEV_MODE`; production never prints OTPs.
- **Course queries return a configuration error:** set both the SMTP credentials and `SUPPORT_EMAIL`.
- **Admin login fails:** run the seed command for a new database, then use the email/ID stored in the database and the originally seeded password. Changing `.env` or re-running the seed will not reset an existing administrator password.
- **Frontend API calls fail during development:** run `npm run fullstack`, or start both `npm run server` and `npm run dev`. The Vite proxy follows `PORT` from `.env`.
