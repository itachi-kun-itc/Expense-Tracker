import { currentUser, json } from "../../_lib/auth.js";

function validId(value) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || "")); }
async function authenticated(context) {
  const user = await currentUser(context.request, context.env);
  if (!user) return { error:json({ error:"ログインが必要です" }, 401) };
  const id = String(context.params.id || "");
  if (!validId(id)) return { error:json({ error:"ファイルIDが不正です" }, 400) };
  return { user, id, key:`${user.id}/payslips/${id}` };
}

export async function onRequestGet(context) {
  const auth = await authenticated(context); if (auth.error) return auth.error;
  const object = await context.env.FILES.get(auth.key);
  if (!object) return json({ error:"ファイルが見つかりません" }, 404);
  const encodedName = object.customMetadata?.name || "payslip.pdf";
  return new Response(object.body, { headers:{
    "Content-Type":"application/pdf",
    "Content-Disposition":`inline; filename*=UTF-8''${encodedName}`,
    "Cache-Control":"private, no-store",
    "X-Content-Type-Options":"nosniff"
  }});
}

export async function onRequestPut(context) {
  const auth = await authenticated(context); if (auth.error) return auth.error;
  const contentLength = Number(context.request.headers.get("Content-Length") || 0);
  if (contentLength > 10 * 1024 * 1024) return json({ error:"PDFは10MB以下にしてください" }, 413);
  if (context.request.headers.get("Content-Type") !== "application/pdf") return json({ error:"PDFファイルだけ保存できます" }, 415);
  const body = await context.request.arrayBuffer();
  if (!body.byteLength || body.byteLength > 10 * 1024 * 1024) return json({ error:"PDFは10MB以下にしてください" }, 413);
  const url = new URL(context.request.url);
  const name = (url.searchParams.get("name") || "payslip.pdf").slice(0, 180);
  const period = (url.searchParams.get("period") || "").slice(0, 7);
  await context.env.FILES.put(auth.key, body, { httpMetadata:{ contentType:"application/pdf" }, customMetadata:{ name:encodeURIComponent(name), period, uploadedAt:new Date().toISOString() } });
  return json({ ok:true, id:auth.id }, 201);
}

export async function onRequestDelete(context) {
  const auth = await authenticated(context); if (auth.error) return auth.error;
  await context.env.FILES.delete(auth.key);
  return json({ ok:true });
}
