// app/api/auth/check/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  // cookies() は Promise を返すようになったので await が必須
  const cookieStore = await cookies(); 
  const token = cookieStore.get('admin_auth');

  // Cookieが存在し、値が 'authenticated' ならOK
  if (token && token.value === 'authenticated') {
    return NextResponse.json({ authenticated: true });
  }

  // それ以外は未認証
  return NextResponse.json({ authenticated: false }, { status: 401 });
}