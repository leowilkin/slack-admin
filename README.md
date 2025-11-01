# Slack Manager Settings Webapp

A web application that allows users to sign in with Slack and manage their manager settings using the Slack API.

## Features

- 🔐 Slack OAuth authentication
- 👤 View your Slack profile (picture, name, title)
- 🔍 Search and select managers from your workspace
- 👀 Preview how your profile will look with the new manager
- ✅ Confirm and update manager settings via Slack API

## Setup

### 1. Create a Slack App

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Click "Create New App" → "From scratch"
3. Name your app and select your workspace
4. Navigate to "OAuth & Permissions"
5. Add the following **User Token Scopes**:
   - `users:read`
   - `users.profile:read`
   - `users.profile:write`
6. Add Redirect URL: `http://localhost:3000/auth/callback`
7. Navigate to "Basic Information" and copy:
   - Client ID
   - Client Secret

### 2. Get Your Manager Field ID

The manager field ID (like `Xf09727DH1J8`) is workspace-specific. You can find it by:
1. Making a test API call to `users.profile.get`
2. Looking in your workspace's custom field configuration
3. Ask your Slack workspace admin

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your values:
```
SLACK_CLIENT_ID=your_client_id_here
SLACK_CLIENT_SECRET=your_client_secret_here
MANAGER_FIELD_ID=Xf09727DH1J8
SESSION_SECRET=your_random_session_secret_here
PORT=3000
REDIRECT_URI=http://localhost:3000/auth/callback
```

### 4. Install and Run

```bash
npm install
npm start
```

Visit `http://localhost:3000`

## How It Works

1. **Sign in**: Users authenticate via Slack OAuth
2. **View Profile**: App displays user's profile picture, name, and job title
3. **Search**: Users can search for people in their workspace
4. **Preview**: Before confirming, users see a mock profile showing how it will look
5. **Confirm**: App makes a POST request to `users.profile.set` endpoint:

```bash
curl -X POST 'https://slack.com/api/users.profile.set' \
  --header 'Content-Type: application/json' \
  --data '{
    "profile": {
      "fields": {
        "Xf09727DH1J8": {
          "value": "U07BLJ1MBEE",
          "alt": ""
        }
      }
    },
    "user": "U05UQ2RTJ6T"
  }' \
  --header 'Authorization: Bearer xoxp-{token}'
```

## Tech Stack

- **Backend**: Node.js + Express
- **Slack SDK**: @slack/web-api
- **Frontend**: Vanilla JavaScript
- **Auth**: Slack OAuth 2.0

## API Endpoints

- `GET /` - Home page (login or app)
- `GET /auth/slack` - Initiate Slack OAuth
- `GET /auth/callback` - OAuth callback
- `GET /api/me` - Get current user profile
- `GET /api/users` - List all workspace users
- `POST /api/set-manager` - Update manager field
- `GET /logout` - Clear session

## License

MIT
