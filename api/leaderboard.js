// GET  /api/leaderboard  -> top 10 scores (name, score, created_at)
// POST /api/leaderboard  -> { name:"ABC", score:1234 }  (A–Z/0–9, max 3)
import { createClient } from '@supabase/supabase-js';

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*'); // lock down later if you want
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;

  // Helpful response even if env vars missing (makes debugging obvious)
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    if (req.method === 'GET') return res.status(200).json([]); // don't break the page
    return res.status(500).json({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE' });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('scores')
        .select('name,score,created_at')
        .order('score', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(10);
      if (error) throw error;
      return res.status(200).json(data || []);
    }

    if (req.method === 'POST') {
      // body may be an object (Vercel) or string (fallback)
      let body = req.body;
      if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }

      const name = (body?.name || '')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 3);

      const score = Math.max(0, Math.min(1_000_000, Number(body?.score) | 0));

      if (!name) return res.status(400).json({ error: 'Invalid initials' });

      const { data, error } = await supabase
        .from('scores')
        .insert([{ name, score }])
        .select('name,score,created_at')
        .single();

      if (error) throw error;
      return res.status(200).json(data);
    }

    res.setHeader('Allow', 'GET, POST, OPTIONS');
    return res.status(405).end('Method Not Allowed');
  } catch (err) {
    return res.status(500).json({ error: 'Server error', detail: String(err?.message || err) });
  }
}
