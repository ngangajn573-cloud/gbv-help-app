# GBV Help App

A safe, discreet web application for reporting gender-based violence (GBV), alerting trusted emergency contacts, and connecting survivors with relevant authorities.

**Live concept:** Anyone can open the app — at a police station, on a shared device, or when they fear attention from an abuser — and report or get help without creating an account.

## Features

- **Discreet reporting** — Anonymous GBV incident reports sent to police, helplines, social services, or legal aid
- **Emergency SOS** — Hold the SOS button for 2 seconds to alert all trusted contacts via SMS with optional GPS location
- **Trusted contacts** — Add emergency contacts stored locally on the device (private)
- **Quick Exit** — Instantly leave the site (redirects to a neutral page)
- **Disguise Mode** — Hides the app behind a fake weather screen; triple-tap to unlock
- **Resources** — Direct call/text links to helplines, shelters, and support services
- **Backend server** — Express.js API for receiving and storing reports server-side

## Project Structure

```
gbv-help-app/
├── frontend/
│   ├── index.html          # Main app (all sections)
│   ├── style.css           # Styles with hero.jpg background
│   ├── app.js              # Logic: SOS, contacts, reporting, disguise mode
│   ├── script.js           # Reserved for additional scripts
│   └── images/
│       └── hero.jpg        # Background image
├── backend/
│   ├── server.js           # Express.js server
│   └── package.json        # Backend dependencies
├── .gitignore
└── README.md
```

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/ngangajn573-cloud/gbv-help-app.git
cd gbv-help-app
```

### 2. Install backend dependencies

```bash
cd backend
npm install
```

### 3. Start the server

```bash
npm start
```

The app will be available at **http://localhost:3000**

### 4. Offline mode (no server needed)

If you just want to run the frontend without the backend:

```bash
cd frontend
npx serve .
```

> The app works fully offline — reports are saved locally and an email draft is created.

## How Reporting Works

1. User fills out the report form (anonymous by default)
2. If backend is running: report is sent to the server API (`POST /api/reports`)
3. If no backend: report is saved locally + an email draft opens
4. Optionally, trusted contacts receive an SMS alert
5. The user can also call the authority directly

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Server health check |
| POST | `/api/reports` | Submit a new GBV report |
| GET | `/api/reports` | Get all reports (admin) |
| GET | `/api/reports/:id` | Get a single report |
| GET | `/api/authorities` | List available authorities |
| GET | `/api/resources` | List support resources |

## Configuring Authorities

Edit the `AUTHORITIES` object in `app.js` with your country's real phone numbers and emails:

```javascript
const AUTHORITIES = {
    police: {
        name: 'Police',
        phone: '999',
        email: 'reports@police.gov',
        description: 'Report crimes and request immediate assistance.'
    },
};
```

## Safety Features

| Feature | Purpose |
|---------|---------|
| Quick Exit | Leave instantly if someone approaches |
| Disguise Mode | App looks like a weather app |
| Anonymous reports | No identity required |
| Local storage | Contacts stay on device only |
| Hold-to-activate SOS | Prevents accidental alerts |
| Hero background image | Disguised as a community/safety site |

## Next Steps (Recommended)

- Add database persistence (MongoDB, PostgreSQL) for reports
- Integrate SMS gateway (Twilio, Africa's Talking) for automatic alerts
- Add multi-language support
- Deploy to HTTPS (required for geolocation on mobile)
- Register with local GBV organizations for official authority contacts
- Add user authentication for admin report viewing

## License

MIT — Built to help survivors access safety and support.
