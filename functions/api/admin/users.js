import { currentUser, isAdminUser, json } from "../../_lib/auth.js";

export async function onRequestGet({ request, env }) {
  const user = await currentUser(request, env);
  if (!user) return json({ error: "ログインが必要です" }, 401);
  if (!isAdminUser(user)) return json({ error: "管理者のみ利用できます" }, 403);

  const now = Math.floor(Date.now() / 1000);
  const result = await env.DB.prepare(`
    SELECT
      users.id,
      users.username,
      users.created_at,
      MAX(sessions.created_at) AS last_login_at,
      SUM(CASE WHEN sessions.expires_at > ? THEN 1 ELSE 0 END) AS active_sessions
    FROM users
    LEFT JOIN sessions ON sessions.user_id = users.id
    GROUP BY users.id, users.username, users.created_at
    ORDER BY users.created_at DESC, users.id DESC
  `).bind(now).all();

  return json({
    users: (result.results || []).map(account => ({
      id: account.id,
      username: account.username,
      role: isAdminUser(account) ? "admin" : "user",
      createdAt: Number(account.created_at) || null,
      lastLoginAt: Number(account.last_login_at) || null,
      activeSessions: Number(account.active_sessions) || 0
    }))
  });
}
