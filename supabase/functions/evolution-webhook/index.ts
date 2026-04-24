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

async function createLeadFromWhatsApp(
  phone: string,
  pushName: string | undefined,
  instance: string,
): Promise<{ id: string; unread_count: number } | null> {
  const nome = pushName?.trim() || `WhatsApp ${phone.slice(-4)}`;
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('leads')
    .insert({
      nome,
      celular: phone,
      status: 'Novo',
      origem: 'WHATSAPP',
      datachegada: today,
      last_message_instance: instance,
    })
    .select('id, unread_count')
    .single();

  if (error) {
    console.error('[leads create]', error.message);
    return null;
  }
  return data;
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
      const pushName   = data.pushName as string | undefined;

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

      // Skip messages sent by the bot itself
      if (fromMe) {
        let lead = await findLeadByPhone(phone);
        if (!lead) return new Response(JSON.stringify({ ok: true, matched: false }), {
          headers: { 'Content-Type': 'application/json' },
        });

        const now = new Date().toISOString();
        await supabase.from('lead_messages').insert({
          lead_id:       lead.id,
          text,
          direction:     'sent',
          instance_name: instance,
          timestamp:     now,
        });
        await supabase.from('leads').update({
          last_message_at:       now,
          last_message_text:     text.slice(0, 200),
          last_message_instance: instance,
        }).eq('id', lead.id);

        return new Response(JSON.stringify({ ok: true, leadId: lead.id }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Incoming message: find or create lead
      let lead = await findLeadByPhone(phone);
      let created = false;

      if (!lead) {
        console.log(`[auto-create-lead] ${phone} (${pushName ?? 'sem nome'})`);
        lead = await createLeadFromWhatsApp(phone, pushName, instance);
        created = true;
        if (!lead) {
          return new Response(JSON.stringify({ ok: false, error: 'failed to create lead' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }

      const now = new Date().toISOString();

      const { error: msgErr } = await supabase.from('lead_messages').insert({
        lead_id:       lead.id,
        text,
        direction:     'received',
        instance_name: instance,
        timestamp:     now,
      });
      if (msgErr) console.error('[lead_messages insert]', msgErr.message);

      const { error: updErr } = await supabase
        .from('leads')
        .update({
          last_message_at:       now,
          last_message_text:     text.slice(0, 200),
          last_message_instance: instance,
          unread_count:          (lead.unread_count ?? 0) + 1,
        })
        .eq('id', lead.id);
      if (updErr) console.error('[leads update]', updErr.message);

      return new Response(JSON.stringify({ ok: true, leadId: lead.id, created }), {
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
