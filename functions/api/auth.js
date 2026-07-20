import { createSalt, createToken, currentUser, hashPassword, hashToken, json, normalizeUsername, safeEqual, sessionCookie, validUsername } from "../_lib/auth.js";

const publicUser = user => user ? { id:user.id, username:user.username, role:normalizeUsername(user.username).toLocaleLowerCase("en-US") === "haruka" ? "admin" : "user" } : null;

async function createSession(userId, request, env) {
  const token = createToken();
  const tokenHash = await hashToken(token);
  const expiresAt = Math.floor(Date.now() / 1000) + 2592000;
  await env.DB.prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)").bind(tokenHash, userId, expiresAt).run();
  return sessionCookie(token, request);
}

export async function onRequestGet(context) {
  const user = await currentUser(context.request, context.env);
  return json({ user: publicUser(user) });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  let body;
  try { body = await request.json(); } catch { return json({ error: "入力内容を確認してください" }, 400); }

  if (body.action === "logout") {
    const token = request.headers.get("Cookie")?.match(/(?:^|;\s*)et_session=([^;]+)/)?.[1];
    if (token) await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await hashToken(decodeURIComponent(token))).run();
    return json({ ok: true }, 200, { "Set-Cookie": sessionCookie("", request, 0) });
  }

  const username = normalizeUsername(body.username);
  const usernameKey = username.toLocaleLowerCase("en-US");
  const password = String(body.password || "");
  if (!validUsername(username)) return json({ error: "アカウント名は3〜32文字の文字・数字・_・.・-で入力してください" }, 400);
  const minimumLength = 6;
  if (password.length < minimumLength || password.length > 128) return json({ error: `パスワードは${minimumLength}〜128文字で入力してください` }, 400);

  if (body.action === "register") {
    const salt = createSalt();
    const iterations = 100000;
    const passwordHash = await hashPassword(password, salt, iterations);
    try {
      const result = await env.DB.prepare(`
        INSERT INTO users (username, username_key, password_hash, salt, iterations)
        VALUES (?, ?, ?, ?, ?)
      `)
        .bind(username, usernameKey, passwordHash, salt, iterations).run();
      const cookie = await createSession(result.meta.last_row_id, request, env);
      return json({ user: publicUser({ id:result.meta.last_row_id, username }) }, 201, { "Set-Cookie": cookie });
    } catch (error) {
      if (String(error?.message || error).toLowerCase().includes("unique")) return json({ error: "そのアカウント名は既に使われています" }, 409);
      return json({ error: "アカウントを作成できませんでした。データベース設定を確認してください" }, 500);
    }
  }

  if (body.action === "login") {
    const user = await env.DB.prepare("SELECT id, username, password_hash, salt, iterations FROM users WHERE username_key = ?").bind(usernameKey).first();
    if (!user) return json({ error: "アカウント名またはパスワードが違います" }, 401);
    const candidate = await hashPassword(password, user.salt, user.iterations);
    if (!safeEqual(candidate, user.password_hash)) return json({ error: "アカウント名またはパスワードが違います" }, 401);
    const cookie = await createSession(user.id, request, env);
    return json({ user: publicUser(user) }, 200, { "Set-Cookie": cookie });
  }

  return json({ error: "未対応の操作です" }, 400);
}
