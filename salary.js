(() => {
  const KEY = "expence-tracker-salary-v1";
  const today = new Date().toLocaleDateString("sv-SE");
  const emptyState = () => ({
    month: today.slice(0, 7),
    rules: [{ id: Date.now(), name: "通常", start: "00:00", end: "00:00", rate: 0 }],
    shifts: []
  });
  let salaryState = load();
  let payslips = [];

  function load() {
    try { return { ...emptyState(), ...(JSON.parse(localStorage.getItem(KEY)) || {}) }; }
    catch { return emptyState(); }
  }
  function save(skipSync = false) {
    localStorage.setItem(KEY, JSON.stringify(salaryState));
    if (!skipSync) window.CloudSync?.schedule();
  }
  const money = value => `${Math.round(Number(value) || 0).toLocaleString("ja-JP")}円`;
  const escapeHtml = value => String(value ?? "").replace(/[&<>\"]/g, character => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[character]));
  const minutes = value => { const [hour, minute] = String(value || "00:00").split(":").map(Number); return hour * 60 + minute; };
  function ruleMatches(rule, minute) {
    const start = minutes(rule.start), end = minutes(rule.end);
    if (start === end) return true;
    return end > start ? minute >= start && minute < end : minute >= start || minute < end;
  }
  function rateAt(minute) {
    let rate = 0;
    salaryState.rules.forEach(rule => { if (ruleMatches(rule, minute)) rate = Number(rule.rate) || 0; });
    return rate;
  }
  function calculateShift(shift) {
    const start = minutes(shift.start), rawEnd = minutes(shift.end), end = rawEnd <= start ? rawEnd + 1440 : rawEnd;
    const grossMinutes = Math.max(0, end - start);
    const paidMinutes = Math.max(0, grossMinutes - Math.max(0, Number(shift.breakMinutes) || 0));
    let grossWage = 0;
    for (let minute = start; minute < end; minute++) grossWage += rateAt(minute % 1440) / 60;
    const wage = grossMinutes ? grossWage * paidMinutes / grossMinutes : 0;
    return { grossMinutes, paidMinutes, hours:paidMinutes / 60, wage:Math.round(wage) };
  }
  function monthShifts() { return salaryState.shifts.filter(shift => shift.date.startsWith(salaryState.month)).sort((a,b) => a.date.localeCompare(b.date)); }
  function totals() {
    return monthShifts().reduce((result, shift) => {
      const calculated = calculateShift(shift); result.minutes += calculated.paidMinutes; result.wage += calculated.wage; return result;
    }, { minutes:0, wage:0 });
  }
  function incomeHistory() {
    return (window.ExpenceFinanceStore?.transactions() || []).filter(item => item.type === "income").sort((a,b) => b.date.localeCompare(a.date) || b.id - a.id);
  }

  const view = document.createElement("section");
  view.id = "salaryView";
  view.className = "view salary-view";
  document.querySelector(".content").appendChild(view);

  function render() {
    const total = totals();
    const shifts = monthShifts();
    const incomes = incomeHistory();
    view.innerHTML = `
      <div class="salary-heading"><div><p class="eyebrow">SALARY</p><h2>給与</h2><p>シフトと時間帯別時給から給与を自動計算</p></div><label>対象月<input type="month" data-salary-month value="${salaryState.month}"></label></div>
      <div class="salary-summary">
        <article><small>給与見込み</small><b>${money(total.wage)}</b></article>
        <article><small>勤務時間</small><b>${(total.minutes / 60).toFixed(2)}時間</b></article>
        <article><small>シフト数</small><b>${shifts.length}件</b></article>
        <article><small>登録済み収入</small><b>${money(incomes.filter(item=>item.date.startsWith(salaryState.month)).reduce((sum,item)=>sum+Number(item.amount||0),0))}</b></article>
      </div>
      <div class="salary-layout">
        <article class="panel salary-shifts">
          <div class="salary-panel-head"><div><h2>シフト・勤務時間</h2><p>日付をまたぐ勤務にも対応</p></div><button type="button" class="primary-btn" data-add-shift>＋ シフト</button></div>
          <div class="shift-list">${shifts.length ? shifts.map(shiftRow).join("") : '<p class="salary-empty">この月のシフトはありません</p>'}</div>
        </article>
        <article class="panel pay-rules">
          <div class="salary-panel-head"><div><h2>時間帯別時給</h2><p>下のルールほど優先されます</p></div><button type="button" class="secondary-btn" data-add-rule>＋ 時間帯</button></div>
          <div class="rule-list">${salaryState.rules.map(ruleRow).join("")}</div>
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
    return `<div class="shift-row" data-shift-id="${shift.id}"><input type="date" data-shift-field="date" value="${shift.date}"><label>開始<input type="time" data-shift-field="start" value="${shift.start}"></label><label>終了<input type="time" data-shift-field="end" value="${shift.end}"></label><label>休憩（分）<input type="number" min="0" step="5" data-shift-field="breakMinutes" value="${shift.breakMinutes}"></label><input type="text" data-shift-field="memo" maxlength="30" value="${escapeHtml(shift.memo)}" placeholder="メモ"><span class="shift-result"><b>${calculated.hours.toFixed(2)}h</b><strong>${money(calculated.wage)}</strong></span><button type="button" class="row-delete" data-delete-shift aria-label="シフトを削除">×</button></div>`;
  }
  function ruleRow(rule) {
    return `<div class="rule-row" data-rule-id="${rule.id}"><input type="text" data-rule-field="name" maxlength="20" value="${escapeHtml(rule.name)}" placeholder="通常・深夜など"><input type="time" data-rule-field="start" value="${rule.start}"><span>〜</span><input type="time" data-rule-field="end" value="${rule.end}"><label><input type="number" min="0" step="1" data-rule-field="rate" value="${rule.rate}"> 円/時</label><button type="button" class="row-delete" data-delete-rule aria-label="時間帯を削除">×</button></div>`;
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
    if (event.target.closest("[data-add-shift]")) { salaryState.shifts.push({ id:Date.now(), date:`${salaryState.month}-01`, start:"09:00", end:"17:00", breakMinutes:60, memo:"" }); persistAndRender(); }
    if (event.target.closest("[data-add-rule]")) { salaryState.rules.push({ id:Date.now(), name:"時間帯", start:"22:00", end:"05:00", rate:0 }); persistAndRender(); }
    const shiftDelete = event.target.closest("[data-delete-shift]");
    if (shiftDelete) { const id=Number(shiftDelete.closest("[data-shift-id]").dataset.shiftId); salaryState.shifts=salaryState.shifts.filter(item=>item.id!==id); persistAndRender(); }
    const ruleDelete = event.target.closest("[data-delete-rule]");
    if (ruleDelete && salaryState.rules.length > 1) { const id=Number(ruleDelete.closest("[data-rule-id]").dataset.ruleId); salaryState.rules=salaryState.rules.filter(item=>item.id!==id); persistAndRender(); }
    if (event.target.closest("[data-open-income]")) { document.querySelector('[data-view="finances"]')?.click(); setFinanceTab("transactions"); openModal(); document.querySelector('input[name="type"][value="income"]').checked=true; options(); }
    if (event.target.closest("[data-upload-payslip]")) uploadPayslip().catch(()=>{ const note=view.querySelector("[data-payslip-note]"); if(note)note.textContent="アップロードできませんでした"; });
    const payslipDelete = event.target.closest("[data-delete-payslip]");
    if (payslipDelete && confirm("この給与明細を削除しますか？")) fetch(`/api/files/${encodeURIComponent(payslipDelete.dataset.deletePayslip)}`, { method:"DELETE", credentials:"same-origin" }).then(refreshPayslips);
  });
  document.addEventListener("change", event => {
    if (event.target.matches("[data-salary-month]")) { salaryState.month=event.target.value; persistAndRender(); return; }
    const shiftRowElement = event.target.closest("[data-shift-id]");
    if (shiftRowElement && event.target.dataset.shiftField) { const shift=salaryState.shifts.find(item=>item.id===Number(shiftRowElement.dataset.shiftId)); shift[event.target.dataset.shiftField]=event.target.type==="number"?Number(event.target.value):event.target.value; persistAndRender(); return; }
    const ruleRowElement = event.target.closest("[data-rule-id]");
    if (ruleRowElement && event.target.dataset.ruleField) { const rule=salaryState.rules.find(item=>item.id===Number(ruleRowElement.dataset.ruleId)); rule[event.target.dataset.ruleField]=event.target.type==="number"?Number(event.target.value):event.target.value; persistAndRender(); }
  });
  document.addEventListener("input", event => {
    const shiftRowElement = event.target.closest("[data-shift-id]");
    if (shiftRowElement && event.target.dataset.shiftField) {
      const shift = salaryState.shifts.find(item => item.id === Number(shiftRowElement.dataset.shiftId));
      if (shift) { shift[event.target.dataset.shiftField] = event.target.type === "number" ? Number(event.target.value) : event.target.value; save(); }
    }
    const ruleRowElement = event.target.closest("[data-rule-id]");
    if (ruleRowElement && event.target.dataset.ruleField) {
      const rule = salaryState.rules.find(item => item.id === Number(ruleRowElement.dataset.ruleId));
      if (rule) { rule[event.target.dataset.ruleField] = event.target.type === "number" ? Number(event.target.value) : event.target.value; save(); }
    }
  });
  window.addEventListener("expence-finance-render", () => { if (view.classList.contains("active")) render(); });
  window.ExpenceSalaryStore = {
    snapshot: () => structuredClone(salaryState),
    restore: value => { salaryState={ ...emptyState(), ...(value || {}) }; save(true); render(); },
    reset: () => { salaryState=emptyState(); save(true); render(); }
  };
  render();
})();
