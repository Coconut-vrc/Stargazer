// F:\DEVELOPFOLDER\dev-core\app\api\sheets\route.ts
import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import path from 'path';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { spreadsheetId, range, values, method } = body;

    let auth;
    if (process.env.GOOGLE_CREDENTIALS) {
      try {
        const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
        auth = new google.auth.GoogleAuth({
          credentials,
          scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
      } catch (parseErr) {
        console.error('Failed to parse GOOGLE_CREDENTIALS env:', parseErr);
        throw new Error('Credential Parse Error');
      }
    } else {
      const keyFile = path.join(process.cwd(), 'credentials.json');
      auth = new google.auth.GoogleAuth({
        keyFile: keyFile,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
    }

    const sheets = google.sheets({ version: 'v4', auth });
    if (method === 'UPDATE') {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values },
      });
      return NextResponse.json({ success: true });
    }

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });
    return NextResponse.json({ values: response.data.values });
  } catch (error: any) {
    console.error('Google Sheets API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}