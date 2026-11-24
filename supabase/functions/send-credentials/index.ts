import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  try {
    const { email, senha } = await req.json();
    if (typeof email !== 'string' || typeof senha !== 'string' || !email || !senha) {
      return json({ error: 'email e senha são obrigatórios' }, 400);
    }

    // Only send to a real user whose pending temp password matches: blocks use as an open mail relay.
    const { data: user, error } = await db
      .from('usuarios')
      .select('email, nome, senha_temp, ativo')
      .eq('email', email.trim())
      .maybeSingle();
    if (error) throw error;
    if (!user || !user.ativo || !user.senha_temp || !safeEqual(user.senha_temp, senha)) {
      return json({ error: 'credenciais não conferem com um usuário pendente' }, 403);
    }

    const client = new SMTPClient({
      connection: {
        hostname: Deno.env.get('SMTP_HOST')!,
        port:     Number(Deno.env.get('SMTP_PORT') ?? '587'),
        tls:      Deno.env.get('SMTP_TLS') === 'true',
        auth: {
          username: Deno.env.get('SMTP_USER')!,
          password: Deno.env.get('SMTP_PASS')!,
        },
      },
    });

    await client.send({
      from:    `"Faculdade da Vida" <${Deno.env.get('SMTP_FROM') ?? Deno.env.get('SMTP_USER')}>`,
      to:      user.email,
      subject: 'Credenciais de acesso — Sistema FDV',
      html:    buildHtml({ email: user.email, nome: user.nome || user.email, senha: user.senha_temp }),
    });

    await client.close();
    return json({ ok: true });
  } catch (err: unknown) {
    console.error('[send-credentials]', err instanceof Error ? err.message : String(err));
    return json({ error: 'falha ao enviar' }, 500);
  }
});

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function buildHtml({ email, nome, senha }: { email: string; nome: string; senha: string }) {
  [email, nome, senha] = [esc(email), esc(nome), esc(senha)];
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0f1c1e;font-family:sans-serif">
  <div style="max-width:480px;margin:40px auto;background:#1f2e31;border-radius:10px;overflow:hidden">
    <div style="background:#0e7a8a;padding:28px 32px">
      <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700">Faculdade da Vida</h1>
      <p style="margin:6px 0 0;color:rgba(255,255,255,.75);font-size:14px">Sistema de Gestão</p>
    </div>
    <div style="padding:32px">
      <p style="margin:0 0 6px;color:#E4EAEA;font-size:15px">Olá, <strong>${nome}</strong>!</p>
      <p style="margin:0 0 24px;color:#8fa0a2;font-size:14px">Seu acesso ao sistema foi criado. Use as credenciais abaixo para entrar.</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #2d444a;color:#8fa0a2;font-size:13px;width:38%">Link</td>
          <td style="padding:12px 0;border-bottom:1px solid #2d444a;font-size:13px">
            <a href="https://fdv-global.github.io/fdv-plataforma" style="color:#4db5c8;text-decoration:none">fdv-global.github.io/fdv-plataforma</a>
          </td>
        </tr>
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #2d444a;color:#8fa0a2;font-size:13px">Email</td>
          <td style="padding:12px 0;border-bottom:1px solid #2d444a;color:#E4EAEA;font-size:13px">${email}</td>
        </tr>
        <tr>
          <td style="padding:12px 0;color:#8fa0a2;font-size:13px">Senha temporária</td>
          <td style="padding:12px 0;color:#E4EAEA;font-size:15px;font-weight:700;letter-spacing:.06em">${senha}</td>
        </tr>
      </table>
      <p style="margin:0;font-size:12px;color:#5e7578">Recomendamos alterar a senha após o primeiro acesso.</p>
    </div>
  </div>
</body></html>`;
}
