const SB_URL = 'https://yadxcbhginjvoemacdly.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhZHhjYmhnaW5qdm9lbWFjZGx5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njk2Nzk4MSwiZXhwIjoyMDkyNTQzOTgxfQ.Vp_JSA4ReP40a25L8GS7stNdROAy5YIIw-7HM98z_RY';
async function fetchAll(path, fields) {
  let all = [], offset = 0;
  while (true) {
    const res = await fetch(`${SB_URL}/rest/v1/${path}&select=${fields}&limit=1000&offset=${offset}`, { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } });
    const page = await res.json();
    if (!page.length) break;
    all.push(...page);
    offset += 1000;
    if (page.length < 1000) break;
  }
  return all;
}
const all = await fetchAll('leads?', 'id,nome,status,status_closer,kanban_column,realizadaem,dataagendamento');
// status='realizada' mas kanban_column='agendado' (moveram de volta via dropdown/drag, sem passar por handlePostCall reverso)
const mismatch1 = all.filter(l => l.status === 'realizada' && l.kanban_column === 'agendado');
console.log('status=realizada + kanban_column=agendado (mismatch já existente):', mismatch1.length);
mismatch1.forEach(l => console.log(' ', l.nome, '| realizadaem:', l.realizadaem));

// status='agendado' mas kanban_column em negociacao/decisao/call_realizada (avançou no kanban sem "realizar" a call)
const mismatch2 = all.filter(l => l.status === 'agendado' && ['call_realizada','negociacao','decisao'].includes(l.kanban_column));
console.log('\nstatus=agendado + kanban_column avançado (mismatch já existente):', mismatch2.length);
mismatch2.forEach(l => console.log(' ', l.nome, '| kanban_column:', l.kanban_column));

// status='qualificado' mas com dataagendamento preenchida (ficou "meio caminho")
const mismatch3 = all.filter(l => l.status === 'qualificado' && l.dataagendamento);
console.log('\nstatus=qualificado + dataagendamento preenchida:', mismatch3.length);
mismatch3.forEach(l => console.log(' ', l.nome, '| dataagendamento:', l.dataagendamento));
