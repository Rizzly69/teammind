import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const userCookie = cookieStore.get('teammind_user');

  if (!userCookie || !userCookie.value) {
    return NextResponse.json({ user: null });
  }

  try {
    const user = JSON.parse(userCookie.value);
    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ user: null });
  }
}
