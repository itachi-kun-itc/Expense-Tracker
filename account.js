(() => {
  let user = null;
  let hydrated = false;
  let saveTimer = null;
  let saving = false;

  const dialog = document.createElement("dialog");
  dialog.id = "accountDialog";
  dialog.innerHTML = `
    <form id="accountForm">
      <div class="modal-head">
        <div><p class="eyebrow">CLOUDFLARE ACCOUNT</p><h2>アカウント</h2></div>
        <button type="button" class="close-btn" data-account-close>×</button>
      </div>
      <div class="auth-fields">
        <label>アカウント名<input name="username" autocomplete="username" minlength="3" maxlength="32" required placeholder="3〜32文字"></label>
        <label>パスワード<input name="password" type="password" autocomplete="current-password" minlength="8" maxlength="128" required placeholder="8文字以上"></label>
        <p class="account-error" role="alert"></p>
        <div class="account-actions"><button class="primary-btn" data-auth-action="login">ログイン</button><button class="secondary-btn" data-auth-action="register">新規登録</button></div>
      </div>
      <div class="account-session" hidden>
        <p class="account-status"><strong data-session-name></strong> でログイン中です。データはCloudflareに保存され、同じアカウントで複数端末から利用できます。</p>
        <p class="sync-state online" data-sync-state>同期済み</p>
        <button type="button" class="secondary-btn wide" data-logout>ログアウト</button>
      </div>
    </form>`;
  document.body.appendChild(dialog);

  const fields = dialog.querySelector(".auth-fields");
  const session = dialog.querySelector(".account-session");
  const errorBox = dialog.querySelector(".account-error");
  const syncState = dialog.querySelector("[data-sync-state]");

  function snapshot() {
    return {
      version: 1,
      finance: window.ExpenceFinanceStore?.snapshot() || null,
      workspace: window.ExpenceWorkspaceStore?.snapshot() || null,
      salary: window.ExpenceSalaryStore?.snapshot() || null
    };
  }

  function restore(data) {
    if (!data || typeof data !== "object") return;
    if (data.finance) window.ExpenceFinanceStore?.restore(data.finance);
    if (data.workspace) window.ExpenceWorkspaceStore?.restore(data.workspace);
    if (data.salary) window.ExpenceSalaryStore?.restore(data.salary);
  }

  async function request(path, options = {}) {
    const response = await fetch(path, {
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || "Cloudflareへの接続に失敗しました");
    return body;
  }

  function updateAccountUi() {
    document.querySelectorAll("[data-account-label]").forEach(el => el.textContent = user?.username || "ログイン");
    document.querySelectorAll("[data-account-avatar]").forEach(el => el.textContent = user?.username?.slice(0, 1).toUpperCase() || "私");
    fields.hidden = Boolean(user);
    session.hidden = !user;
    if (user) dialog.querySelector("[data-session-name]").textContent = user.username;
  }

  function setSyncState(text, mode = "online") {
    syncState.textContent = text;
    syncState.className = `sync-state ${mode}`;
  }

  async function pull() {
    if (!user || saving) return;
    try {
      setSyncState("同期中…", "syncing");
      const result = await request("/api/data");
      if (result.data) restore(result.data);
      else await push();
      hydrated = true;
      setSyncState("同期済み");
    } catch (error) {
      setSyncState("同期できません", "");
      throw error;
    }
  }

  async function push() {
    if (!user || !hydrated && saveTimer) return;
    saving = true;
    setSyncState("保存中…", "syncing");
    try {
      await request("/api/data", { method: "PUT", body: JSON.stringify({ data: snapshot() }) });
      hydrated = true;
      setSyncState("同期済み");
    } catch {
      setSyncState("保存できません", "");
    } finally {
      saving = false;
    }
  }

  function schedule() {
    if (!user || !hydrated) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { saveTimer = null; push(); }, 700);
  }

  async function authenticate(action, username, password) {
    errorBox.textContent = "";
    const result = await request("/api/auth", { method: "POST", body: JSON.stringify({ action, username, password }) });
    user = result.user;
    hydrated = true;
    updateAccountUi();
    const remote = await request("/api/data");
    if (remote.data) restore(remote.data); else await push();
    setSyncState("同期済み");
  }

  document.addEventListener("click", event => {
    if (event.target.closest("[data-account-open]")) { errorBox.textContent = ""; updateAccountUi(); dialog.showModal(); }
    if (event.target.closest("[data-account-close]")) dialog.close();
  });

  dialog.querySelector("#accountForm").addEventListener("submit", async event => {
    event.preventDefault();
    const button = event.submitter;
    const action = button?.dataset.authAction;
    if (!action) return;
    const form = new FormData(event.currentTarget);
    button.disabled = true;
    try {
      await authenticate(action, String(form.get("username") || "").trim(), String(form.get("password") || ""));
    } catch (error) {
      errorBox.textContent = error.message.includes("Cloudflare") ? error.message : `エラー：${error.message}`;
    } finally {
      button.disabled = false;
    }
  });

  dialog.querySelector("[data-logout]").addEventListener("click", async () => {
    try { await request("/api/auth", { method: "POST", body: JSON.stringify({ action: "logout" }) }); } catch {}
    user = null; hydrated = false;
    window.ExpenceFinanceStore?.reset(); window.ExpenceWorkspaceStore?.reset(); window.ExpenceSalaryStore?.reset();
    updateAccountUi(); dialog.close();
  });

  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && user && hydrated) pull().catch(() => {}); });

  window.CloudSync = { schedule, pull };
  updateAccountUi();
  request("/api/auth").then(result => {
    user = result.user || null; updateAccountUi();
    if (user) { hydrated = true; return pull(); }
  }).catch(() => {});
})();
