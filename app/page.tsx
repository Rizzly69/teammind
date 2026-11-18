import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { DEFAULT_WORKSPACE_ID, DEFAULT_PROJECT_ID, DEFAULT_ROOM_ID } from '@/lib/store/workspace-store';

export default async function HomePage() {
  const cookieStore = await cookies();
  const userCookie = cookieStore.get('teammind_user');

  if (userCookie?.value) {
    redirect(`/${DEFAULT_WORKSPACE_ID}/projects/${DEFAULT_PROJECT_ID}/rooms/${DEFAULT_ROOM_ID}`);
  }

  redirect('/login');
}
