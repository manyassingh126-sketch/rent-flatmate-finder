# Rent & Flatmate Finder

A full-stack MERN platform where owners list rooms and tenants create profiles. An AI-powered compatibility engine (Google Gemini) scores and ranks matches, real-time chat (Socket.io) opens once interest is accepted, and email notifications (Ethereal SMTP) fire on key events.

## Tech Stack

- **Backend:** Node.js, Express, MongoDB (Mongoose), Socket.io, JWT auth, bcrypt, multer, nodemailer
- **AI:** Google Gemini API (`gemini-2.5-flash`) for compatibility scoring, with a rule-based fallback if the LLM is unavailable
- **Email:** Ethereal (fake SMTP for development/testing — see note below)
- **Frontend:** React (Vite) — basic skeleton; all functionality verified via REST API and a Socket.io test script (see Testing section)

## Setup Guide

### Prerequisites
- Node.js v18+
- A MongoDB Atlas account (free tier)
- A Google Gemini API key ([aistudio.google.com/apikey](https://aistudio.google.com/apikey))

### Backend Setup

```bash
cd server
npm install
cp .env.example .env
```

Fill in `.env` with real values (see `.env.example` below for required keys).

```bash
npm run dev
```

Server runs on `http://localhost:5000`.

### Frontend Setup

```bash
cd client
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`.

## `.env.example`

```dotenv
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
GEMINI_API_KEY=your_gemini_api_key
EMAIL_USER=your_ethereal_or_smtp_email
EMAIL_PASS=your_ethereal_or_smtp_password
```

**Note on email:** This project uses [Ethereal Email](https://ethereal.email) — a fake SMTP service for development — instead of a real provider. Every sent email logs a preview URL to the server console (`Email sent: https://ethereal.email/message/...`) where the actual email content can be viewed. Swapping in a real provider (Gmail, SendGrid) is a one-line change to the transporter config in `services/emailService.js`.

## Database Schema

| Model | Key Fields |
|---|---|
| **User** | name, email, password (hashed), role (tenant/owner/admin) |
| **Listing** | owner (ref User), location, rent, availableFrom, roomType, furnishingStatus, photos[], isFilled |
| **TenantProfile** | tenant (ref User), preferredLocation, budgetMin, budgetMax, moveInDate |
| **CompatibilityScore** | tenant (ref User), listing (ref Listing), score (0-100), explanation, source (llm/rule-based) — unique index on (tenant, listing) so a score is never recomputed once cached |
| **InterestRequest** | tenant (ref User), listing (ref Listing), status (pending/accepted/declined) |
| **ChatMessage** | interestRequest (ref InterestRequest), sender (ref User), message |

## API Endpoints

### Auth
- `POST /api/auth/register` — `{ name, email, password, role }`
- `POST /api/auth/login` — `{ email, password }`

### Listings
- `POST /api/listings` — (owner) create listing, supports `multipart/form-data` with `photos` field
- `GET /api/listings` — public, supports `?location=&minBudget=&maxBudget=` query filters
- `GET /api/listings/my-listings` — (owner) their own listings
- `PUT /api/listings/:id` — (owner) update
- `PATCH /api/listings/:id/fill` — (owner) mark as filled
- `DELETE /api/listings/:id` — (owner) delete

### Tenant Profile
- `POST /api/tenant/profile` — (tenant) create/update profile (upsert)
- `GET /api/tenant/profile` — (tenant) view own profile

### Compatibility Scoring
- `GET /api/compatibility/:listingId` — (tenant) get or compute score for one listing
- `GET /api/compatibility/ranked-listings` — (tenant) all open listings ranked by compatibility score

### Interest Requests
- `POST /api/interests` — (tenant) `{ listingId }` — triggers email to owner if score > 80
- `PATCH /api/interests/:id/respond` — (owner) `{ status: "accepted" | "declined" }` — triggers email to tenant
- `GET /api/interests/owner` — (owner) interests on their listings
- `GET /api/interests/tenant` — (tenant) interests they've sent

### Chat
- `GET /api/chat/:interestRequestId` — chat history (only for accepted interests, only participants)
- **WebSocket events** (Socket.io):
  - `joinRoom(interestRequestId)` — join a chat thread
  - `sendMessage({ interestRequestId, senderId, message })` — send + persist a message
  - `receiveMessage` — broadcast event received by both participants

### Admin
- `GET /api/admin/users` — list all users (passwords excluded)
- `GET /api/admin/listings` — list all listings
- `GET /api/admin/activity` — platform activity summary
- `DELETE /api/admin/users/:id`, `DELETE /api/admin/listings/:id`

## LLM Prompt & Example I/O

**Prompt template** (sent to Gemini):
```
Given this room listing: location=X, rent=Y, roomType=Z, furnishingStatus=W, availableFrom=D.
And this tenant profile: preferredLocation=A, budgetMin=B, budgetMax=C, moveInDate=E.
Compute a compatibility score from 0 to 100 based on budget and location match.
Return ONLY valid JSON with no markdown formatting, in this exact shape: {"score": number, "explanation": "string"}
```

**Example input:**
- Listing: Gurugram, ₹15,000/month, 1BHK, furnished
- Tenant: prefers Gurugram, budget ₹10,000–20,000

**Example output:**
```json
{
  "score": 100,
  "explanation": "The room's location (Gurugram) perfectly matches the tenant's preferred location. The room's rent (15000) falls exactly within the tenant's budget range (10000-20000)."
}
```

## LLM Fallback

If the Gemini API call fails (network error, timeout, malformed response) for any reason, `services/compatibilityService.js` catches the error and falls back to a deterministic rule-based scorer:
- Location match + budget match → 90
- Location match only → 50
- Budget match only → 40
- Neither → 15

The `source` field (`llm` or `rule-based`) is stored alongside every score so it's always clear which method produced it.

## Testing

All endpoints were tested with `curl` (see examples above) and verified against a live MongoDB Atlas cluster and the real Gemini API. Real-time chat was verified using a temporary `socket.io-client` test script that connected, joined a room, sent a message, and confirmed it was persisted to MongoDB and broadcast back correctly.

## Known Limitations

- Frontend is a minimal React skeleton; all business logic is implemented and verified at the API/WebSocket layer.
- Photo uploads are stored locally in `server/uploads/` (not committed to Git); for production this would move to cloud storage (S3/Cloudinary).
- Email uses Ethereal (dev/test SMTP) rather than a production email provider.
