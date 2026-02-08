import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const secretKey = searchParams.get('admin_key');

  // VercelのEnvironment Variablesから取得
  const ADMIN_PASS = process.env.ADMIN_PASS;

  // 合言葉が設定されていない、または一致しない場合は403（拒否）
  if (!ADMIN_PASS || secretKey !== ADMIN_PASS) {
    return new NextResponse('Unauthorized: Access Denied', { status: 403 });
  }

  return NextResponse.next();
}

// 制限をかけたいページをここで指定
export const config = {
  matcher: [
    '/matching/:path*', 
    '/admin/:path*',
    // 他に隠したいページがあれば足す
  ],
};