// app/api/auth/logout/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  const response = NextResponse.json({ success: true });
  const cookieStore = await cookies();
  
  // Cookieを消去（有効期限を過去にする）
  response.cookies.set('admin_auth', '', {
    httpOnly: true,
    expires: new Date(0),
    path: '/',
  });

  return response;
}