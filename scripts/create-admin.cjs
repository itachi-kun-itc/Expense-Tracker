const crypto = require("node:crypto");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const [username, password] = process.argv.slice(2);
if (!username || !password) {
  console.error("Usage: node scripts/create-admin.cjs <username> <password>");
  process.exit(1);
}
const normalized = username.normalize("NFKC").trim();
const key = normalized.toLocaleLowerCase("en-US");
const salt = crypto.randomBytes(16).toString("base64");
const iterations = 210000;
const hash = crypto.pbkdf2Sync(password,Buffer.from(salt,"base64"),iterations,32,"sha256").toString("hex");
const quote = value => `'${String(value).replaceAll("'","''")}'`;
const sql = `INSERT INTO users (username, username_key, password_hash, salt, iterations) VALUES (${quote(normalized)}, ${quote(key)}, ${quote(hash)}, ${quote(salt)}, ${iterations}) ON CONFLICT(username_key) DO UPDATE SET username=excluded.username, password_hash=excluded.password_hash, salt=excluded.salt, iterations=excluded.iterations;`;
const command = process.platform === "win32" ? "npx.cmd" : "npx";
const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(),"expense-admin-"));
const sqlFile = path.join(tempDirectory,"admin.sql");
fs.writeFileSync(sqlFile,sql,"utf8");
const result = spawnSync(command,["wrangler","d1","execute","expence-tracker","--remote","--file",sqlFile],{cwd:path.resolve(__dirname,".."),stdio:"inherit",shell:process.platform === "win32"});
fs.rmSync(tempDirectory,{recursive:true,force:true});
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
