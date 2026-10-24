# KeyFlow — Typing Speed Test

A responsive full-stack typing test starter with:
- Live WPM, accuracy, error count, progress, and timer
- 15, 30, 60, and 120-second tests
- Easy, medium, and hard passages
- Dark/light theme toggle
- Personalized downloadable PDF certificate
- Express API that saves anonymous results to a local JSON file
- Recent results list (no account needed)

## Requirements
- Node.js 18 or newer
- npm

## Run locally
1. Extract the ZIP.
2. Open the extracted `keyflow-typing-test` folder in VS Code.
3. Open the terminal in that folder.
4. Install dependencies:
   ```bash
   npm install
   ```
5. Start the frontend and backend together:
   ```bash
   npm run dev
   ```
6. Open the Vite URL shown in the terminal, usually `http://localhost:5173`.

The API runs at `http://localhost:4000`. You can check it at `http://localhost:4000/api/health`.

## Build the frontend
```bash
npm run build
```
The production frontend files are created in `dist/`.

## Notes and next steps
- This starter deliberately has no user accounts. Results are anonymous and saved locally in `server/data/results.json`.
- The local JSON store is appropriate for development and demos, not a multi-instance production deployment. For production, move results to PostgreSQL/Supabase and add request rate limiting, input validation, HTTPS, and deployment configuration.
- The browser generates the PDF certificate using the result currently shown. Because there is no login or server-side verification yet, certificates are a record of a practice session, not a verified professional qualification.
- To add accounts later, add an authentication provider (for example, Supabase Auth), associate result rows with a user ID, and add privacy controls.
- The test currently calculates WPM using correct characters / 5 / elapsed minutes. Accuracy is correct characters divided by all typed characters. These definitions are common conventions, but other typing sites may use different rules.
- Google Fonts are loaded from the web; system fallbacks are provided.
