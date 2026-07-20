(() => {
  const KEY = "expence-tracker-personal-v1";
  const defaults = {
    completed: [],
    tasks: [
      ["task-1", "-", "-", "-", "-", "violet"],
      ["task-2", "-", "-", "-", "-", "blue"],
      ["task-3", "-", "-", "-", "-", "coral"],
      ["task-4", "-", "-", "-", "-", "gold"]
    ]
  };
  let state;
  try { state = { ...structuredClone(defaults), ...JSON.parse(localStorage.getItem(KEY) || "null") }; }
  catch { state = structuredClone(defaults); }
  const save = () => localStorage.setItem(KEY, JSON.stringify(state));
  const yen = n => `¥${Number(n).toLocaleString("ja-JP")}`;

  const style = document.createElement("link");
  style.rel = "stylesheet";
  style.href = "personal.css";
  document.head.appendChild(style);

  const side = document.createElement("button");
  side.className = "nav-item";
  side.dataset.view = "personal";
  side.innerHTML = "<span>▦</span>学業・私用";
  document.querySelector(".main-nav").appendChild(side);

  const mobile = document.createElement("button");
  mobile.dataset.view = "personal";
  mobile.innerHTML = "▦<span>学業</span>";
  document.querySelector(".mobile-nav").appendChild(mobile);

  const view = document.createElement("section");
  view.id = "personalView";
  view.className = "view personal-view";
  view.innerHTML = `
    <div class="section-heading personal-heading">
      <div><p class="eyebrow">PERSONAL HUB</p><h2>学業・私用</h2><p>提出物、単位、移動、資格をひとつに。</p></div>
      <span class="term-pill">-</span>
    </div>
    <div class="personal-summary" id="personalSummary"></div>
    <div class="personal-tabs">
      <button class="active" data-personal-tab="tasks">締切・時間割</button>
      <button data-personal-tab="credits">単位・GPA</button>
      <button data-personal-tab="passes">定期券</button>
      <button data-personal-tab="license">教習所</button>
    </div>
    <div id="personalPanel"></div>`;
  document.querySelector(".content").appendChild(view);
  const summaryEl = document.querySelector("#personalSummary");
  const panelEl = document.querySelector("#personalPanel");
  const personalPanel = panelEl;
  const pageTitle = document.querySelector("#pageTitle");

  function summary() {
    const remaining = state.tasks.filter(t => !state.completed.includes(t[0])).length;
    summaryEl.innerHTML = `
      <article><span class="summary-icon coral">✓</span><div><small>未完了の締切</small><b>${remaining}<em>件</em></b></div></article>
      <article><span class="summary-icon mint">単</span><div><small>取得済み単位</small><b>-</b></div></article>
      <article><span class="summary-icon violet">G</span><div><small>累積GPA</small><b>-</b></div></article>
      <article><span class="summary-icon gold">免</span><div><small>運転免許</small><b>-</b></div></article>`;
  }
  const date = value => {
    if (value === "-") return "-";
    const d = new Date(`${value}T00:00:00`);
    return `${d.getMonth()+1}/${d.getDate()}（${"日月火水木金土"[d.getDay()]}）`;
  };
  function tasks() {
    const rows = state.tasks.sort((a,b) => a[3].localeCompare(b[3])).map(t => {
      const done = state.completed.includes(t[0]);
      return `<label class="deadline-row ${done ? "done" : ""}"><input type="checkbox" data-task-id="${t[0]}" ${done ? "checked" : ""}><span class="task-check">✓</span><span class="course-dot ${t[5]}"></span><div><b>${t[2]}</b><small>${t[1]}</small></div><span class="task-kind">${t[4]}</span><time>${date(t[3])}</time></label>`;
    }).join("");
    const schedule = [["1限","-","-","-","-","-"],["2限","-","-","-","-","-"],["3限","-","-","-","-","-"],["4限","-","-","-","-","-"]];
    personalPanel.innerHTML = `<div class="personal-grid"><article class="panel deadline-panel"><div class="card-head"><div><h2>直近の締切</h2><p class="subtle">完了したらチェック</p></div><span class="status-pill">-</span></div><div class="deadline-list">${rows}</div></article><article class="panel"><div class="card-head"><div><h2>週間時間割</h2><p class="subtle">-</p></div></div><div class="timetable"><div></div>${["月","火","水","木","金"].map(d=>`<b>${d}</b>`).join("")}${schedule.flatMap(r=>r.map((c,i)=>i?`<span>${c}</span>`:`<b>${c}</b>`)).join("")}</div></article></div>`;
  }
  function credits() {
    const courses = Array.from({length: 6}, () => ["-","-","-","-"]);
    personalPanel.innerHTML = `<div class="credit-layout"><article class="panel credit-progress"><div class="ring"><div><b>-</b><small>-</small></div></div><h2>-</h2><p class="subtle">-</p><div class="credit-bar"><i style="width:0"></i></div><div class="credit-legend"><span>-</span><span>-</span><span>-</span></div></article><article class="panel"><div class="card-head"><div><h2>成績ハイライト</h2><p class="subtle">-</p></div><span class="status-pill">-</span></div><div class="grade-list">${courses.map(c=>`<div><span>${c[0]}</span><small>${c[1]}</small><b class="grade">${c[3]}</b><strong>${c[2]}</strong></div>`).join("")}</div></article></div>`;
  }
  function passes() {
    const rows = Array.from({length: 3}, () => ["-","-","-"]);
    const card = title => `<article class="panel pass-card"><div class="card-head"><div><h2>${title}</h2><p class="subtle">期間別の総額比較</p></div></div><div class="pass-head"><span>期間</span><span>-</span><span>-</span></div>${rows.map(r=>`<div class="pass-row"><b>${r[0]}</b><span>${r[1]}</span><span>${r[2]}</span></div>`).join("")}</article>`;
    personalPanel.innerHTML = `<div class="pass-layout">${card("通学定期券")}${card("通勤定期券")}</div><div class="panel pass-tip"><span>💡</span><div><b>-</b><p>-</p></div></div>`;
  }
  function license() {
    const milestones = Array.from({length: 7}, () => ["-","-"]);
    personalPanel.innerHTML = `<div class="license-hero panel"><div class="license-medal">-</div><div><p class="eyebrow">STATUS</p><h2>-</h2><p class="subtle">-</p></div><b>-</b></div><article class="panel milestone-panel"><div class="card-head"><div><h2>教習の記録</h2><p class="subtle">-</p></div></div><div class="milestones">${milestones.map(m=>`<div><span>-</span><i></i><p><b>${m[0]}</b><small>${m[1]}</small></p></div>`).join("")}</div></article>`;
  }
  const renderers = { tasks, credits, passes, license };
  function show(tab) {
    document.querySelectorAll("[data-personal-tab]").forEach(b => b.classList.toggle("active", b.dataset.personalTab === tab));
    renderers[tab]();
  }
  document.addEventListener("click", e => {
    if (e.target.closest('[data-view="personal"]')) pageTitle.textContent = "学業・私用";
    const tab = e.target.closest("[data-personal-tab]")?.dataset.personalTab;
    if (tab) show(tab);
  });
  document.addEventListener("change", e => {
    const id = e.target.dataset.taskId;
    if (!id) return;
    state.completed = e.target.checked ? [...new Set([...state.completed,id])] : state.completed.filter(x=>x!==id);
    save(); summary(); tasks();
  });
  summary(); tasks();
})();
