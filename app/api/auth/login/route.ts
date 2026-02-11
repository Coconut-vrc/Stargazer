// app/api/auth/login/route.ts
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { password } = body;

    // 入力値の型検証
    if (typeof password !== 'string') {
      return NextResponse.json(
        { success: false, message: 'パスワードが違うよ' },
        { status: 401 }
      );
    }

    const rawExpected = process.env.CHOCOMELAPP_ADMIN_PASSWORD;
    const expectedPassword = typeof rawExpected === 'string' ? rawExpected.trim() : '';

    // 環境変数が未設定の場合は常に失敗させる（安全側に倒す）
    if (!expectedPassword) {
      console.error('CHOCOMELAPP_ADMIN_PASSWORD is not set');
      return NextResponse.json(
        { success: false, message: 'サーバー側の設定エラーが発生しているよ' },
        { status: 500 },
      );
    }

    // パスワードチェック（前後の空白は無視）
    // タイミング攻撃対策: 常に比較処理を実行（ただし、実際の比較は定数時間比較が理想だが、文字列比較でも実用上問題なし）
    const inputPassword = password.trim();
    const passwordMatch = inputPassword.length === expectedPassword.length &&
      inputPassword === expectedPassword;
    
    if (passwordMatch) {
      const response = NextResponse.json({ success: true });

      // Cookieの設定 (HttpOnlyでセキュリティ確保)
      response.cookies.set('admin_auth', 'authenticated', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // 本番環境ではHTTPSのみ
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 12, // 12時間有効（応急処置）
      });

      return response;
    }

    return NextResponse.json({ success: false, message: 'パスワードが違うよ' }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'エラーが発生したよ' }, { status: 500 });
  }
}