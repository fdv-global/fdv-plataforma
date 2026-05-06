// Supabase Edge Function — Evolution API webhook → Supabase
// POST https://yadxcbhginjvoemacdly.supabase.co/functions/v1/evolution-webhook
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SB_URL = Deno.env.get('SUPABASE_URL') ?? 'https://yadxcbhginjvoemacdly.supabase.co';
const SB_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const supabase = createClient(SB_URL, SB_KEY);

const EVO_URL = Deno.env.get('EVOLUTION_API_URL') ?? 'https://ayub-evolution.8z6sbs.easypanel.host';
const EVO_KEY = Deno.env.get('EVOLUTION_API_KEY') ?? '943BFEBDE2188DF38D176E5FC8AFD';

// Fetch media as base64 data URL via Evolution API (stickers, audio PTT)
async function getMediaBase64(
  instance: string,
  messageData: Record<string, unknown>,
  maxBase64Bytes = 2_500_000,
): Promise<string | null> {
  try {
    const res = await fetch(`${EVO_URL}/chat/getBase64FromMediaMessage/${instance}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', apikey: EVO_KEY },
      body:    JSON.stringify({ message: messageData }),
    });
    if (!res.ok) return null;
    const d        = await res.json() as Record<string, unknown>;
    const base64   = d.base64   as string | undefined;
    const mimetype = d.mimetype as string | undefined;
    if (!base64 || !mimetype) return null;
    if (base64.length > maxBase64Bytes) return null; // skip if too large
    return `data:${mimetype};base64,${base64}`;
  } catch { return null; }
}

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
      const imgMsg     = (messageObj.imageMessage     ?? {}) as Record<string, unknown>;
      const vidMsg     = (messageObj.videoMessage     ?? {}) as Record<string, unknown>;
      const stickerMsg = (messageObj.stickerMessage   ?? {}) as Record<string, unknown>;
      const audioMsg   = (messageObj.audioMessage     ?? {}) as Record<string, unknown>;
      const pttMsg     = (messageObj.pttMessage       ?? {}) as Record<string, unknown>;
      const docMsg     = (messageObj.documentMessage  ?? {}) as Record<string, unknown>;
      const pushName   = data.pushName as string | undefined;

      // Skip group and broadcast messages
      const remoteJid = key.remoteJid as string;
      if (!remoteJid || remoteJid.endsWith('@g.us') || remoteJid.endsWith('@broadcast')) {
        return new Response(JSON.stringify({ ok: true, skipped: 'group_or_broadcast' }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const fromMe = !!key.fromMe;
      const phone  = normalizePhone(remoteJid);

      // Determine media type — check sub-message fields first, fall back to messageType
      const messageType = data.messageType as string | undefined;
      const isAudio   = !!(audioMsg.mimetype || audioMsg.url || pttMsg.mimetype || pttMsg.url)
                        || messageType === 'audioMessage' || messageType === 'pttMessage';
      const isSticker = !!(stickerMsg.mimetype || stickerMsg.url) || messageType === 'stickerMessage';
      const isImage   = !!(imgMsg.mimetype || imgMsg.url) || messageType === 'imageMessage';
      const isVideo   = !!(vidMsg.mimetype || vidMsg.url) || messageType === 'videoMessage';
      const isDoc     = !!(docMsg.mimetype || docMsg.url)
                        || messageType === 'documentMessage' || messageType === 'documentWithCaptionMessage';
      const mediaType = isSticker ? 'sticker' : isAudio ? 'audio' : isImage ? 'image' : isVideo ? 'video' : isDoc ? 'document' : null;

      const text = (
        (messageObj.conversation as string) ||
        (extMsg.text            as string)  ||
        (imgMsg.caption         as string)  ||
        (vidMsg.caption         as string)  ||
        (docMsg.caption         as string)  ||
        (isSticker ? '[sticker]' : null)    ||
        (isAudio   ? '[áudio]'   : null)    ||
        '[mídia]'
      );

      if (!phone) return new Response(JSON.stringify({ ok: true, matched: false }), {
        headers: { 'Content-Type': 'application/json' },
      });

      const now = new Date().toISOString();

      // ── Mensagem enviada (fromMe) — buscar base64 para sticker e áudio também ──
      if (fromMe) {
        let sentMediaUrl: string | null = null;
        if (mediaType === 'sticker' || mediaType === 'audio') {
          const limit = mediaType === 'sticker' ? 3_000_000 : 2_000_000;
          sentMediaUrl = await getMediaBase64(instance, data, limit);
        }
        const sentExtra = {
          ...(mediaType    && { media_type: mediaType    }),
          ...(sentMediaUrl && { media_url:  sentMediaUrl }),
        };
        const lead = await findLeadByPhone(phone);
        if (lead) {
          await supabase.from('lead_messages').insert({
            lead_id: lead.id, text, direction: 'sent', instance_name: instance, timestamp: now,
            ...sentExtra,
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
            ...sentExtra,
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

      // ── Mensagem recebida — buscar base64 para sticker e áudio ────────────
      let mediaUrl: string | null = null;
      if (mediaType === 'sticker' || mediaType === 'audio') {
        // Limit: stickers ~3 MB base64, audio ~2 MB base64 (~1.5 MB original)
        const limit = mediaType === 'sticker' ? 3_000_000 : 2_000_000;
        mediaUrl = await getMediaBase64(instance, data, limit);
      }

      const msgExtra = {
        ...(mediaType && { media_type: mediaType }),
        ...(mediaUrl  && { media_url:  mediaUrl  }),
      };

      // ── Lead conhecido ─────────────────────────────────────────────────────
      const lead = await findLeadByPhone(phone);
      if (lead) {
        const { error: msgErr } = await supabase.from('lead_messages').insert({
          lead_id: lead.id, text, direction: 'received', instance_name: instance, timestamp: now,
          ...msgExtra,
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
        ...msgExtra,
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
