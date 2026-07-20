import { currentUser, json } from "../_lib/auth.js";

export async function onRequestGet(context) {
  const user = await currentUser(context.request, context.env);
  if (!user) return json({ error: "ログインが必要です" }, 401);
  const prefix = `${user.id}/payslips/`;
  const result = await context.env.FILES.list({ prefix, include:["httpMetadata","customMetadata"] });
  const files = result.objects.map(object => ({
    id: object.key.slice(prefix.length),
    name: decodeURIComponent(object.customMetadata?.name || "payslip.pdf"),
    period: object.customMetadata?.period || "",
    contentType: object.httpMetadata?.contentType || object.customMetadata?.contentType || "application/octet-stream",
    uploadedAt: object.uploaded?.toISOString?.() || "",
    size: object.size
  })).sort((left, right) => right.uploadedAt.localeCompare(left.uploadedAt));
  return json({ files });
}
