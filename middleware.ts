// middleware.ts (appフォルダと同じ階層)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. 除外対象：ログインAPI、チェックAPI、静的ファイルはスルー
  if (
    pathname.startsWith('/api/auth/login') || 
    pathname.startsWith('/api/auth/check') ||
    pathname.includes('.') // favicon.icoなど
  ) {
    return NextResponse.next();
  }

  // 2. Cookieの確認
  const token = request.cookies.get('admin_auth');

  // 3. APIルートへのアクセス制限
  if (pathname.startsWith('/api/')) {
    if (!token || token.value !== 'authenticated') {
      return new NextResponse(
        JSON.stringify({ success: false, message: '認証が必要です' }),
        { status: 401, headers: { 'content-type': 'application/json' } }
      );
    }
  }

  // 4. 画面（ページ）へのアクセス制限
  // 本来はここでログイン画面へリダイレクトさせるのが一般的だけど、
  // 今の構成は AppContainer 内でログイン画面を出しているので、NextResponse.next() でOK
  return NextResponse.next();
}

// 制限をかけたいパスのパターン
export const config = {
  matcher: [
    '/api/:path*',
    // ページ全体にかけたい場合はここに追加する
  ],
};