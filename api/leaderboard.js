// GET  /api/leaderboard       -> top 10 scores
// POST /api/leaderboard {name:"ABC", score:1234} -> add score
export default async function handler(req, res) {
  // CORS (relax for testing; later set to your GH Pages origin)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE; // server-only secret
  if (!url || !key) return res.status(500).json({ error: 'Missing env vars' });

  const isValidName = s => /^[A-Z0-9]{1,3}$/.test((s||'').toUpperCase());
  const clampScore  = n => Math.max(0, Math.min(1_000_000, Number(n)|0));

  if (req.method === 'GET') {
    const r = await fetch(
      `${url}/rest/v1/scores?select=name,score,created_at&order=score.desc,created_at.asc&limit=10`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } }
    );
    const data = await r.json();
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    const { name, score } = req.body || {};
    const cleanName = (name||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,3);
    if (!isValidName(cleanName)) return res.status(400).json({ error: 'Invalid initials' });
    const cleanScore = clampScore(score);

    const r = await fetch(`${url}/rest/v1/scores`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
      },
      body: JSON.stringify({ name: cleanName, score: cleanScore })
    });
    if (!r.ok) return res.status(500).json({ error: 'Insert failed', detail: await r.text() });
    const [row] = await r.json();
    return res.status(200).json(row);
  }

  res.setHeader('Allow', 'GET, POST, OPTIONS');
  res.status(405).end('Method Not Allowed');
}
