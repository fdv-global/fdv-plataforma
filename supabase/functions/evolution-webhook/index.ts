// Supabase Edge Function — Evolution API webhook → Supabase
// POST https://yadxcbhginjvoemacdly.supabase.co/functions/v1/evolution-webhook
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SB_URL = Deno.env.get('SUPABASE_URL') ?? 'https://yadxcbhginjvoemacdly.supabase.co';
const SB_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const supabase = createClient(SB_URL, SB_KEY);

function normalizePhone(jid: string | undefined): string | null {
  if (!jid) return null;
  return jid.replace(/@.*$/, '').replace(/\D/g, '');
}

async function findLeadByPhone(phone: string): Promise<{ id: string; unread_count: number } | null> {
  const { data: leads, error } = await supabase
    .from('leads')
    .select('id, celular, unread_count');
  if (error || !leads) return null;
  const tail = phone.slice(-11);
  return leads.find((l: { celular?: string; id: string; unread_count: number }) => {
    const cel = String(l.celular ?? '').replace(/\D/g, '');
    return cel && (cel.endsWith(tail) || tail.endsWith(cel.slice(-8)));
  }) ?? null;
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const event    = body.event as string;
  const instance = body.instance as string;

  try {
    // ── MESSAGES UPSERT ────────────────────────────────────────────────────
    if (event === 'messages.upsert' || event === 'MESSAGES_UPSERT') {
      const data       = (body.data ?? {}) as Record<string, unknown>;
      const key        = (data.key  ?? {}) as Record<string, unknown>;
      const messageObj = (data.message ?? {}) as Record<string, unknown>;
      const extMsg     = (messageObj.extendedTextMessage ?? {}) as Record<string, unknown>;
      const imgMsg     = (messageObj.imageMessage ?? {}) as Record<string, unknown>;
      const vidMsg     = (messageObj.videoMessage  ?? {}) as Record<string, unknown>;

      const fromMe = !!key.fromMe;
      const phone  = normalizePhone(key.remoteJid as string);
      const text   = (
        (messageObj.conversation as string) ||
        (extMsg.text as string)             ||
        (imgMsg.caption as string)          ||
        (vidMsg.caption as string)          ||
        '[mídia]'
      );

      if (!phone) return new Response(JSON.stringify({ ok: true, matched: false }), {
        headers: { 'Content-Type': 'application/json' },
      });

      const lead = await findLeadByPhone(phone);
      if (!lead) {
        console.log(`[no-lead] ${phone}`);
        return new Response(JSON.stringify({ ok: true, matched: false }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const now = new Date().toISOString();

      const { error: msgErr } = await supabase.from('lead_messages').insert({
        lead_id:       lead.id,
        text,
        direction:     fromMe ? 'sent' : 'received',
        instance_name: instance,
        timestamp:     now,
      });
      if (msgErr) console.error('[lead_messages insert]', msgErr.message);

      const update: Record<string, unknown> = {
        last_message_at:       now,
        last_message_text:     text.slice(0, 200),
        last_message_instance: instance,
      };
      if (!fromMe) update.unread_count = (lead.unread_count ?? 0) + 1;

      const { error: updErr } = await supabase
        .from('leads')
        .update(update)
        .eq('id', lead.id);
      if (updErr) console.error('[leads update]', updErr.message);

      return new Response(JSON.stringify({ ok: true, leadId: lead.id }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // ── CONNECTION UPDATE ──────────────────────────────────────────────────
    if (event === 'connection.update' || event === 'CONNECTION_UPDATE') {
      const data      = (body.data ?? {}) as Record<string, unknown>;
      const statusMap: Record<string, string> = {
        open:       'connected',
        close:      'disconnected',
        connecting: 'awaiting_qr',
      };
      const newStatus = statusMap[data.state as string] ?? (data.state as string);

      const { error } = await supabase
        .from('whatsapp_instances')
        .update({ status: newStatus, last_activity: new Date().toISOString() })
        .eq('instance_name', instance);
      if (error) console.error('[whatsapp_instances update]', error.message);

      return new Response(JSON.stringify({ ok: true, instance, state: newStatus }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`[event-ignored] ${event}`);
    return new Response(JSON.stringify({ ok: true, ignored: event }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('webhook error', err);
    const msg = err instanceof Error ? err.message : 'unknown error';
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
