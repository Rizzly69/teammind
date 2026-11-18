import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { requireAuth, verifyRoomAccess } from '@/lib/permissions/workspace';
import { sendMessageSchema } from '@/lib/validation/schemas';
import { getStore } from '@/lib/store/workspace-store';
import { getAuthorizedMemberById } from '@/lib/auth/authorized-members';
import { Message } from '@/types';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const supabase = await createServerSupabaseClient();
    const user = await requireAuth(supabase);

    await verifyRoomAccess(supabase, roomId, user.id);

    if (!isSupabaseConfigured()) {
      const store = getStore();
      const messages = store.messages
        .filter((m) => m.room_id === roomId)
        .map((m) => {
          const member = m.sender_user_id ? getAuthorizedMemberById(m.sender_user_id) : undefined;
          return {
            ...m,
            sender_profile: member
              ? { id: member.id, display_name: member.name, avatar_url: null, created_at: '' }
              : undefined,
          };
        });
      return NextResponse.json({ messages });
    }

    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ messages: messages || [] });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Unauthorized' },
      { status: error.statusCode || 401 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const supabase = await createServerSupabaseClient();
    const user = await requireAuth(supabase);

    await verifyRoomAccess(supabase, roomId, user.id);

    const body = await req.json();
    const parse = sendMessageSchema.safeParse({ ...body, roomId });

    if (!parse.success) {
      return NextResponse.json(
        { error: 'Invalid message payload', details: parse.error.flatten() },
        { status: 400 }
      );
    }

    const { content } = parse.data;

    if (!isSupabaseConfigured()) {
      const store = getStore();
      const newMsg: Message = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        room_id: roomId,
        sender_user_id: user.id,
        sender_type: 'user',
        model_id: null,
        content,
        status: 'complete',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        sender_profile: {
          id: user.id,
          display_name: user.name || 'Team Member',
          avatar_url: null,
          created_at: '',
        },
      };
      store.messages.push(newMsg);
      return NextResponse.json({ message: newMsg }, { status: 201 });
    }

    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        room_id: roomId,
        sender_user_id: user.id,
        sender_type: 'user',
        content,
        status: 'complete',
      })
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Unauthorized' },
      { status: error.statusCode || 401 }
    );
  }
}
