# Local Development Setup with ngrok

Since Slack requires HTTPS redirect URLs, use ngrok for local development:

## 1. Install ngrok

```bash
brew install ngrok
# or download from https://ngrok.com/download
```

## 2. Start your app

```bash
npm start
```

## 3. In a new terminal, start ngrok

```bash
ngrok http 3000
```

You'll see output like:
```
Forwarding  https://abc123.ngrok.io -> http://localhost:3000
```

## 4. Update your Slack app settings

1. Go to https://api.slack.com/apps/A09NY62V9AN/oauth
2. Add redirect URL: `https://YOUR-NGROK-URL.ngrok.io/auth/callback`
   (e.g., `https://abc123.ngrok.io/auth/callback`)

## 5. Update your .env

```
REDIRECT_URI=https://YOUR-NGROK-URL.ngrok.io/auth/callback
```

## 6. Restart your server

```bash
npm start
```

## 7. Visit your app

Go to `https://YOUR-NGROK-URL.ngrok.io` and click "Sign in with Slack"

**Note**: The ngrok URL changes each time you restart it (unless you have a paid account). You'll need to update the Slack app settings and .env each time.
