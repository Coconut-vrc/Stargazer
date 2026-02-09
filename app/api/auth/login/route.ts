// F:\DEVELOPFOLDER\dev-core\app\api\auth\login\route.ts
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { password } = await request.json();

    // パスワードチェック
    if (password === 'dev4') {
      const response = NextResponse.json({ success: true });

      // Cookieの設定 (HttpOnlyでセキュリティ確保)
      response.cookies.set('admin_auth', 'authenticated', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // 本番環境ではHTTPSのみ
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 1週間有効
      });

      return response;
    }

    return NextResponse.json({ success: false, message: 'パスワードが違うよ' }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'エラーが発生したよ' }, { status: 500 });
  }
}