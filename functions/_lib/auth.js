const encoder = new TextEncoder();

export function normalizeUsername(value) {
  return String(value || "").normalize("NFKC").trim();
}

export function validUsername(value) {
  return value.length >= 3 && value.length <= 32 && /^[\p{L}\p{N}_.-]+$/u.test(value);
}

function bytesToHex(bytes) {
  return [...new Uint8Array(bytes)].map(value => value.toString(16).padStart(2, "0")).join("");
}

function bytesToBase64(bytes) {
  let binary = "";
  for (const value of new Uint8Array(bytes)) binary += String.fromCharCode(value);
  return btoa(binary);
}

function base64ToBytes(value) {
  const binary = atob(value);
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

export async function hashPassword(password, saltBase64, iterations = 100000) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: base64ToBytes(saltBase64), iterations }, key, 256);
  return bytesToHex(bits);
}

export function createSalt() {
  return bytesToBase64(crypto.getRandomValues(new Uint8Array(16)));
}

export function createToken() {
  return bytesToBase64(crypto.getRandomValues(new Uint8Array(32))).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export async function hashToken(token) {
  return bytesToHex(await crypto.subtle.digest("SHA-256", encoder.encode(token)));
}

export function safeEqual(left, right) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index++) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

export function cookieValue(request, name) {
  const cookies = request.headers.get("Cookie") || "";
  const item = cookies.split(";").map(value => value.trim()).find(value => value.startsWith(`${name}=`));
  return item ? decodeURIComponent(item.slice(name.length + 1)) : "";
}

export function sessionCookie(token, request, maxAge = 2592000) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `et_session=${encodeURIComponent(token)}; HttpOnly${secure}; SameSite=Strict; Path=/; Max-Age=${maxAge}`;
}

export async function currentUser(request, env) {
  const token = cookieValue(request, "et_session");
  if (!token) return null;
  const tokenHash = await hashToken(token);
  return env.DB.prepare(`
    SELECT users.id, users.username
    FROM sessions JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ? AND sessions.expires_at > ?
  `).bind(tokenHash, Math.floor(Date.now() / 1000)).first();
}

export function json(data, status = 200, headers = {}) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store", ...headers } });
}
