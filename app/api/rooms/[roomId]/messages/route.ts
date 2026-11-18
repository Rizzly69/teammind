import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requireAuth, verifyRoomAccess } from '@/lib/permissions/workspace';
import { sendMessageSchema } from '@/lib/validation/schemas';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const supabase = await createServerSupabaseClient();
    const user = await requireAuth(supabase);

    await verifyRoomAccess(supabase, roomId, user.id);

    const { data: messages, error } = await supabase
      .from('messages')
      .select('*, sender_profile:profiles!messages_sender_user_id_fkey(id, display_name, avatar_url)')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true });

    if (error) {
      // Fallback if profiles foreign key relation isn't explicitly defined in join
      const { data: rawMessages, error: rawError } = await supabase
        .from('messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });

      if (rawError) {
        return NextResponse.json({ error: rawError.message }, { status: 500 });
      }

      return NextResponse.json({ messages: rawMessages });
    }

    return NextResponse.json({ messages });
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
