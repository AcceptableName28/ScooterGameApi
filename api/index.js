export default function handler(req, res) {
  res.setHeader('Content-Type','text/html; charset=utf-8');
  res.status(200).send(`
    <h1>Scooter Game Leaderboard API</h1>
    <p>GET <a href="/api/leaderboard">/api/leaderboard</a></p>
    <p>POST /api/leaderboard {"name":"AAA","score":123}</p>
  `);
}
