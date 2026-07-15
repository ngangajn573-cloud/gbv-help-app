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

## Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/ngangajn573-cloud/gbv-help-app.git
   cd gbv-help-app/frontend
   ```

2. Open `index.html` in a browser, or serve locally:
   ```bash
   npx serve .
   ```

3. On mobile, SOS and SMS features work best when opened on a phone with a SIM card.

## Project Structure

```
frontend/
  index.html   # Main app (all sections)
  style.css    # Styles
  app.js       # Logic: SOS, contacts, reporting, disguise mode
```

## Configuring Authorities

Edit the `AUTHORITIES` and `RESOURCES` objects in `app.js` with your country's real phone numbers and emails:

```javascript
const AUTHORITIES = {
    police: {
        name: 'Police',
        phone: '999',
        email: 'reports@...',
        description: '...'
    },
};
```

## How Reporting Works

1. User fills out the report form (anonymous by default)
2. Report is saved locally on the device
3. An email draft opens addressed to the selected authority
4. Optionally, trusted contacts receive an SMS alert

> **Note:** For production, connect a backend (e.g. Firebase, Supabase, or a custom API) to receive reports server-side without relying on the user's email client.

## Safety Features

| Feature | Purpose |
|---------|---------|
| Quick Exit | Leave instantly if someone approaches |
| Disguise Mode | App looks like a weather app |
| Anonymous reports | No identity required |
| Local storage | Contacts stay on device only |
| Hold-to-activate SOS | Prevents accidental alerts |

## Next Steps (Recommended)

- Add a backend API to receive reports securely
- Integrate SMS gateway (Twilio, Africa's Talking) for automatic alerts
- Add multi-language support
- Deploy to HTTPS (required for geolocation on mobile)
- Register with local GBV organizations for official authority contacts

## License

MIT — Built to help survivors access safety and support.
