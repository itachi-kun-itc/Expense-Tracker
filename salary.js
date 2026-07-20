(() => {
  const KEY = "expence-tracker-salary-v1";
  const today = new Date().toLocaleDateString("sv-SE");
  const defaultRule = () => ({ id: Date.now() + Math.floor(Math.random() * 1000), name: "", start: "", end: "", rate: "" });
  const cloneRules = rules => rules.map(rule => ({ ...rule }));
  const defaultBreak = (start = "", end = "") => ({ id:Date.now() + Math.floor(Math.random() * 1000), start, end });
  function normalizeTime(value, fallback = "00:00") {
    const text = String(value || "").trim();
    let hour, minute;
    if (/^\d{1,2}:\d{1,2}$/.test(text)) [hour, minute] = text.split(":").map(Number);
    else {
      const digits = text.replace(/\D/g, "").slice(0, 4);
      if (!digits) return fallback;
      if (digits.length <= 2) { hour = Number(digits); minute = 0; }
      else { hour = Number(digits.slice(0, -2)); minute = Number(digits.slice(-2)); }
    }
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return fallback;
    return `${String(Math.min(23, Math.max(0, hour))).padStart(2, "0")}:${String(Math.min(59, Math.max(0, minute))).padStart(2, "0")}`;
  }
  function timeAfter(start, duration) {
    const total = (minutes(start) + Math.max(0, Number(duration) || 0)) % 1440;
    return `${String(Math.floor(total / 60)).padStart(2,"0")}:${String(total % 60).padStart(2,"0")}`;
  }
  const newJob = (name = "勤務先1") => {
    const rules = [defaultRule()];
    return {
      id: Date.now() + Math.floor(Math.random() * 1000),
      name,
      payday: "",
      closingDay: "",
      status: "active",
      payType: "hourly",
      sessionRate: "",
      rules,
      rulesByMonth: { [today.slice(0, 7)]: cloneRules(rules) }
    };
  };
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
    jobs = jobs.map((job, index) => {
      const rules = Array.isArray(job.rules) && job.rules.length ? job.rules.map(rule => ({ ...defaultRule(), ...rule })) : [defaultRule()];
      const rulesByMonth = {};
      if (job.rulesByMonth && typeof job.rulesByMonth === "object") {
        Object.entries(job.rulesByMonth).forEach(([month, monthRules]) => {
          if (/^\d{4}-\d{2}$/.test(month) && Array.isArray(monthRules) && monthRules.length) rulesByMonth[month] = monthRules.map(rule => ({ ...defaultRule(), ...rule }));
        });
      }
      if (!Object.keys(rulesByMonth).length) rulesByMonth[source.month || base.month] = cloneRules(rules);
      return {
        id: Number(job.id) || Date.now() + index,
        name: String(job.name || `勤務先${index + 1}`),
        payday: job.payday === "" ? "" : Math.min(31, Math.max(1, Number(job.payday) || 25)),
        closingDay: job.closingDay === "" ? "" : Math.min(31, Math.max(1, Number(job.closingDay) || 20)),
        status: job.status === "retired" ? "retired" : "active",
        payType: job.payType === "session" ? "session" : "hourly",
        sessionRate: job.sessionRate === "" ? "" : Math.max(0, Number(job.sessionRate) || 0),
        rules,
        rulesByMonth
      };
    });
    const activeJobId = jobs.some(job => job.id === Number(source.activeJobId)) ? Number(source.activeJobId) : jobs[0].id;
    const shifts = Array.isArray(source.shifts) ? source.shifts.map(shift => {
      const dates = [...new Set((Array.isArray(shift.dates) ? shift.dates : [shift.date]).filter(date => /^\d{4}-\d{2}-\d{2}$/.test(String(date))))].sort();
      const breaks = Array.isArray(shift.breaks)
        ? shift.breaks.map(item => ({ id:Number(item.id) || Date.now() + Math.random(), start:item.start === "" ? "" : normalizeTime(item.start,""), end:item.end === "" ? "" : normalizeTime(item.end,"") }))
        : Number(shift.breakMinutes) > 0 ? [defaultBreak("12:00",timeAfter("12:00",shift.breakMinutes))] : [];
      return { ...shift, jobId: Number(shift.jobId) || jobs[0].id, dates, start:shift.start === "" ? "" : normalizeTime(shift.start,""), end:shift.end === "" ? "" : normalizeTime(shift.end,""), breaks, sessions:shift.sessions === "" ? "" : Math.max(1,Number(shift.sessions)||1) };
    }) : [];
    return { ...base, ...source, jobs, shifts, activeJobId, month: source.month || base.month };
  }

  let salaryState = load();
  let payslips = [];

  function load() {
    try { return normalizeState(JSON.parse(localStorage.getItem(KEY))); }
    catch { return emptyState(); }
  }
  function save(skipSync = false, updateFinance = true) {
    localStorage.setItem(KEY, JSON.stringify(salaryState));
    if (!skipSync) window.CloudSync?.schedule();
    if (updateFinance) window.ExpenceFinanceStore?.rerender?.();
  }
  const money = value => `${Math.round(Number(value) || 0).toLocaleString("ja-JP")}円`;
  const escapeHtml = value => String(value ?? "").replace(/[&<>\"]/g, character => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[character]));
  function minutes(value) { const [hour, minute] = String(value || "00:00").split(":").map(Number); return hour * 60 + minute; }
  const activeJob = () => salaryState.jobs.find(job => job.id === salaryState.activeJobId) || salaryState.jobs[0];
  const jobFor = jobId => salaryState.jobs.find(job => job.id === Number(jobId)) || salaryState.jobs[0];
  function rulesFor(job, month, create = false) {
    job.rulesByMonth ||= {};
    if (job.rulesByMonth[month]?.length) return job.rulesByMonth[month];
    const previous = Object.keys(job.rulesByMonth).filter(key => key <= month).sort().at(-1);
    const fallback = previous ? job.rulesByMonth[previous] : (job.rules || [defaultRule()]);
    if (!create) return fallback;
    job.rulesByMonth[month] = cloneRules(fallback);
    return job.rulesByMonth[month];
  }
  const shiftDates = shift => Array.isArray(shift.dates) && shift.dates.length ? shift.dates : [shift.date].filter(Boolean);
  const isoDate = date => date.toLocaleDateString("sv-SE");
  function dateInMonth(year, monthIndex, day) {
    const lastDay = new Date(year, monthIndex + 1, 0).getDate();
    return new Date(year, monthIndex, Math.min(lastDay, Math.max(1, Number(day) || 1)), 12);
  }
  function payCycle(job, paymentMonth = salaryState.month) {
    const [year, month] = paymentMonth.split("-").map(Number);
    const configured = Number(job.payday) > 0 && Number(job.closingDay) > 0;
    const payday = Number(job.payday) || 25, closingDay = Number(job.closingDay) || 20;
    const payment = dateInMonth(year, month - 1, payday);
    let end = dateInMonth(year, month - 1, closingDay);
    if (end >= payment) end = dateInMonth(year, month - 2, closingDay);
    const previousEnd = dateInMonth(end.getFullYear(), end.getMonth() - 1, closingDay);
    const start = new Date(previousEnd); start.setDate(start.getDate() + 1);
    return { start:isoDate(start), end:isoDate(end), payment:isoDate(payment), ruleMonth:paymentMonth, configured };
  }
  function cycleDates(cycle) {
    const dates = [], cursor = new Date(`${cycle.start}T12:00:00`), end = new Date(`${cycle.end}T12:00:00`);
    while (cursor <= end) { dates.push(isoDate(cursor)); cursor.setDate(cursor.getDate() + 1); }
    return dates;
  }
  const inCycle = (date, cycle) => date >= cycle.start && date <= cycle.end;

  function ruleMatches(rule, minute) {
    const start = minutes(rule.start), end = minutes(rule.end);
    if (start === end) return true;
    return end > start ? minute >= start && minute < end : minute >= start || minute < end;
  }
  function rateAt(job, minute, month) {
    let rate = 0;
    rulesFor(job, month).forEach(rule => { if (ruleMatches(rule, minute)) rate = Number(rule.rate) || 0; });
    return rate;
  }
  function calculateShift(shift, target = null) {
    const job = jobFor(shift.jobId);
    const start = minutes(shift.start), rawEnd = minutes(shift.end), overnight = rawEnd <= start, end = overnight ? rawEnd + 1440 : rawEnd;
    const grossMinutes = Math.max(0, end - start);
    const breakRanges = (shift.breaks || []).map(item => {
      let breakStart = minutes(item.start), breakEnd = minutes(item.end);
      if (breakStart === breakEnd) return { start:0, end:0 };
      if (overnight && breakStart < start) breakStart += 1440;
      if (breakEnd <= breakStart) breakEnd += 1440;
      return { start:Math.max(start,breakStart), end:Math.min(end,breakEnd) };
    }).filter(item => item.end > item.start);
    const dates = shiftDates(shift).filter(date => !target || (typeof target === "string" ? date.startsWith(target) : inCycle(date, target)));
    let wage = 0, paidMinutes = 0;
    dates.forEach(date => {
      for (let minute = start; minute < end; minute++) {
        if (breakRanges.some(item => minute >= item.start && minute < item.end)) continue;
        paidMinutes += 1;
        wage += rateAt(job, minute % 1440, target?.ruleMonth || date.slice(0, 7)) / 60;
      }
    });
    const totalGrossMinutes = grossMinutes * dates.length;
    const sessionCount = Math.max(0,Number(shift.sessions)||0);
    if (job.payType === "session") wage = dates.length * sessionCount * Math.max(0,Number(job.sessionRate)||0);
    return { grossMinutes:totalGrossMinutes, paidMinutes, breakMinutes:Math.max(0,totalGrossMinutes-paidMinutes), hours:paidMinutes / 60, wage:Math.round(wage), days:dates.length, sessions:dates.length*sessionCount, payType:job.payType };
  }
  function monthShifts(job = activeJob(), cycle = payCycle(job)) {
    const firstDate = shift => shiftDates(shift).find(date => inCycle(date, cycle)) || "9999-99-99";
    return salaryState.shifts.filter(shift => Number(shift.jobId) === job.id && shiftDates(shift).some(date => inCycle(date, cycle))).sort((a,b) => firstDate(a).localeCompare(firstDate(b)));
  }
  function totals(shifts = monthShifts(), target = payCycle(activeJob())) {
    return shifts.reduce((result, shift) => {
      const calculated = calculateShift(shift, target);
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
  const dateLabel = date => new Intl.DateTimeFormat("ja-JP", { year:"numeric", month:"numeric", day:"numeric" }).format(new Date(`${date}T12:00:00`));

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
    rulesFor(activeJob(), salaryState.month, true);
    const currentJob = activeJob();
    const cycle = payCycle(currentJob);
    const monthTotal = totals(monthShifts(currentJob, cycle), cycle);
    const cumulative = totals(salaryState.shifts, null);
    const shifts = monthShifts(currentJob, cycle);
    const incomes = incomeHistory();
    const salarySourceId = `salary:${currentJob.id}:${cycle.payment}`;
    const registeredIncome = incomes.find(item => item.sourceId === salarySourceId);
    const currentRules = rulesFor(currentJob, salaryState.month, true);
    const paySettings = currentJob.payType === "session"
      ? `<div class="salary-panel-head"><div><h2>${escapeHtml(currentJob.name)}の1コマ単価</h2><p>勤務日ごとのコマ数 × 1コマ単価で計算</p></div></div><label class="session-rate-editor"><input type="number" min="0" step="1" data-job-session-rate value="${currentJob.sessionRate}" placeholder="例：1,500"><span>円/コマ</span></label>`
      : `<div class="salary-panel-head"><div><h2>${escapeHtml(currentJob.name)}の時間帯別時給</h2><p>${escapeHtml(salaryState.month)}ごとに保存・下のルールほど優先</p></div><button type="button" class="secondary-btn" data-add-rule>＋ 時間帯</button></div><div class="rule-list">${currentRules.map(ruleRow).join("")}</div>`;
    view.innerHTML = `
      <div class="salary-workplace-bar">
        <div class="job-tabs" role="tablist" aria-label="勤務先">${salaryState.jobs.map(job => `<button type="button" role="tab" data-job-tab="${job.id}" aria-selected="${job.id === currentJob.id}" class="${job.id === currentJob.id ? "active" : ""}">${escapeHtml(job.name)}${job.status === "retired" ? "<small>退職済み</small>" : ""}</button>`).join("")}</div>
        <div class="salary-workplace-actions"><div class="employment-switch" aria-label="勤務状態"><button type="button" data-job-status="active" class="${currentJob.status === "active" ? "active" : ""}">勤務中</button><button type="button" data-job-status="retired" class="${currentJob.status === "retired" ? "active" : ""}">退職済み</button></div><div class="job-actions"><button type="button" class="secondary-btn" data-add-job>＋ 勤務先</button><button type="button" class="text-btn" data-rename-job>名称変更</button>${salaryState.jobs.length > 1 ? '<button type="button" class="text-btn danger-text" data-delete-job>削除</button>' : ""}</div></div>
      </div>
      <div class="salary-heading">
        <div><p class="eyebrow">SALARY</p><h2>給与</h2><p>勤務先ごとに時給制・1コマ制を選んで自動計算</p></div>
        <div class="salary-controls">
          <label class="salary-month-picker">振込月<div class="month-stepper"><button type="button" data-salary-month-step="-1" aria-label="前月">‹</button><input type="month" data-salary-month value="${salaryState.month}"><button type="button" data-salary-month-step="1" aria-label="翌月">›</button></div></label>
          <label class="closing-day-picker">締め日<span><input type="number" min="1" max="31" data-job-closing-day value="${currentJob.closingDay}" placeholder="例：20">日</span></label>
          <label class="payday-picker">毎月の振込日<span><input type="number" min="1" max="31" data-job-payday value="${currentJob.payday}" placeholder="例：5">日</span></label>
          <label class="pay-type-picker">給与制度<select data-job-pay-type><option value="hourly" ${currentJob.payType === "hourly" ? "selected" : ""}>時給制</option><option value="session" ${currentJob.payType === "session" ? "selected" : ""}>1コマ制</option></select></label>
        </div>
      </div>
      <div class="salary-summary">
        <article class="salary-period-card"><small>${escapeHtml(salaryState.month)} 振込分の対象期間</small>${cycle.configured ? `<b>${dateLabel(cycle.start)}〜<br>${dateLabel(cycle.end)}</b><span>${currentJob.closingDay}日締め</span>` : "<b>締め日と振込日を<br>設定してください</b>"}</article>
        <article><small>給与見込み</small><b data-month-wage>${money(monthTotal.wage)}</b></article>
        <article><small>勤務時間</small><b data-month-hours>${(monthTotal.minutes / 60).toFixed(2)}時間</b></article>
        <article><small>累計給与</small><b data-cumulative-wage>${money(cumulative.wage)}</b></article>
        <article class="salary-register-card"><small>${escapeHtml(currentJob.name)}の振込予定</small><b class="payday-value">${cycle.configured ? dateLabel(cycle.payment) : "未設定"}</b><button type="button" class="${registeredIncome ? "secondary-btn" : "primary-btn"}" data-register-salary data-salary-source="${salarySourceId}" ${!cycle.configured || monthTotal.wage <= 0 ? "disabled" : ""}>${registeredIncome ? "登録内容を更新" : "給与を家計に登録"}</button></article>
        <article><small>登録済み収入</small><b>${money(incomes.filter(item=>item.date.startsWith(salaryState.month)).reduce((sum,item)=>sum+Number(item.amount||0),0))}</b></article>
      </div>
      <div class="salary-layout">
        <article class="panel salary-shifts">
          <div class="salary-panel-head"><div><h2>シフト・勤務時間</h2>${cycle.configured ? `<p>${dateLabel(cycle.start)}〜${dateLabel(cycle.end)}から勤務日を選択。時刻は時計から設定できます</p>` : ""}</div><button type="button" class="primary-btn" data-add-shift ${cycle.configured ? "" : "disabled"}>＋ シフト</button></div>
          <div class="shift-list">${shifts.length ? shifts.map(shiftRow).join("") : '<p class="salary-empty">この振込分のシフトはありません</p>'}</div>
        </article>
        <article class="panel pay-rules">${paySettings}</article>
        <article class="panel income-history">
          <div class="salary-panel-head"><div><h2>収入履歴</h2><p>家計タブの収入記録と連動</p></div><button type="button" class="text-btn" data-open-income>家計で追加 →</button></div>
          <div class="salary-history">${incomes.length ? incomes.slice(0,8).map(item=>`<div><span>${escapeHtml(item.date)}</span><b>${escapeHtml(item.memo || "収入")}</b><strong>${money(item.amount)}</strong></div>`).join("") : '<p class="salary-empty">収入履歴はありません</p>'}</div>
        </article>
        <article class="panel payslip-panel">
          <div class="salary-panel-head"><div><h2>給与明細</h2><p>PDF・PNG・JPEGをCloudflareへ保存し、複数端末から閲覧</p></div></div>
          <div class="payslip-upload"><input type="month" data-payslip-period value="${salaryState.month}"><label class="secondary-btn">ファイルを選択<input type="file" accept="application/pdf,image/png,image/jpeg,.pdf,.png,.jpg,.jpeg" data-payslip-file></label><button type="button" class="primary-btn" data-upload-payslip>アップロード</button></div>
          <p class="payslip-note" data-payslip-note>PDF・PNG・JPEG、1ファイル10MBまで</p>
          <div class="payslip-list">${renderPayslips()}</div>
        </article>
      </div>`;
  }

  function shiftRow(shift) {
    const cycle = payCycle(jobFor(shift.jobId));
    const calculated = calculateShift(shift, cycle);
    const shiftJob = jobFor(shift.jobId);
    const dates = shiftDates(shift).filter(date => inCycle(date, cycle));
    const weekdays = ["日","月","火","水","木","金","土"];
    return `<div class="shift-row" data-shift-id="${shift.id}">
      <div class="shift-dates"><span>勤務日（${dates.length}日）</span><div class="shift-date-calendar">${cycle.configured ? cycleDates(cycle).map(date => { const selected=dates.includes(date), day=new Date(`${date}T12:00:00`);return `<button type="button" data-toggle-shift-date="${date}" class="${selected ? "selected" : ""}" ${selected && dates.length === 1 ? "disabled" : ""}><b>${day.getMonth()+1}/${day.getDate()}</b><small>${weekdays[day.getDay()]}</small></button>`; }).join("") : ""}</div></div>
      <label class="shift-start">開始時刻<input type="time" step="60" data-time-input data-shift-field="start" value="${shift.start}"></label>
      <label class="shift-end">終了時刻<input type="time" step="60" data-time-input data-shift-field="end" value="${shift.end}"></label>
      ${shiftJob.payType === "session" ? `<label class="shift-sessions">1日あたりのコマ数<input type="number" min="1" step="1" data-shift-field="sessions" value="${shift.sessions}" placeholder="例：2"></label>` : ""}
      <span class="shift-result"><b>${calculated.payType === "session" ? `${calculated.sessions}コマ` : `${calculated.days}日・${calculated.hours.toFixed(2)}h`}</b><small>${calculated.days}日・休憩 ${(calculated.breakMinutes / 60).toFixed(2)}h</small><strong>${money(calculated.wage)}</strong></span>
      <div class="shift-breaks"><div class="shift-break-head"><span>休憩時間</span><button type="button" data-add-break>＋ 休憩</button></div><div class="shift-break-list">${(shift.breaks || []).length ? shift.breaks.map(item => `<div class="shift-break-row" data-break-id="${item.id}"><label>開始時刻<input type="time" step="60" data-time-input data-break-field="start" value="${item.start}"></label><span>〜</span><label>終了時刻<input type="time" step="60" data-time-input data-break-field="end" value="${item.end}"></label><button type="button" data-delete-break aria-label="休憩を削除">×</button></div>`).join("") : '<p>休憩なし</p>'}</div></div>
      <button type="button" class="row-delete" data-delete-shift aria-label="シフトを削除">×</button>
    </div>`;
  }
  function ruleRow(rule) {
    return `<div class="rule-row" data-rule-id="${rule.id}"><input class="rule-name" type="text" data-rule-field="name" maxlength="20" value="${escapeHtml(rule.name)}" placeholder="例：通常・深夜"><div class="rule-time-range"><label><span>開始</span><input type="time" step="60" data-time-input data-rule-field="start" value="${rule.start}"></label><i>〜</i><label><span>終了</span><input type="time" step="60" data-time-input data-rule-field="end" value="${rule.end}"></label></div><label class="rule-rate"><input type="number" min="0" step="1" data-rule-field="rate" value="${rule.rate}" placeholder="例：1,200"><span>円/時</span></label><button type="button" class="row-delete" data-delete-rule aria-label="時間帯を削除">×</button></div>`;
  }
  function updateShiftResult(row, shift) {
    const calculated = calculateShift(shift, payCycle(jobFor(shift.jobId))), result = row?.querySelector(".shift-result");
    if (!result) return;
    result.innerHTML = `<b>${calculated.payType === "session" ? `${calculated.sessions}コマ` : `${calculated.days}日・${calculated.hours.toFixed(2)}h`}</b><small>${calculated.days}日・休憩 ${(calculated.breakMinutes / 60).toFixed(2)}h</small><strong>${money(calculated.wage)}</strong>`;
  }
  function updateVisibleCalculations() {
    view.querySelectorAll("[data-shift-id]").forEach(row => {
      const shift = salaryState.shifts.find(item => item.id === Number(row.dataset.shiftId));
      if (shift) updateShiftResult(row, shift);
    });
    const cycle = payCycle(activeJob()), monthTotal = totals(monthShifts(activeJob(), cycle), cycle), cumulative = totals(salaryState.shifts, null);
    const monthWage = view.querySelector("[data-month-wage]"), monthHours = view.querySelector("[data-month-hours]"), cumulativeWage = view.querySelector("[data-cumulative-wage]");
    if (monthWage) monthWage.textContent = money(monthTotal.wage);
    if (monthHours) monthHours.textContent = `${(monthTotal.minutes / 60).toFixed(2)}時間`;
    if (cumulativeWage) cumulativeWage.textContent = money(cumulative.wage);
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
    const allowedTypes = ["application/pdf","image/png","image/jpeg"];
    if (!allowedTypes.includes(file.type)) { note.textContent = "PDF・PNG・JPEGを選択してください"; return; }
    if (file.size > 10 * 1024 * 1024) { note.textContent = "10MB以下のファイルを選択してください"; return; }
    note.textContent = "アップロード中…";
    const id = crypto.randomUUID(), period = view.querySelector("[data-payslip-period]").value;
    const response = await fetch(`/api/files/${id}?name=${encodeURIComponent(file.name)}&period=${encodeURIComponent(period)}`, { method:"PUT", credentials:"same-origin", headers:{ "Content-Type":file.type }, body:file });
    const result = await response.json().catch(()=>({}));
    if (!response.ok) { note.textContent = result.error || "アップロードできませんでした"; return; }
    note.textContent = "保存しました"; await refreshPayslips();
  }

  document.addEventListener("click", event => {
    if (event.target.closest('[data-view="salary"]')) { render(); refreshPayslips(); }
    const jobTab = event.target.closest("[data-job-tab]");
    if (jobTab) { salaryState.activeJobId=Number(jobTab.dataset.jobTab);persistAndRender();return; }
    const monthStep = event.target.closest("[data-salary-month-step]");
    if (monthStep) changeMonth(Number(monthStep.dataset.salaryMonthStep));
    if (event.target.closest("[data-add-shift]")) { const cycle=payCycle(activeJob());if(cycle.configured){salaryState.shifts.push({ id:Date.now(), jobId:activeJob().id, dates:[], start:"", end:"", breaks:[], sessions:"", memo:"" });persistAndRender();} }
    if (event.target.closest("[data-add-rule]")) { rulesFor(activeJob(), salaryState.month, true).push(defaultRule()); persistAndRender(); }
    const statusButton = event.target.closest("[data-job-status]");
    if (statusButton) { activeJob().status=statusButton.dataset.jobStatus === "retired" ? "retired" : "active"; persistAndRender(); }
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
    const shiftDateAdd = event.target.closest("[data-add-shift-date]");
    if (shiftDateAdd) {
      const row=shiftDateAdd.closest("[data-shift-id]"),shift=salaryState.shifts.find(item=>item.id===Number(row.dataset.shiftId)),date=row.querySelector("[data-shift-date-picker]").value;
      if (shift && date && !shiftDates(shift).includes(date)) { shift.dates=[...shiftDates(shift),date].sort();persistAndRender(); }
    }
    const shiftDateRemove = event.target.closest("[data-remove-shift-date]");
    if (shiftDateRemove && !shiftDateRemove.disabled) {
      const row=shiftDateRemove.closest("[data-shift-id]"),shift=salaryState.shifts.find(item=>item.id===Number(row.dataset.shiftId));
      if (shift) { shift.dates=shiftDates(shift).filter(date=>date!==shiftDateRemove.dataset.removeShiftDate);persistAndRender(); }
    }
    const shiftDateToggle = event.target.closest("[data-toggle-shift-date]");
    if (shiftDateToggle && !shiftDateToggle.disabled) {
      const row=shiftDateToggle.closest("[data-shift-id]"),shift=salaryState.shifts.find(item=>item.id===Number(row.dataset.shiftId)),date=shiftDateToggle.dataset.toggleShiftDate;
      if (shift) { const dates=shiftDates(shift);shift.dates=dates.includes(date)?dates.filter(item=>item!==date):[...dates,date].sort();persistAndRender(); }
    }
    const breakAdd = event.target.closest("[data-add-break]");
    if (breakAdd) { const row=breakAdd.closest("[data-shift-id]"),shift=salaryState.shifts.find(item=>item.id===Number(row.dataset.shiftId));if(shift){shift.breaks||=[];shift.breaks.push(defaultBreak());persistAndRender();} }
    const breakDelete = event.target.closest("[data-delete-break]");
    if (breakDelete) { const row=breakDelete.closest("[data-shift-id]"),shift=salaryState.shifts.find(item=>item.id===Number(row.dataset.shiftId)),id=Number(breakDelete.closest("[data-break-id]").dataset.breakId);if(shift){shift.breaks=(shift.breaks||[]).filter(item=>Number(item.id)!==id);persistAndRender();} }
    const ruleDelete = event.target.closest("[data-delete-rule]");
    if (ruleDelete && rulesFor(activeJob(),salaryState.month,true).length > 1) { const id=Number(ruleDelete.closest("[data-rule-id]").dataset.ruleId); activeJob().rulesByMonth[salaryState.month]=rulesFor(activeJob(),salaryState.month,true).filter(item=>item.id!==id); persistAndRender(); }
    if (event.target.closest("[data-open-income]")) { document.querySelector('[data-view="finances"]')?.click(); setFinanceTab("transactions"); openModal(); document.querySelector('input[name="type"][value="income"]').checked=true; options(); }
    if (event.target.closest("[data-register-salary]")) {
      const job=activeJob(),cycle=payCycle(job),amount=totals(monthShifts(job,cycle),cycle).wage;
      const result=window.ExpenceFinanceStore?.upsertSalaryIncome?.({ sourceId:`salary:${job.id}:${cycle.payment}`, date:cycle.payment, amount, memo:`${job.name} 給与` });
      if (result) { const toast=document.querySelector("#toast");if(toast){toast.textContent=result.created?"給与を家計に登録しました":"登録済み給与を更新しました";toast.classList.add("show");setTimeout(()=>toast.classList.remove("show"),1800);}render(); }
    }
    if (event.target.closest("[data-upload-payslip]")) uploadPayslip().catch(()=>{ const note=view.querySelector("[data-payslip-note]"); if(note)note.textContent="アップロードできませんでした"; });
    const payslipDelete = event.target.closest("[data-delete-payslip]");
    if (payslipDelete && confirm("この給与明細を削除しますか？")) fetch(`/api/files/${encodeURIComponent(payslipDelete.dataset.deletePayslip)}`, { method:"DELETE", credentials:"same-origin" }).then(refreshPayslips);
  });
  document.addEventListener("change", event => {
    if (event.target.matches("[data-payslip-file]")) { const note=view.querySelector("[data-payslip-note]"),file=event.target.files?.[0];if(note)note.textContent=file?`${file.name}を選択中（${(file.size/1024/1024).toFixed(2)}MB）`:"PDF・PNG・JPEG、1ファイル10MBまで";return; }
    if (event.target.matches("[data-salary-month]")) { salaryState.month=event.target.value; persistAndRender(); return; }
    if (event.target.matches("[data-job-payday]")) { activeJob().payday=event.target.value===""?"":Math.min(31,Math.max(1,Number(event.target.value)||1)); persistAndRender(); return; }
    if (event.target.matches("[data-job-closing-day]")) { activeJob().closingDay=event.target.value===""?"":Math.min(31,Math.max(1,Number(event.target.value)||1)); persistAndRender(); return; }
    if (event.target.matches("[data-job-pay-type]")) { activeJob().payType=event.target.value === "session" ? "session" : "hourly"; persistAndRender(); return; }
    if (event.target.matches("[data-job-session-rate]")) { activeJob().sessionRate=event.target.value===""?"":Math.max(0,Number(event.target.value)||0); persistAndRender(); return; }
    const shiftRowElement = event.target.closest("[data-shift-id]");
    if (shiftRowElement && event.target.dataset.shiftField) {
      const shift=salaryState.shifts.find(item=>item.id===Number(shiftRowElement.dataset.shiftId));
      const numeric = event.target.type === "number" || event.target.dataset.shiftField === "jobId";
      const field=event.target.dataset.shiftField,value=event.target.dataset.timeInput!==undefined?(event.target.value===""?"":normalizeTime(event.target.value,shift[field])):numeric?(event.target.value===""?"":Number(event.target.value)):event.target.value;
      shift[field]=value;if(event.target.dataset.timeInput!==undefined)event.target.value=value;
      if(field==="jobId"){salaryState.activeJobId=Number(value);persistAndRender();return;}save(false,false);updateVisibleCalculations();return;
    }
    const breakRowElement = event.target.closest("[data-break-id]");
    if (breakRowElement && event.target.dataset.breakField) {
      const shiftRow=breakRowElement.closest("[data-shift-id]"),shift=salaryState.shifts.find(item=>item.id===Number(shiftRow.dataset.shiftId)),item=shift?.breaks?.find(entry=>Number(entry.id)===Number(breakRowElement.dataset.breakId));
      if(item){const field=event.target.dataset.breakField,value=event.target.value===""?"":normalizeTime(event.target.value,item[field]);item[field]=value;event.target.value=value;save(false,false);updateVisibleCalculations();}return;
    }
    const ruleRowElement = event.target.closest("[data-rule-id]");
    if (ruleRowElement && event.target.dataset.ruleField) { const rule=rulesFor(activeJob(),salaryState.month,true).find(item=>item.id===Number(ruleRowElement.dataset.ruleId)),field=event.target.dataset.ruleField,value=event.target.dataset.timeInput!==undefined?(event.target.value===""?"":normalizeTime(event.target.value,rule[field])):event.target.type==="number"?(event.target.value===""?"":Number(event.target.value)):event.target.value;rule[field]=value;if(event.target.dataset.timeInput!==undefined)event.target.value=value;save(false,false);updateVisibleCalculations(); }
  });
  document.addEventListener("input", event => {
    if (event.target.matches("[data-job-session-rate]")) { activeJob().sessionRate=event.target.value===""?"":Math.max(0,Number(event.target.value)||0);save(false,false);updateVisibleCalculations();return; }
    const shiftRowElement = event.target.closest("[data-shift-id]");
    if (shiftRowElement && event.target.dataset.shiftField && event.target.dataset.timeInput===undefined) {
      const shift = salaryState.shifts.find(item => item.id === Number(shiftRowElement.dataset.shiftId));
      if (shift) { shift[event.target.dataset.shiftField] = event.target.type === "number" ? (event.target.value===""?"":Number(event.target.value)) : event.target.value; save(false,false);updateVisibleCalculations(); }
    }
    const ruleRowElement = event.target.closest("[data-rule-id]");
    if (ruleRowElement && event.target.dataset.ruleField && event.target.dataset.timeInput===undefined) {
      const rule = rulesFor(activeJob(),salaryState.month,true).find(item => item.id === Number(ruleRowElement.dataset.ruleId));
      if (rule) { rule[event.target.dataset.ruleField] = event.target.type === "number" ? (event.target.value===""?"":Number(event.target.value)) : event.target.value; save(false,false);updateVisibleCalculations(); }
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
