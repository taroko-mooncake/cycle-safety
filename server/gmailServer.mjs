import express from 'express';
import cors from 'cors';
import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.GMAIL_SERVER_PORT || 3001;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';

app.use(cors({ origin: FRONTEND_ORIGIN, credentials: false }));
// Increase JSON body size limit to allow image data URLs for attachments.
// The frontend enforces a ~10MB max upload, so we match that here.
app.use(express.json({ limit: '10mb' }));

const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } = process.env;

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
  console.warn(
    'Gmail OAuth environment variables are not fully configured. ' +
    'Please set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI in your .env file.'
  );
}

const oauth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI
);

const SCOPES = ['https://www.googleapis.com/auth/gmail.send'];

// NOTE: For local development only. This stores tokens in memory and will reset on server restart.
let savedTokens = null;

app.get('/auth/url', (req, res) => {
  try {
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent'
    });
    res.json({ url });
  } catch (err) {
    console.error('Error generating auth URL', err);
    res.status(500).json({ error: 'Failed to generate auth URL' });
  }
});

app.get('/oauth2callback', async (req, res) => {
  const code = req.query.code;
  if (!code || typeof code !== 'string') {
    return res.status(400).send('Missing code parameter');
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    savedTokens = tokens;

    res.send(
      '<html><body><h3>Gmail authorization successful.</h3>' +
      '<p>You can close this tab and return to the Cycle Safety app.</p></body></html>'
    );
  } catch (err) {
    console.error('Error handling OAuth callback', err);
    res.status(500).send('Failed to complete Gmail authorization.');
  }
});

function createRawEmail(to, subject, body, attachment) {
  let messageLines;

  if (attachment && attachment.base64Data && attachment.mimeType) {
    const boundary = 'cycle-safety-boundary';
    messageLines = [
      `To: ${to}`,
      'MIME-Version: 1.0',
      `Subject: ${subject}`,
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/plain; charset="UTF-8"',
      '',
      body,
      '',
      `--${boundary}`,
      `Content-Type: ${attachment.mimeType}`,
      'Content-Transfer-Encoding: base64',
      'Content-Disposition: attachment; filename="evidence.jpg"',
      '',
      attachment.base64Data,
      `--${boundary}--`
    ];
  } else {
    messageLines = [
      `To: ${to}`,
      'Content-Type: text/plain; charset="UTF-8"',
      'MIME-Version: 1.0',
      `Subject: ${subject}`,
      '',
      body
    ];
  }

  const message = messageLines.join('\n');
  const encodedMessage = Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return encodedMessage;
}

app.post('/send-email', async (req, res) => {
  if (!savedTokens) {
    return res.status(401).json({ error: 'Not authorized with Gmail yet' });
  }

  const { to, subject, body, imageDataUrl } = req.body || {};
  if (!to || !subject || !body) {
    return res.status(400).json({ error: 'Missing to, subject, or body' });
  }

  let attachment = null;
  if (typeof imageDataUrl === 'string' && imageDataUrl.startsWith('data:')) {
    const match = imageDataUrl.match(/^data:(.+);base64,(.*)$/);
    if (match) {
      const mimeType = match[1];
      const base64Data = match[2];
      attachment = { mimeType, base64Data };
    }
  }

  try {
    oauth2Client.setCredentials(savedTokens);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const raw = createRawEmail(to, subject, body, attachment);

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw }
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Error sending Gmail message', err);
    res.status(500).json({ error: 'Failed to send email via Gmail' });
  }
});

app.listen(PORT, () => {
  console.log(`Gmail server listening on http://localhost:${PORT}`);
});

