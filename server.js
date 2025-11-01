require('dotenv').config();
const express = require('express');
const session = require('express-session');
const { WebClient } = require('@slack/web-api');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: true,
    sameSite: 'none',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

app.get('/', (req, res) => {
  console.log('Root route - session:', req.session);
  console.log('Root route - cookies:', req.headers.cookie);
  console.log('Root route - session exists:', !!req.session.accessToken);
  if (req.session.accessToken) {
    res.sendFile(path.join(__dirname, 'public', 'app.html'));
  } else {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
});

app.get('/auth/slack', (req, res) => {
  const scopes = 'users:read,users.profile:read,users.profile:write';
  const slackAuthUrl = `https://slack.com/oauth/v2/authorize?client_id=${process.env.SLACK_CLIENT_ID}&user_scope=${scopes}&redirect_uri=${encodeURIComponent(process.env.REDIRECT_URI)}`;
  console.log('OAuth URL:', slackAuthUrl);
  console.log('Scopes:', scopes);
  res.redirect(slackAuthUrl);
});

app.get('/auth/callback', async (req, res) => {
  const { code, error } = req.query;
  
  console.log('Callback received:', { code: code ? 'present' : 'missing', error });
  
  if (error) {
    console.error('Slack OAuth error:', error);
    return res.status(400).send(`Slack OAuth error: ${error}`);
  }
  
  if (!code) {
    return res.status(400).send('Missing authorization code');
  }

  try {
    const result = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.SLACK_CLIENT_ID,
        client_secret: process.env.SLACK_CLIENT_SECRET,
        code,
        redirect_uri: process.env.REDIRECT_URI,
      }),
    });

    const data = await result.json();
    console.log('OAuth response:', JSON.stringify(data, null, 2));

    if (!data.ok) {
      console.error('OAuth failed:', data);
      return res.status(400).send('OAuth failed: ' + JSON.stringify(data));
    }

    req.session.accessToken = data.authed_user.access_token;
    req.session.userId = data.authed_user.id;
    
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).send('Session error');
      }
      console.log('Session saved successfully');
      console.log('Session ID:', req.sessionID);
      console.log('Session data:', req.session);
      const redirectUrl = process.env.REDIRECT_URI.replace('/auth/callback', '/');
      console.log('Redirecting to:', redirectUrl);
      res.redirect(redirectUrl);
    });
  } catch (error) {
    console.error('OAuth error:', error);
    res.status(500).send('Authentication failed: ' + error.message);
  }
});

app.get('/api/me', async (req, res) => {
  if (!req.session.accessToken) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const client = new WebClient(req.session.accessToken);
    const result = await client.users.profile.get({
      user: req.session.userId
    });

    res.json({
      id: req.session.userId,
      profile: result.profile
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

app.get('/api/user/:userId', async (req, res) => {
  if (!req.session.accessToken) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { userId } = req.params;

  try {
    const client = new WebClient(req.session.accessToken);
    const result = await client.users.info({ user: userId });
    
    if (!result.ok) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.user;
    res.json({
      id: user.id,
      name: user.real_name || user.name,
      title: user.profile.title || '',
      image: user.profile.image_192 || user.profile.image_72
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(404).json({ error: 'User not found' });
  }
});

app.post('/api/update-profile', async (req, res) => {
  if (!req.session.accessToken) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { field, value, alt = "" } = req.body;

  if (!field) {
    return res.status(400).json({ error: 'Field ID required' });
  }

  try {
    const profileUpdate = {
      user: req.session.userId
    };

    if (field === 'title' || field === 'phone' || field === 'real_name' || field === 'display_name') {
      profileUpdate.profile = { [field]: value };
    } else {
      profileUpdate.profile = {
        fields: {
          [field]: {
            value: value || "",
            alt: alt
          }
        }
      };
    }

    const response = await fetch('https://slack.com/api/users.profile.set', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${req.session.accessToken}`
      },
      body: JSON.stringify(profileUpdate)
    });

    const data = await response.json();

    if (!data.ok) {
      console.error('Profile update failed:', data);
      return res.status(400).json({ error: data.error });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

app.use(express.static('public'));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
