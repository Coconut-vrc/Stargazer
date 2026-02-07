import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import path from 'path';

export async function POST(request: Request) {
  try {
    const { spreadsheetId, range } = await request.json();

    let auth;
    // Vercel上の環境変数に鍵があるかチェック
    if (process.env.GOOGLE_CREDENTIALS) {
      const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
      auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
      });
    } else {
      // ローカル環境（credentials.jsonファイルがある場合）
      const keyFile = path.join(process.cwd(), 'credentials.json');
      auth = new google.auth.GoogleAuth({
        keyFile: keyFile,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
      });
    }

    const sheets = google.sheets({ version: 'v4', auth });
    
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