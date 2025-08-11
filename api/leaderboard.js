// /api/leaderboard.js
// GET  -> top 10 scores
// POST -> { name:"ABC", score:1234 }  (A–Z/0–9, max 3)

import { createClient } from '@supabase/supabase-js';

// --- CORS helper ---
function setCORS(res) {
  // While testing you can keep '*' — later restrict to your GH Pages origin.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
}

export default async function handler(req, res) {
  setCORS(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const SUPABASE_URL  = process.env.SUPABASE_URL;
  const SERVICE_ROLE  = process.env.SUPABASE_SERVICE_ROLE;

  if (!SUPABASE_URL || !SERVICE_ROLE) {
    return res.status(500).json({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE' });
  }

  // Server-side Supabase client (service role = server secret)
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false }
  });

  const sanitizeInitials = (s='') => s.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,3);
  const clampScore = (n) => Math.max(0, Math.min(1_000_000, Number(n) | 0));

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
      // Vercel parses JSON automatically when Content-Type: application/json.
      // Handle string body just in case.
      let body = req.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch { body = {}; }
      }

      const name = sanitizeInitials(body?.name);
      if (!name || !/^[A-Z0-9]{1,3}$/.test(name)) {
        return res.status(400).json({ error: 'Invalid initials (A–Z / 0–9, up to 3 chars)' });
      }

      const score = clampScore(body?.score);

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
    console.error(err);
    return res.status(500).json({ error: 'Server error', detail: String(err?.message || err) });
  }
}
