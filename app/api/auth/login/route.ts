// F:\DEVELOPFOLDER\dev-core\app\api\auth\login\route.ts
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { password } = await request.json();

    const expectedPassword = process.env.CHOCOMELAPP_ADMIN_PASSWORD;

    // 環境変数が未設定の場合は常に失敗させる（安全側に倒す）
    if (!expectedPassword) {
      console.error('CHOCOMELAPP_ADMIN_PASSWORD is not set');
      return NextResponse.json(
        { success: false, message: 'サーバー側の設定エラーが発生しているよ' },
        { status: 500 },
      );
    }

    // パスワードチェック
    if (password === expectedPassword) {
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