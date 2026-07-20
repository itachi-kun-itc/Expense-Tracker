const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const host = "127.0.0.1";
const port = Number(process.env.EXPENCE_TRACKER_PORT) || 4173;
const root = __dirname;
const localDbPath = path.join(root, ".local-account.json");
const sessions = new Map();
const localDeviceUser = { id:"local-device", username:"Local端末", role:"admin" };
const types = { ".html":"text/html; charset=utf-8", ".css":"text/css; charset=utf-8", ".js":"text/javascript; charset=utf-8", ".json":"application/json; charset=utf-8", ".svg":"image/svg+xml" };

function loadDb() {
  try { const value=JSON.parse(fs.readFileSync(localDbPath,"utf8"));return {users:Array.isArray(value.users)?value.users:[],data:value.data||{}}; }
  catch { return {users:[],data:{}}; }
}
function saveDb(db) { fs.writeFileSync(localDbPath,JSON.stringify(db,null,2),"utf8"); }
function json(response,status,body,headers={}) { response.writeHead(status,{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store",...headers});response.end(JSON.stringify(body)); }
function readBody(request) { return new Promise((resolve,reject)=>{let body="";request.on("data",chunk=>{body+=chunk;if(body.length>2_000_000){reject(new Error("too large"));request.destroy();}});request.on("end",()=>{try{resolve(JSON.parse(body||"{}"));}catch{reject(new Error("invalid json"));}});request.on("error",reject);}); }
function normalizeUsername(value) { return String(value||"").normalize("NFKC").trim(); }
function validUsername(value) { return value.length>=3&&value.length<=32&&/^[\p{L}\p{N}_.-]+$/u.test(value); }
function passwordHash(password,salt) { return crypto.pbkdf2Sync(password,salt,210000,32,"sha256").toString("hex"); }
function cookie(request,name) { const match=(request.headers.cookie||"").match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));return match?decodeURIComponent(match[1]):""; }
function currentUser(request,db) { const token=cookie(request,"et_session"),userId=sessions.get(token);return userId?db.users.find(user=>user.id===userId)||null:null; }

async function authApi(request,response) {
  const db=loadDb();
  if(request.method==="GET"){const user=currentUser(request,db)||localDeviceUser;json(response,200,{user:{id:user.id,username:user.username,role:user.role||"user"}});return;}
  if(request.method!=="POST"){json(response,405,{error:"Method Not Allowed"});return;}
  let body;try{body=await readBody(request);}catch{json(response,400,{error:"入力内容を確認してください"});return;}
  if(body.action==="logout"){const token=cookie(request,"et_session");sessions.delete(token);json(response,200,{ok:true},{"Set-Cookie":"et_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0"});return;}
  const username=normalizeUsername(body.username),key=username.toLocaleLowerCase("en-US"),password=String(body.password||"");
  if(!validUsername(username)){json(response,400,{error:"アカウント名は3〜32文字の文字・数字・_・.・-で入力してください"});return;}
  const minimumLength=key==="haruka"?6:8;if(password.length<minimumLength||password.length>128){json(response,400,{error:`パスワードは${minimumLength}〜128文字で入力してください`});return;}
  let user;
  if(body.action==="register"){
    if(db.users.some(item=>item.key===key)){json(response,409,{error:"そのアカウント名は既に使われています"});return;}
    const salt=crypto.randomBytes(16).toString("base64");user={id:crypto.randomUUID(),username,key,salt,passwordHash:passwordHash(password,salt)};db.users.push(user);saveDb(db);
  }else if(body.action==="login"){
    user=db.users.find(item=>item.key===key);const candidate=user?passwordHash(password,user.salt):"";
    if(!user||candidate.length!==user.passwordHash.length||!crypto.timingSafeEqual(Buffer.from(candidate),Buffer.from(user.passwordHash))){json(response,401,{error:"アカウント名またはパスワードが違います"});return;}
  }else{json(response,400,{error:"未対応の操作です"});return;}
  const token=crypto.randomBytes(32).toString("base64url");sessions.set(token,user.id);json(response,body.action==="register"?201:200,{user:{id:user.id,username:user.username,role:key==="haruka"?"admin":"user"}},{"Set-Cookie":`et_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=2592000`});
}
async function dataApi(request,response) {
  const db=loadDb(),user=currentUser(request,db)||localDeviceUser;
  if(request.method==="GET"){json(response,200,{data:db.data[user.id]||null});return;}
  if(request.method==="PUT"){let body;try{body=await readBody(request);}catch{json(response,400,{error:"保存内容を確認してください"});return;}db.data[user.id]=body.data||null;saveDb(db);json(response,200,{ok:true});return;}
  json(response,405,{error:"Method Not Allowed"});
}

http.createServer(async (request,response)=>{
  const requestPath=decodeURIComponent(request.url.split("?")[0]);
  if(requestPath==="/api/auth"){await authApi(request,response);return;}
  if(requestPath==="/api/data"){await dataApi(request,response);return;}
  if(requestPath.startsWith("/api/files")){json(response,501,{error:"給与明細PDFはCloudflare版で利用できます"});return;}
  const relativePath=requestPath==="/"?"index.html":requestPath.replace(/^\/+/,""),filePath=path.resolve(root,relativePath);
  if(!filePath.startsWith(root+path.sep)){response.writeHead(403).end("Forbidden");return;}
  fs.readFile(filePath,(error,content)=>{if(error){response.writeHead(error.code==="ENOENT"?404:500).end(error.code==="ENOENT"?"Not Found":"Server Error");return;}response.writeHead(200,{"Content-Type":types[path.extname(filePath)]||"application/octet-stream"});response.end(content);});
}).listen(port,host,()=>console.log(`Expence-Tracker: http://${host}:${port}`));
