// Supabase Edge Function — Evolution API webhook → Supabase
// POST https://yadxcbhginjvoemacdly.supabase.co/functions/v1/evolution-webhook
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SB_URL = Deno.env.get('SUPABASE_URL') ?? 'https://yadxcbhginjvoemacdly.supabase.co';
const SB_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const supabase = createClient(SB_URL, SB_KEY);

// Strip @domain and :deviceId (multi-device suffix) before extracting digits
function normalizePhone(jid: string | undefined): string | null {
  if (!jid) return null;
  const stripped = jid.replace(/@[^@]*$/, '').replace(/:[^:]*$/, '');
  return stripped.replace(/\D/g, '') || null;
}

// Normalize any phone to 55 + DDD + number (12–13 digits)
function normalizePhoneForStorage(phone: string): string | null {
  let d = phone.replace(/\D/g, '');
  if (!d) return null;
  if (d.startsWith('55') && (d.length === 12 || d.length === 13)) return d;
  if (d.startsWith('55') && d.length > 13) d = d.slice(2);
  if (d.length > 11) d = d.slice(-11);
  if (d.length < 10) return null;
  return `55${d}`;
}

// Fuzzy phone match by last 11 digits
function phoneTailMatch(storedPhone: string, incomingTail: string): boolean {
  const cel = String(storedPhone ?? '').replace(/\D/g, '');
  return !!(cel && (cel.endsWith(incomingTail) || incomingTail.endsWith(cel.slice(-8))));
}

async function findLeadByPhone(phone: string): Promise<{ id: string; unread_count: number } | null> {
  const { data: leads, error } = await supabase
    .from('leads')
    .select('id, celular, unread_count');
  if (error || !leads) return null;
  const tail = phone.slice(-11);
  return leads.find((l: { celular?: string; id: string; unread_count: number }) =>
    phoneTailMatch(l.celular ?? '', tail)
  ) ?? null;
}

async function findContactByPhone(phone: string): Promise<{ id: string; unread_count: number } | null> {
  const { data, error } = await supabase
    .from('whatsapp_contacts')
    .select('id, phone, unread_count');
  if (error || !data) return null;
  const tail = phone.slice(-11);
  return data.find((c: { phone?: string; id: string; unread_count: number }) =>
    phoneTailMatch(c.phone ?? '', tail)
  ) ?? null;
}

async function createContact(
  phone: string,
  pushName: string | undefined,
  instance: string,
): Promise<{ id: string; unread_count: number } | null> {
  const { data, error } = await supabase
    .from('whatsapp_contacts')
    .insert({
      phone:         normalizePhoneForStorage(phone) ?? phone,
      push_name:     pushName?.trim() || null,
      instance_name: instance,
    })
    .select('id, unread_count')
    .single();
  if (error) { console.error('[contact create]', error.message); return null; }
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

      const now = new Date().toISOString();

      // ── Mensagem enviada pelo app (fromMe) ─────────────────────────────
      if (fromMe) {
        // First try lead, then contact
        const lead = await findLeadByPhone(phone);
        if (lead) {
          await supabase.from('lead_messages').insert({
            lead_id: lead.id, text, direction: 'sent', instance_name: instance, timestamp: now,
          });
          await supabase.from('leads').update({
            last_message_at: now, last_message_text: text.slice(0, 200), last_message_instance: instance,
          }).eq('id', lead.id);
          return new Response(JSON.stringify({ ok: true, leadId: lead.id }), {
            headers: { 'Content-Type': 'application/json' },
          });
        }
        const contact = await findContactByPhone(phone);
        if (contact) {
          await supabase.from('lead_messages').insert({
            contact_id: contact.id, text, direction: 'sent', instance_name: instance, timestamp: now,
          });
          await supabase.from('whatsapp_contacts').update({
            last_message_at: now, last_message_text: text.slice(0, 200), instance_name: instance,
          }).eq('id', contact.id);
          return new Response(JSON.stringify({ ok: true, contactId: contact.id }), {
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return new Response(JSON.stringify({ ok: true, matched: false }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // ── Mensagem recebida ──────────────────────────────────────────────
      const lead = await findLeadByPhone(phone);
      if (lead) {
        // Known lead — store against lead
        const { error: msgErr } = await supabase.from('lead_messages').insert({
          lead_id: lead.id, text, direction: 'received', instance_name: instance, timestamp: now,
        });
        if (msgErr) console.error('[lead_messages insert]', msgErr.message);

        const { error: updErr } = await supabase.from('leads').update({
          last_message_at: now, last_message_text: text.slice(0, 200),
          last_message_instance: instance,
          unread_count: (lead.unread_count ?? 0) + 1,
        }).eq('id', lead.id);
        if (updErr) console.error('[leads update]', updErr.message);

        return new Response(JSON.stringify({ ok: true, leadId: lead.id }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Unknown number — find or create whatsapp_contact (no lead created)
      let contact = await findContactByPhone(phone);
      let created = false;
      if (!contact) {
        contact = await createContact(phone, pushName, instance);
        created = true;
        if (!contact) {
          return new Response(JSON.stringify({ ok: false, error: 'failed to create contact' }), {
            status: 500, headers: { 'Content-Type': 'application/json' },
          });
        }
      }

      const { error: msgErr } = await supabase.from('lead_messages').insert({
        contact_id: contact.id, text, direction: 'received', instance_name: instance, timestamp: now,
      });
      if (msgErr) console.error('[lead_messages contact insert]', msgErr.message);

      const { error: updErr } = await supabase.from('whatsapp_contacts').update({
        last_message_at: now, last_message_text: text.slice(0, 200),
        instance_name: instance,
        unread_count: (contact.unread_count ?? 0) + 1,
      }).eq('id', contact.id);
      if (updErr) console.error('[whatsapp_contacts update]', updErr.message);

      return new Response(JSON.stringify({ ok: true, contactId: contact.id, created }), {
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
