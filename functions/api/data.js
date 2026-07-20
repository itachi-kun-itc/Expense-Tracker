import { currentUser, json } from "../_lib/auth.js";

export async function onRequestGet(context) {
  const user = await currentUser(context.request, context.env);
  if (!user) return json({ error: "ログインが必要です" }, 401);
  const record = await context.env.DB.prepare("SELECT data_json, updated_at FROM user_data WHERE user_id = ?").bind(user.id).first();
  if (!record) return json({ data: null, updatedAt: null });
  try { return json({ data: JSON.parse(record.data_json), updatedAt: record.updated_at }); }
  catch { return json({ error: "保存データを読み込めません" }, 500); }
}

export async function onRequestPut(context) {
  const user = await currentUser(context.request, context.env);
  if (!user) return json({ error: "ログインが必要です" }, 401);
  if (Number(context.request.headers.get("Content-Length") || 0) > 2000000) return json({ error: "保存データが大きすぎます" }, 413);
  let body;
  try { body = await context.request.json(); } catch { return json({ error: "保存データが不正です" }, 400); }
  if (!body.data || typeof body.data !== "object") return json({ error: "保存データが不正です" }, 400);
  const dataJson = JSON.stringify(body.data);
  if (dataJson.length > 2000000) return json({ error: "保存データが大きすぎます" }, 413);
  const updatedAt = new Date().toISOString();
  await context.env.DB.prepare(`
    INSERT INTO user_data (user_id, data_json, updated_at) VALUES (?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET data_json = excluded.data_json, updated_at = excluded.updated_at
  `).bind(user.id, dataJson, updatedAt).run();
  return json({ ok: true, updatedAt });
}
