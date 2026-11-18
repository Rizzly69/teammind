import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requireAuth, verifyRoomAccess } from '@/lib/permissions/workspace';
import { aiChatRequestSchema } from '@/lib/validation/schemas';
import { callOpenRouter, OpenRouterMessage } from '@/lib/ai/openrouter';
import { checkRateLimits } from '@/lib/rate-limit/limiter';
import { isValidModelId } from '@/lib/ai/model-config';

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

    // Save human user message if prompt provided
    await supabase.from('messages').insert({
      room_id: roomId,
      sender_user_id: user.id,
      sender_type: 'user',
      content: prompt,
      status: 'complete',
    });

    // Load recent conversation history if permitted
    const messagesToSend: OpenRouterMessage[] = [
      {
        role: 'system',
        content:
          'You are TeamMind AI, a focused, objective, and collaborative brainstorming assistant for high-performing product and engineering teams. Be precise, avoid platitudes, separate facts from assumptions, and offer direct, actionable insights.',
      },
    ];

    if (includeContext) {
      const { data: pastMessages } = await supabase
        .from('messages')
        .select('sender_type, content')
        .eq('room_id', roomId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (pastMessages && pastMessages.length > 0) {
        // Reverse to chronological order
        const chronological = pastMessages.reverse();
        for (const msg of chronological) {
          if (msg.sender_type === 'user') {
            messagesToSend.push({ role: 'user', content: msg.content });
          } else if (msg.sender_type === 'assistant') {
            messagesToSend.push({ role: 'assistant', content: msg.content });
          }
        }
      }
    } else {
      messagesToSend.push({ role: 'user', content: prompt });
    }

    // Call OpenRouter
    const result = await callOpenRouter(messagesToSend, {
      modelId,
      temperature: 0.7,
      maxTokens: 2500,
    });

    // Persist AI response
    const { data: savedMessage, error: saveError } = await supabase
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
      .select('id, room_id, sender_type, model_id, content, status, created_at')
      .single();

    if (saveError) {
      console.error('Error saving AI message:', saveError);
    }

    return NextResponse.json({
      success: true,
      message: savedMessage || {
        room_id: roomId,
        sender_type: 'assistant',
        model_id: modelId,
        content: result.content,
        status: 'complete',
      },
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
