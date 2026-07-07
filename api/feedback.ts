export default async function handler(req: any, res: any) {
  // 1. Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { id, category, email, message, timestamp, honeypot } = req.body || {};

    // 2. Honeypot check for spam bots - return 200 silently to avoid tipping off bots
    if (honeypot && honeypot.trim() !== '') {
      console.warn('Bot spam detected via Honeypot check in serverless proxy.');
      return res.status(200).json({ status: 'success', message: 'Spam filtered' });
    }

    // 3. Validation
    if (!id || !category || !message) {
      return res.status(400).json({ error: 'Missing required feedback fields.' });
    }

    if (message.length > 500) {
      return res.status(400).json({ error: 'Message exceeds 500 characters limit.' });
    }

    // Email validation if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email address syntax.' });
      }
    }

    // 4. Secure Endpoint Check
    const sheetsUrl = process.env.FEEDBACK_SHEETS_URL;
    if (!sheetsUrl) {
      console.error('Missing FEEDBACK_SHEETS_URL environment variable.');
      return res.status(500).json({ error: 'Feedback service configuration error. Please try again later.' });
    }

    // 5. Sanitize fields to prevent script injection / XSS
    const sanitizedEmail = email ? String(email).trim().substring(0, 100) : '';
    const sanitizedMessage = String(message).trim().replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const sanitizedCategory = String(category).trim().substring(0, 50);
    const sanitizedId = String(id).trim().substring(0, 50);
    const sanitizedTimestamp = timestamp ? String(timestamp).trim().substring(0, 100) : new Date().toLocaleString();

    // 6. Forward request to Google Apps Script Web App
    const response = await fetch(sheetsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: sanitizedId,
        category: sanitizedCategory,
        email: sanitizedEmail,
        message: sanitizedMessage,
        timestamp: sanitizedTimestamp
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google Sheets forwarding failed:', errorText);
      return res.status(502).json({ error: 'Failed to record feedback to spreadsheet.' });
    }

    const responseData: any = await response.json();
    if (responseData.status === 'error') {
      console.error('Google Sheets returned error status:', responseData.message);
      return res.status(502).json({ error: 'Google Sheet webhook returned error status.' });
    }

    return res.status(200).json({ status: 'success' });
  } catch (error) {
    console.error('Error handling feedback proxy:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
