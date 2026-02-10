// F:\DEVELOPFOLDER\dev-core\app\api\sheets\route.ts
import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import path from 'path';

/**
 * spreadsheetIdの形式を検証（Google Sheets IDは英数字とハイフンのみ）
 */
function isValidSpreadsheetId(id: string): boolean {
  if (!id || typeof id !== 'string') return false;
  // Google Sheets IDは通常44文字の英数字とハイフン
  return /^[a-zA-Z0-9_-]{20,60}$/.test(id);
}

/**
 * rangeの形式を検証（A1記法またはシート名!A1記法）
 * Google Sheets APIは大文字・小文字両方を受け付けるため、両方許可
 */
function isValidRange(range: string): boolean {
  if (!range || typeof range !== 'string') return false;
  // シート名!A1:Z100 または A1:Z100 の形式（大文字・小文字両方対応）
  return /^[^!]*!?[A-Za-z]+\d+(:[A-Za-z]+\d+)?$/.test(range.trim());
}

/**
 * シート名の形式を検証（危険な文字を排除）
 */
function isValidSheetName(name: string): boolean {
  if (!name || typeof name !== 'string') return false;
  // シート名は最大100文字、制御文字や特殊文字を排除
  if (name.length > 100) return false;
  // 制御文字や危険な文字を排除
  return !/[\x00-\x1F\x7F\[\]\\\/\?*:]/.test(name);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { spreadsheetId, range, values, method, sheetName } = body;

    // 入力値の検証
    if (!spreadsheetId || !isValidSpreadsheetId(spreadsheetId)) {
      return NextResponse.json(
        { error: 'Invalid spreadsheet ID' },
        { status: 400 }
      );
    }

    if (range && !isValidRange(range)) {
      return NextResponse.json(
        { error: 'Invalid range format' },
        { status: 400 }
      );
    }

    if (sheetName && !isValidSheetName(sheetName)) {
      return NextResponse.json(
        { error: 'Invalid sheet name' },
        { status: 400 }
      );
    }

    // valuesの配列検証（UPDATE時のみ）
    if (method === 'UPDATE' && values) {
      if (!Array.isArray(values) || !values.every(row => Array.isArray(row))) {
        return NextResponse.json(
          { error: 'Invalid values format' },
          { status: 400 }
        );
      }
      // 配列のサイズ制限（DoS対策）
      if (values.length > 10000 || values.some(row => row.length > 1000)) {
        return NextResponse.json(
          { error: 'Values array too large' },
          { status: 400 }
        );
      }
    }

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

    // 新しいシートを作成
    if (method === 'CREATE_SHEET') {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: sheetName,
                },
              },
            },
          ],
        },
      });
      return NextResponse.json({ success: true });
    }

    // シート一覧を取得
    if (method === 'LIST_SHEETS') {
      const res = await sheets.spreadsheets.get({
        spreadsheetId,
      });
      const titles =
        res.data.sheets
          ?.map((s) => s.properties?.title)
          .filter((t): t is string => !!t) ?? [];
      return NextResponse.json({ sheets: titles });
    }

    // データを更新
    if (method === 'UPDATE') {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values },
      });
      return NextResponse.json({ success: true });
    }

    // データを取得
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });
    return NextResponse.json({ values: response.data.values });
  } catch (error: any) {
    // エラーの詳細情報をログに記録（サーバー側のみ）
    console.error('Google Sheets API Error:', error);
    
    // クライアントには詳細なエラーメッセージを返さない（情報漏洩防止）
    const errorMessage = error?.message || 'Unknown error';
    const isClientError = errorMessage.includes('Invalid') || errorMessage.includes('not found');
    
    return NextResponse.json(
      { error: isClientError ? 'Invalid request' : 'An error occurred' },
      { status: isClientError ? 400 : 500 }
    );
  }
}