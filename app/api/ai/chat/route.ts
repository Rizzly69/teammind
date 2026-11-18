import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { requireAuth, verifyRoomAccess } from '@/lib/permissions/workspace';
import { aiChatRequestSchema } from '@/lib/validation/schemas';
import { callOpenRouter, OpenRouterMessage } from '@/lib/ai/openrouter';
import { checkRateLimits } from '@/lib/rate-limit/limiter';
import { isValidModelId, getModelById } from '@/lib/ai/model-config';
import { getStore } from '@/lib/store/workspace-store';
import { Message } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const user = await requireAuth(supabase);

    const body = await req.json();
    const parseResult = aiChatRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request payload', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { roomId, prompt, modelId, includeContext } = parseResult.data;

    // Verify model is allowed
    if (!isValidModelId(modelId)) {
      return NextResponse.json(
        { error: `Model "${modelId}" is not allowed or supported.` },
        { status: 400 }
      );
    }

    // Verify user has access to room and workspace
    const { workspaceId } = await verifyRoomAccess(supabase, roomId, user.id);

    // Check rate limit and budget
    checkRateLimits(workspaceId, user.id, 0.015);

    const store = getStore();

    // 1. Persist human user message
    if (isSupabaseConfigured()) {
      await supabase.from('messages').insert({
        room_id: roomId,
        sender_user_id: user.id,
        sender_type: 'user',
        content: prompt,
        status: 'complete',
      });
    } else {
      const userMsg: Message = {
        id: `msg-${Date.now()}-user`,
        room_id: roomId,
        sender_user_id: user.id,
        sender_type: 'user',
        model_id: null,
        content: prompt,
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
      store.messages.push(userMsg);
    }

    // 2. Build conversation history
    const messagesToSend: OpenRouterMessage[] = [
      {
        role: 'system',
        content:
          'You are TeamMind AI, a focused, objective, and collaborative brainstorming assistant for high-performing product and engineering teams. Be precise, avoid platitudes, separate facts from assumptions, and offer direct, actionable insights.',
      },
    ];

    if (includeContext) {
      const pastMessages = isSupabaseConfigured()
        ? (
            await supabase
              .from('messages')
              .select('sender_type, content')
              .eq('room_id', roomId)
              .order('created_at', { ascending: false })
              .limit(10)
          ).data || []
        : store.messages.filter((m) => m.room_id === roomId).slice(-10);

      const chronological = isSupabaseConfigured()
        ? [...pastMessages].reverse()
        : pastMessages;

      for (const msg of chronological) {
        if (msg.sender_type === 'user') {
          messagesToSend.push({ role: 'user', content: msg.content });
        } else if (msg.sender_type === 'assistant') {
          messagesToSend.push({ role: 'assistant', content: msg.content });
        }
      }
    } else {
      messagesToSend.push({ role: 'user', content: prompt });
    }

    // 3. Call OpenRouter
    const result = await callOpenRouter(messagesToSend, {
      modelId,
      temperature: 0.7,
      maxTokens: 2500,
    });

    // 4. Persist AI response
    let savedMessage: Message;

    if (isSupabaseConfigured()) {
      const { data } = await supabase
        .from('messages')
        .insert({
          room_id: roomId,
          sender_user_id: null,
          sender_type: 'assistant',
          model_id: modelId,
          content: result.content,
          status: 'complete',
          metadata: {
            usage: result.usage,
            latencyMs: result.latencyMs,
          },
        })
        .select('*')
        .single();
      savedMessage = data;
    } else {
      savedMessage = {
        id: `msg-${Date.now()}-ai`,
        room_id: roomId,
        sender_user_id: null,
        sender_type: 'assistant',
        model_id: modelId,
        content: result.content,
        status: 'complete',
        metadata: {
          usage: result.usage,
          latencyMs: result.latencyMs,
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      store.messages.push(savedMessage);
    }

    return NextResponse.json({
      success: true,
      message: savedMessage,
      usage: result.usage,
      latencyMs: result.latencyMs,
    });
  } catch (error: any) {
    const status = error.statusCode || 500;
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred during AI generation' },
      { status }
    );
  }
}
