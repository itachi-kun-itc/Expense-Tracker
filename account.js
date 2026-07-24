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
        <button type="button" class="close-btn" data-account-close>← 戻る</button>
      </div>
      <div class="auth-fields">
        <label>アカウント名<input name="username" autocomplete="username" minlength="3" maxlength="32" required placeholder="my-account"></label>
        <label>パスワード<input name="password" type="password" autocomplete="current-password" minlength="6" maxlength="128" required placeholder="6文字以上のパスワード"></label>
        <p class="password-warning">パスワードを忘れると復旧できません。必ずご自身で安全な場所に控えてください。</p>
        <p class="account-error" role="alert"></p>
        <div class="account-actions"><button class="primary-btn" data-auth-action="login">ログイン</button><button class="secondary-btn" data-auth-action="register">新規登録</button></div>
      </div>
      <div class="account-session" hidden>
        <p class="account-status"><strong data-session-name></strong><span class="account-role" data-session-role></span> でログイン中です。データはCloudflareに保存され、同じアカウントで複数端末から利用できます。</p>
        <p class="sync-state online" data-sync-state>同期済み</p>
        <button type="button" class="secondary-btn wide" data-logout>ログアウト</button>
        <button type="button" class="secondary-btn wide account-delete" data-delete-account>アカウントを削除</button>
        <p class="account-error" data-session-error role="alert"></p>
      </div>
    </form>`;
  document.body.appendChild(dialog);

  const fields = dialog.querySelector(".auth-fields");
  const session = dialog.querySelector(".account-session");
  const errorBox = dialog.querySelector(".account-error");
  const syncState = dialog.querySelector("[data-sync-state]");
  const logoutButton = dialog.querySelector("[data-logout]");
  const deleteButton = dialog.querySelector("[data-delete-account]");
  const sessionError = dialog.querySelector("[data-session-error]");
  const adminMenuButton = document.querySelector("[data-admin-menu-open]");
  const settingsMain = document.querySelector("[data-settings-main]");
  const adminPage = document.querySelector("[data-admin-page]");
  const adminUsers = adminPage.querySelector("[data-admin-users]");
  const adminUserCount = adminPage.querySelector("[data-admin-user-count]");
  const adminError = adminPage.querySelector("[data-admin-error]");

  function isAdmin() {
    return user?.role === "admin";
  }

  function setLoginPreview(active) {
    document.body.dataset.loginPreview = active && isAdmin() ? "true" : "false";
  }

  function accountDate(timestamp) {
    if (!timestamp) return "登録日不明";
    return new Date(timestamp * 1000).toLocaleDateString("ja-JP", { year:"numeric", month:"short", day:"numeric" });
  }

  function renderAdminUsers(accounts) {
    adminUsers.replaceChildren();
    adminUserCount.textContent = `${accounts.length}件`;
    for (const account of accounts) {
      const row = document.createElement("div");
      row.className = "admin-user-row";
      const avatar = document.createElement("span");
      avatar.className = "admin-user-avatar";
      avatar.textContent = String(account.username || "?").slice(0, 1).toUpperCase();
      const identity = document.createElement("span");
      identity.className = "admin-user-identity";
      const name = document.createElement("b");
      name.textContent = account.username || "名称未設定";
      const detail = document.createElement("small");
      const sessions = Number(account.activeSessions) || 0;
      detail.textContent = `${accountDate(account.createdAt)}・${sessions ? `ログイン中 ${sessions}件` : "ログイン中の端末なし"}`;
      identity.append(name, detail);
      const role = document.createElement("em");
      role.className = `admin-role ${account.role === "admin" ? "is-admin" : ""}`;
      role.textContent = account.role === "admin" ? "管理者" : "一般";
      row.append(avatar, identity, role);
      adminUsers.appendChild(row);
    }
    if (!accounts.length) {
      const empty = document.createElement("p");
      empty.className = "admin-loading";
      empty.textContent = "登録アカウントはありません";
      adminUsers.appendChild(empty);
    }
  }

  async function loadAdminUsers() {
    if (!isAdmin()) return;
    adminError.textContent = "";
    adminUserCount.textContent = "";
    adminUsers.innerHTML = '<p class="admin-loading">読み込み中…</p>';
    const currentAccount = [{ id:user.id, username:user.username, role:"admin", createdAt:null, activeSessions:1 }];
    if (user.id === "local-device") {
      renderAdminUsers(currentAccount);
      return;
    }
    try {
      const result = await request("/api/admin/users");
      if (isAdmin()) renderAdminUsers(Array.isArray(result.users) ? result.users : []);
    } catch (error) {
      renderAdminUsers(currentAccount);
      adminError.textContent = "一覧を取得できないため、現在のアカウントのみ表示しています。";
    }
  }

  function openAdminMenu() {
    if (!isAdmin()) return;
    settingsMain.hidden = true;
    adminPage.hidden = false;
    loadAdminUsers();
  }

  function closeAdminMenu() {
    adminPage.hidden = true;
    settingsMain.hidden = false;
  }

  function snapshot() {
    return {
      version: 1,
      finance: window.ExpenceFinanceStore?.snapshot() || null,
      workspace: window.ExpenceWorkspaceStore?.snapshot() || null,
      salary: window.ExpenceSalaryStore?.snapshot() || null,
      academic: window.ExpenceAcademicStore?.snapshot() || null
    };
  }

  function restore(data) {
    if (!data || typeof data !== "object") return;
    if (data.finance) window.ExpenceFinanceStore?.restore(data.finance);
    if (data.workspace) window.ExpenceWorkspaceStore?.restore(data.workspace);
    if (data.salary) window.ExpenceSalaryStore?.restore(data.salary);
    if (data.academic) window.ExpenceAcademicStore?.restore(data.academic);
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
    document.body.dataset.authenticated = user ? "true" : "false";
    if (adminMenuButton) adminMenuButton.hidden = !isAdmin();
    if (!isAdmin()) setLoginPreview(false);
    if (!isAdmin()) closeAdminMenu();
    if (user) {
      dialog.querySelector("[data-session-name]").textContent = user.username;
      dialog.querySelector("[data-session-role]").textContent = user.role === "admin" ? "管理者" : "";
      logoutButton.hidden = false;
      deleteButton.hidden = false;
      sessionError.textContent = "";
    }
  }

  function notifyAccount() {
    updateAccountUi();
    document.dispatchEvent(new CustomEvent("expence-account-change", { detail:{ user:user ? { ...user } : null } }));
  }

  function openAccount(message = "") {
    errorBox.textContent = message;
    updateAccountUi();
    if (!dialog.open) dialog.showModal();
  }

  function openAuthAction(action) {
    openAccount();
    const preferred = dialog.querySelector(`[data-auth-action="${action}"]`);
    const alternate = dialog.querySelector(`[data-auth-action="${action === "login" ? "register" : "login"}"]`);
    preferred?.classList.add("primary-btn");
    preferred?.classList.remove("secondary-btn");
    alternate?.classList.add("secondary-btn");
    alternate?.classList.remove("primary-btn");
    dialog.querySelector('input[name="username"]')?.focus();
  }

  window.ExpenceAccount = {
    isAuthenticated: () => Boolean(user),
    current: () => user ? { ...user } : null,
    open: openAccount,
    require: () => {
      if (user) return true;
      openAccount("ホーム以外を利用するには、ログインまたは新規登録が必要です。");
      return false;
    }
  };

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
    notifyAccount();
    const remote = await request("/api/data");
    if (remote.data) restore(remote.data); else await push();
    setSyncState("同期済み");
    setLoginPreview(false);
    dialog.close();
  }

  document.addEventListener("click", event => {
    if (event.target.closest("[data-account-open]")) openAccount();
    if (event.target.closest("[data-account-close]")) dialog.close();
    if (event.target.closest("[data-auth-gate-register]")) openAuthAction("register");
    if (event.target.closest("[data-auth-gate-login]")) openAuthAction("login");
    if (event.target.closest("[data-admin-menu-open]")) openAdminMenu();
    if (event.target.closest("[data-admin-close]")) closeAdminMenu();
    if (event.target.closest("[data-admin-users-refresh]") && isAdmin()) loadAdminUsers();
    if (event.target.closest("[data-admin-login-preview]") && isAdmin()) setLoginPreview(true);
    if (event.target.closest("[data-login-preview-back]") && isAdmin()) setLoginPreview(false);
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
    if (user?.id !== "local-device") try { await request("/api/auth", { method: "POST", body: JSON.stringify({ action: "logout" }) }); } catch {}
    user = null; hydrated = false;
    window.ExpenceFinanceStore?.reset(); window.ExpenceWorkspaceStore?.reset(); window.ExpenceSalaryStore?.reset(); window.ExpenceAcademicStore?.reset();
    notifyAccount(); window.appNav?.("dashboard"); dialog.close();
  });

  dialog.querySelector("[data-delete-account]").addEventListener("click", async () => {
    if (!user) return;
    const isLocal = user.id === "local-device";
    const target = isLocal ? "Local端末のアカウントと端末内の保存データ" : `アカウント「${user.username}」とCloudflare上の保存データ`;
    if (!confirm(`${target}を削除しますか？\nこの操作は取り消せません。`)) return;
    deleteButton.disabled = true; sessionError.textContent = "";
    try {
      if (!isLocal) await request("/api/auth", { method:"POST", body:JSON.stringify({ action:"delete" }) });
      user = null; hydrated = false;
      window.ExpenceFinanceStore?.reset(); window.ExpenceWorkspaceStore?.reset(); window.ExpenceSalaryStore?.reset(); window.ExpenceAcademicStore?.reset();
      notifyAccount(); window.appNav?.("dashboard"); dialog.close();
    } catch (error) {
      sessionError.textContent = `エラー：${error.message}`;
    } finally {
      deleteButton.disabled = false;
    }
  });

  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && user && hydrated) pull().catch(() => {}); });

  window.CloudSync = { schedule, pull };
  updateAccountUi();
  request("/api/auth").then(result => {
    user = result.user || null; document.body.dataset.authReady = "true"; notifyAccount();
    if (user) { hydrated = true; return pull(); }
  }).catch(() => { user = null; document.body.dataset.authReady = "true"; notifyAccount(); });
})();
