(() => {
  const KEY = "expence-tracker-salary-v1";
  const today = new Date().toLocaleDateString("sv-SE");
  const newJob = (name = "勤務先1") => ({
    id: Date.now() + Math.floor(Math.random() * 1000),
    name,
    payday: 25,
    rules: [{ id: Date.now() + Math.floor(Math.random() * 1000), name: "通常", start: "00:00", end: "00:00", rate: 0 }]
  });
  const emptyState = () => {
    const job = newJob();
    return { month: today.slice(0, 7), activeJobId: job.id, jobs: [job], shifts: [] };
  };

  function normalizeState(value) {
    const base = emptyState();
    const source = value && typeof value === "object" ? value : {};
    let jobs = Array.isArray(source.jobs) && source.jobs.length ? source.jobs : null;
    if (!jobs) {
      const job = newJob("勤務先1");
      job.rules = Array.isArray(source.rules) && source.rules.length ? source.rules : job.rules;
      jobs = [job];
    }
    jobs = jobs.map((job, index) => ({
      id: Number(job.id) || Date.now() + index,
      name: String(job.name || `勤務先${index + 1}`),
      payday: Math.min(31, Math.max(1, Number(job.payday) || 25)),
      rules: Array.isArray(job.rules) && job.rules.length ? job.rules : newJob().rules
    }));
    const activeJobId = jobs.some(job => job.id === Number(source.activeJobId)) ? Number(source.activeJobId) : jobs[0].id;
    const shifts = Array.isArray(source.shifts) ? source.shifts.map(shift => ({ ...shift, jobId: Number(shift.jobId) || jobs[0].id })) : [];
    return { ...base, ...source, jobs, shifts, activeJobId, month: source.month || base.month };
  }

  let salaryState = load();
  let payslips = [];

  function load() {
    try { return normalizeState(JSON.parse(localStorage.getItem(KEY))); }
    catch { return emptyState(); }
  }
  function save(skipSync = false) {
    localStorage.setItem(KEY, JSON.stringify(salaryState));
    if (!skipSync) window.CloudSync?.schedule();
    window.ExpenceFinanceStore?.rerender?.();
  }
  const money = value => `${Math.round(Number(value) || 0).toLocaleString("ja-JP")}円`;
  const escapeHtml = value => String(value ?? "").replace(/[&<>\"]/g, character => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[character]));
  const minutes = value => { const [hour, minute] = String(value || "00:00").split(":").map(Number); return hour * 60 + minute; };
  const activeJob = () => salaryState.jobs.find(job => job.id === salaryState.activeJobId) || salaryState.jobs[0];
  const jobFor = jobId => salaryState.jobs.find(job => job.id === Number(jobId)) || salaryState.jobs[0];

  function ruleMatches(rule, minute) {
    const start = minutes(rule.start), end = minutes(rule.end);
    if (start === end) return true;
    return end > start ? minute >= start && minute < end : minute >= start || minute < end;
  }
  function rateAt(job, minute) {
    let rate = 0;
    job.rules.forEach(rule => { if (ruleMatches(rule, minute)) rate = Number(rule.rate) || 0; });
    return rate;
  }
  function calculateShift(shift) {
    const job = jobFor(shift.jobId);
    const start = minutes(shift.start), rawEnd = minutes(shift.end), end = rawEnd <= start ? rawEnd + 1440 : rawEnd;
    const grossMinutes = Math.max(0, end - start);
    const paidMinutes = Math.max(0, grossMinutes - Math.max(0, Number(shift.breakMinutes) || 0));
    let grossWage = 0;
    for (let minute = start; minute < end; minute++) grossWage += rateAt(job, minute % 1440) / 60;
    const wage = grossMinutes ? grossWage * paidMinutes / grossMinutes : 0;
    return { grossMinutes, paidMinutes, hours:paidMinutes / 60, wage:Math.round(wage) };
  }
  function monthShifts() {
    return salaryState.shifts.filter(shift => String(shift.date).startsWith(salaryState.month)).sort((a,b) => a.date.localeCompare(b.date));
  }
  function totals(shifts = monthShifts()) {
    return shifts.reduce((result, shift) => {
      const calculated = calculateShift(shift);
      result.minutes += calculated.paidMinutes;
      result.wage += calculated.wage;
      return result;
    }, { minutes:0, wage:0 });
  }
  function incomeHistory() {
    return (window.ExpenceFinanceStore?.transactions() || []).filter(item => item.type === "income").sort((a,b) => b.date.localeCompare(a.date) || b.id - a.id);
  }
  function changeMonth(offset) {
    const [year, month] = salaryState.month.split("-").map(Number);
    const date = new Date(year, month - 1 + offset, 1);
    salaryState.month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    persistAndRender();
  }
  function paydayLabel(day) {
    const [year, month] = salaryState.month.split("-").map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    return `${year}年${month}月${Math.min(lastDay, Number(day) || 25)}日`;
  }

  const view = document.createElement("section");
  view.id = "salaryView";
  view.className = "view salary-view";
  document.querySelector(".content").appendChild(view);
  let jobDialogMode = "add";
  const jobDialog = document.createElement("dialog");
  jobDialog.id = "jobDialog";
  jobDialog.innerHTML = `<form method="dialog" data-job-form><div class="modal-head"><div><p class="eyebrow">WORKPLACE</p><h2 data-job-dialog-title>勤務先を追加</h2></div><button type="button" class="close-btn" data-job-close>×</button></div><label>勤務先名<input type="text" name="jobName" maxlength="30" required placeholder="例：カフェ"></label><button class="primary-btn wide">保存する</button></form>`;
  document.body.appendChild(jobDialog);

  function openJobDialog(mode) {
    jobDialogMode = mode;
    jobDialog.querySelector("[data-job-dialog-title]").textContent = mode === "add" ? "勤務先を追加" : "勤務先名を変更";
    jobDialog.querySelector('[name="jobName"]').value = mode === "add" ? "" : activeJob().name;
    jobDialog.showModal();
    setTimeout(() => jobDialog.querySelector('[name="jobName"]').focus(), 50);
  }

  function render() {
    const monthTotal = totals();
    const cumulative = totals(salaryState.shifts);
    const shifts = monthShifts();
    const incomes = incomeHistory();
    const currentJob = activeJob();
    view.innerHTML = `
      <div class="salary-heading">
        <div><p class="eyebrow">SALARY</p><h2>給与</h2><p>勤務先ごとのシフトと時間帯別時給から自動計算</p></div>
        <div class="salary-controls">
          <div class="month-stepper"><button type="button" data-salary-month-step="-1" aria-label="前月">‹</button><input type="month" data-salary-month value="${salaryState.month}"><button type="button" data-salary-month-step="1" aria-label="翌月">›</button></div>
          <label class="job-picker">勤務先<select data-active-job>${salaryState.jobs.map(job => `<option value="${job.id}" ${job.id === currentJob.id ? "selected" : ""}>${escapeHtml(job.name)}</option>`).join("")}</select></label>
          <label class="payday-picker">毎月の振込日<span><input type="number" min="1" max="31" data-job-payday value="${currentJob.payday}">日</span></label>
          <div class="job-actions"><button type="button" class="secondary-btn" data-add-job>＋ 勤務先</button><button type="button" class="text-btn" data-rename-job>名前変更</button>${salaryState.jobs.length > 1 ? '<button type="button" class="text-btn danger-text" data-delete-job>削除</button>' : ""}</div>
        </div>
      </div>
      <div class="salary-summary">
        <article><small>${escapeHtml(salaryState.month)} 給与見込み</small><b>${money(monthTotal.wage)}</b></article>
        <article><small>勤務時間</small><b>${(monthTotal.minutes / 60).toFixed(2)}時間</b></article>
        <article><small>累計給与</small><b>${money(cumulative.wage)}</b></article>
        <article><small>${escapeHtml(currentJob.name)}の振込予定</small><b class="payday-value">${paydayLabel(currentJob.payday)}</b></article>
        <article><small>登録済み収入</small><b>${money(incomes.filter(item=>item.date.startsWith(salaryState.month)).reduce((sum,item)=>sum+Number(item.amount||0),0))}</b></article>
      </div>
      <div class="salary-layout">
        <article class="panel salary-shifts">
          <div class="salary-panel-head"><div><h2>シフト・勤務時間</h2><p>勤務先を選び、日付をまたぐ勤務も計算できます</p></div><button type="button" class="primary-btn" data-add-shift>＋ シフト</button></div>
          <div class="shift-list">${shifts.length ? shifts.map(shiftRow).join("") : '<p class="salary-empty">この月のシフトはありません</p>'}</div>
        </article>
        <article class="panel pay-rules">
          <div class="salary-panel-head"><div><h2>${escapeHtml(currentJob.name)}の時間帯別時給</h2><p>下のルールほど優先されます</p></div><button type="button" class="secondary-btn" data-add-rule>＋ 時間帯</button></div>
          <div class="rule-list">${currentJob.rules.map(ruleRow).join("")}</div>
        </article>
        <article class="panel income-history">
          <div class="salary-panel-head"><div><h2>収入履歴</h2><p>家計タブの収入記録と連動</p></div><button type="button" class="text-btn" data-open-income>家計で追加 →</button></div>
          <div class="salary-history">${incomes.length ? incomes.slice(0,8).map(item=>`<div><span>${escapeHtml(item.date)}</span><b>${escapeHtml(item.memo || "収入")}</b><strong>${money(item.amount)}</strong></div>`).join("") : '<p class="salary-empty">収入履歴はありません</p>'}</div>
        </article>
        <article class="panel payslip-panel">
          <div class="salary-panel-head"><div><h2>給与明細PDF</h2><p>Cloudflareへ保存し、複数端末から閲覧</p></div></div>
          <div class="payslip-upload"><input type="month" data-payslip-period value="${salaryState.month}"><label class="secondary-btn">PDFを選択<input type="file" accept="application/pdf" data-payslip-file></label><button type="button" class="primary-btn" data-upload-payslip>アップロード</button></div>
          <p class="payslip-note" data-payslip-note>ログイン後に利用できます（1ファイル10MBまで）</p>
          <div class="payslip-list">${renderPayslips()}</div>
        </article>
      </div>`;
  }

  function shiftRow(shift) {
    const calculated = calculateShift(shift);
    return `<div class="shift-row" data-shift-id="${shift.id}">
      <label>勤務先<select data-shift-field="jobId">${salaryState.jobs.map(job => `<option value="${job.id}" ${job.id === Number(shift.jobId) ? "selected" : ""}>${escapeHtml(job.name)}</option>`).join("")}</select></label>
      <label>日付<input type="date" data-shift-field="date" value="${shift.date}"></label>
      <label>開始<input type="time" data-shift-field="start" value="${shift.start}"></label>
      <label>終了<input type="time" data-shift-field="end" value="${shift.end}"></label>
      <label>休憩（分）<input type="number" min="0" step="5" data-shift-field="breakMinutes" value="${shift.breakMinutes}"></label>
      <label class="shift-memo">メモ<input type="text" data-shift-field="memo" maxlength="30" value="${escapeHtml(shift.memo)}" placeholder="担当・交通費など"></label>
      <span class="shift-result"><b>${calculated.hours.toFixed(2)}h</b><strong>${money(calculated.wage)}</strong></span>
      <button type="button" class="row-delete" data-delete-shift aria-label="シフトを削除">×</button>
    </div>`;
  }
  function ruleRow(rule) {
    return `<div class="rule-row" data-rule-id="${rule.id}"><input class="rule-name" type="text" data-rule-field="name" maxlength="20" value="${escapeHtml(rule.name)}" placeholder="通常・深夜など"><input type="time" data-rule-field="start" value="${rule.start}"><span>〜</span><input type="time" data-rule-field="end" value="${rule.end}"><label class="rule-rate"><input type="number" min="0" step="1" data-rule-field="rate" value="${rule.rate}"><span>円/時</span></label><button type="button" class="row-delete" data-delete-rule aria-label="時間帯を削除">×</button></div>`;
  }
  function renderPayslips() {
    if (!payslips.length) return '<p class="salary-empty">保存された明細はありません</p>';
    return payslips.map(file => `<div class="payslip-row"><span>${escapeHtml(file.period || "----年--月")}</span><b>${escapeHtml(file.name)}</b><a href="/api/files/${encodeURIComponent(file.id)}" target="_blank" rel="noopener">表示</a><button type="button" data-delete-payslip="${escapeHtml(file.id)}">削除</button></div>`).join("");
  }
  function persistAndRender() { save(); render(); }
  async function refreshPayslips() {
    try {
      const response = await fetch("/api/files", { credentials:"same-origin" });
      if (!response.ok) { payslips = []; return; }
      const result = await response.json(); payslips = result.files || [];
    } catch { payslips = []; }
    if (view.classList.contains("active")) render();
  }
  async function uploadPayslip() {
    const input = view.querySelector("[data-payslip-file]"), file = input?.files?.[0];
    const note = view.querySelector("[data-payslip-note]");
    if (!file) { note.textContent = "PDFを選択してください"; return; }
    if (file.type !== "application/pdf") { note.textContent = "PDFファイルだけ保存できます"; return; }
    if (file.size > 10 * 1024 * 1024) { note.textContent = "10MB以下のPDFを選択してください"; return; }
    note.textContent = "アップロード中…";
    const id = crypto.randomUUID(), period = view.querySelector("[data-payslip-period]").value;
    const response = await fetch(`/api/files/${id}?name=${encodeURIComponent(file.name)}&period=${encodeURIComponent(period)}`, { method:"PUT", credentials:"same-origin", headers:{ "Content-Type":"application/pdf" }, body:file });
    const result = await response.json().catch(()=>({}));
    if (!response.ok) { note.textContent = result.error || "アップロードできませんでした"; return; }
    note.textContent = "保存しました"; await refreshPayslips();
  }

  document.addEventListener("click", event => {
    if (event.target.closest('[data-view="salary"]')) { render(); refreshPayslips(); }
    const monthStep = event.target.closest("[data-salary-month-step]");
    if (monthStep) changeMonth(Number(monthStep.dataset.salaryMonthStep));
    if (event.target.closest("[data-add-shift]")) { salaryState.shifts.push({ id:Date.now(), jobId:activeJob().id, date:`${salaryState.month}-01`, start:"09:00", end:"17:00", breakMinutes:60, memo:"" }); persistAndRender(); }
    if (event.target.closest("[data-add-rule]")) { activeJob().rules.push({ id:Date.now(), name:"時間帯", start:"22:00", end:"05:00", rate:0 }); persistAndRender(); }
    if (event.target.closest("[data-add-job]")) openJobDialog("add");
    if (event.target.closest("[data-rename-job]")) openJobDialog("rename");
    if (event.target.closest("[data-job-close]")) jobDialog.close();
    if (event.target.closest("[data-delete-job]") && salaryState.jobs.length > 1) {
      const removed = activeJob();
      if (confirm(`${removed.name}を削除しますか？\n登録済みシフトは別の勤務先へ移動します。`)) {
        const fallback = salaryState.jobs.find(job => job.id !== removed.id);
        salaryState.shifts.forEach(shift => { if (Number(shift.jobId) === removed.id) shift.jobId = fallback.id; });
        salaryState.jobs = salaryState.jobs.filter(job => job.id !== removed.id);
        salaryState.activeJobId = fallback.id;
        persistAndRender();
      }
    }
    const shiftDelete = event.target.closest("[data-delete-shift]");
    if (shiftDelete) { const id=Number(shiftDelete.closest("[data-shift-id]").dataset.shiftId); salaryState.shifts=salaryState.shifts.filter(item=>item.id!==id); persistAndRender(); }
    const ruleDelete = event.target.closest("[data-delete-rule]");
    if (ruleDelete && activeJob().rules.length > 1) { const id=Number(ruleDelete.closest("[data-rule-id]").dataset.ruleId); activeJob().rules=activeJob().rules.filter(item=>item.id!==id); persistAndRender(); }
    if (event.target.closest("[data-open-income]")) { document.querySelector('[data-view="finances"]')?.click(); setFinanceTab("transactions"); openModal(); document.querySelector('input[name="type"][value="income"]').checked=true; options(); }
    if (event.target.closest("[data-upload-payslip]")) uploadPayslip().catch(()=>{ const note=view.querySelector("[data-payslip-note]"); if(note)note.textContent="アップロードできませんでした"; });
    const payslipDelete = event.target.closest("[data-delete-payslip]");
    if (payslipDelete && confirm("この給与明細を削除しますか？")) fetch(`/api/files/${encodeURIComponent(payslipDelete.dataset.deletePayslip)}`, { method:"DELETE", credentials:"same-origin" }).then(refreshPayslips);
  });
  document.addEventListener("change", event => {
    if (event.target.matches("[data-salary-month]")) { salaryState.month=event.target.value; persistAndRender(); return; }
    if (event.target.matches("[data-active-job]")) { salaryState.activeJobId=Number(event.target.value); persistAndRender(); return; }
    if (event.target.matches("[data-job-payday]")) { activeJob().payday=Math.min(31,Math.max(1,Number(event.target.value)||1)); persistAndRender(); return; }
    const shiftRowElement = event.target.closest("[data-shift-id]");
    if (shiftRowElement && event.target.dataset.shiftField) {
      const shift=salaryState.shifts.find(item=>item.id===Number(shiftRowElement.dataset.shiftId));
      const numeric = event.target.type === "number" || event.target.dataset.shiftField === "jobId";
      shift[event.target.dataset.shiftField]=numeric?Number(event.target.value):event.target.value;
      persistAndRender(); return;
    }
    const ruleRowElement = event.target.closest("[data-rule-id]");
    if (ruleRowElement && event.target.dataset.ruleField) { const rule=activeJob().rules.find(item=>item.id===Number(ruleRowElement.dataset.ruleId)); rule[event.target.dataset.ruleField]=event.target.type==="number"?Number(event.target.value):event.target.value; persistAndRender(); }
  });
  document.addEventListener("input", event => {
    const shiftRowElement = event.target.closest("[data-shift-id]");
    if (shiftRowElement && event.target.dataset.shiftField) {
      const shift = salaryState.shifts.find(item => item.id === Number(shiftRowElement.dataset.shiftId));
      if (shift) { shift[event.target.dataset.shiftField] = event.target.type === "number" ? Number(event.target.value) : event.target.value; save(); }
    }
    const ruleRowElement = event.target.closest("[data-rule-id]");
    if (ruleRowElement && event.target.dataset.ruleField) {
      const rule = activeJob().rules.find(item => item.id === Number(ruleRowElement.dataset.ruleId));
      if (rule) { rule[event.target.dataset.ruleField] = event.target.type === "number" ? Number(event.target.value) : event.target.value; save(); }
    }
  });
  jobDialog.querySelector("[data-job-form]").addEventListener("submit", event => {
    event.preventDefault();
    const name = new FormData(event.target).get("jobName")?.trim();
    if (!name) return;
    if (jobDialogMode === "add") { const job = newJob(name); salaryState.jobs.push(job); salaryState.activeJobId = job.id; }
    else activeJob().name = name;
    jobDialog.close(); persistAndRender();
  });
  window.addEventListener("expence-finance-render", () => { if (view.classList.contains("active")) render(); });
  window.ExpenceSalaryStore = {
    snapshot: () => structuredClone(salaryState),
    restore: value => { salaryState=normalizeState(value); save(true); render(); },
    reset: () => { salaryState=emptyState(); save(true); render(); }
  };
  localStorage.setItem(KEY, JSON.stringify(salaryState));
  render();
  window.ExpenceFinanceStore?.rerender?.();
})();
