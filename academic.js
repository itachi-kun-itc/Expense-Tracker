(() => {
  const KEY = "expence-tracker-academic-v1";
  const MODE_KEY = "expence-tracker-app-mode-v1";
  const emptyState = () => ({
    subjects: [],
    commuter: { oneWay:0, daysPerMonth:20, months:1, pass1:0, pass3:0, pass6:0 }
  });
  let academic = load(), mode = localStorage.getItem(MODE_KEY) === "academic" ? "academic" : "finance";
  function load() { try { return { ...emptyState(), ...(JSON.parse(localStorage.getItem(KEY)) || {}) }; } catch { return emptyState(); } }
  function save(skipSync=false) { localStorage.setItem(KEY,JSON.stringify(academic));if(!skipSync)window.CloudSync?.schedule(); }
  const escapeHtml = value => String(value ?? "").replace(/[&<>\"]/g, character => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[character]));
  const money = value => `${Math.round(Number(value)||0).toLocaleString("ja-JP")}円`;
  const content = document.querySelector(".content");

  const academicHome = document.createElement("section");
  academicHome.id = "academicHomeView";academicHome.className = "view academic-view";
  academicHome.innerHTML = `<div class="academic-heading"><p class="eyebrow">ACADEMIC MODE</p><h2>学業ホーム</h2><p>ホームを長押しすると家計モードへ戻ります。</p></div><div class="academic-home-grid"><button data-view="attendance"><span class="academic-card-icon">✓</span><div><b>出欠管理</b><small>科目ごとの出席率を確認</small></div><i>→</i></button><button data-view="commuter"><span class="academic-card-icon">↔</span><div><b>定期券計算</b><small>通学日数と定期代を比較</small></div><i>→</i></button></div>`;
  content.appendChild(academicHome);

  const attendanceView = document.createElement("section");
  attendanceView.id="attendanceView";attendanceView.className="view academic-view";content.appendChild(attendanceView);
  const commuterView = document.createElement("section");
  commuterView.id="commuterView";commuterView.className="view academic-view";content.appendChild(commuterView);

  function academicIcon(type) {
    if(type==="attendance") return '<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 4h14v16H5zM8 9l2 2 4-4M8 15h8"/></svg>';
    return '<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 17h16M6 17V8h12v9M8 8l4-4 4 4M8 12h8"/></svg>';
  }
  function addNav(container, view, label) {
    const button=document.createElement("button");button.type="button";button.dataset.view=view;button.dataset.academicOnly="";button.className=container.classList.contains("main-nav")?"nav-item":"";button.innerHTML=container.classList.contains("main-nav")?`<span>${academicIcon(view)}</span>${label}`:`<i>${academicIcon(view)}</i><span>${label}</span>`;container.appendChild(button);
  }
  addNav(document.querySelector(".main-nav"),"attendance","出欠");addNav(document.querySelector(".main-nav"),"commuter","定期券計算");
  addNav(document.querySelector(".mobile-nav"),"attendance","出欠");addNav(document.querySelector(".mobile-nav"),"commuter","定期券");
  const homeButtons=[...document.querySelectorAll('[data-view="dashboard"]')];homeButtons.forEach(button=>button.dataset.homeToggle="");

  function applyMode(navigate=true) {
    document.body.dataset.appMode=mode;localStorage.setItem(MODE_KEY,mode);
    homeButtons.forEach(button=>button.dataset.view=mode==="academic"?"academicHome":"dashboard");
    if(navigate) window.appNav?.(mode==="academic"?"academicHome":"dashboard");
    document.querySelector("#toast").textContent=mode==="academic"?"学業モードに切り替えました":"家計モードに戻りました";
    render();
  }
  function toggleMode() { mode=mode==="academic"?"finance":"academic";applyMode(true);const toast=document.querySelector("#toast");toast.classList.add("show");setTimeout(()=>toast.classList.remove("show"),1800); }

  let holdTimer=null,suppressClick=false;
  document.addEventListener("pointerdown",event=>{if(!event.target.closest("[data-home-toggle]"))return;clearTimeout(holdTimer);holdTimer=setTimeout(()=>{suppressClick=true;toggleMode();},650);});
  ["pointerup","pointercancel","pointerleave"].forEach(type=>document.addEventListener(type,()=>clearTimeout(holdTimer)));
  document.addEventListener("click",event=>{if(suppressClick&&event.target.closest("[data-home-toggle]")){event.preventDefault();event.stopImmediatePropagation();suppressClick=false;}},true);

  function attendanceRate(subject) {
    const held=Math.max(0,Number(subject.held)||0),absence=Math.max(0,Number(subject.absent)||0),late=Math.max(0,Number(subject.late)||0);
    return held?Math.max(0,Math.min(100,((held-absence-late/3)/held)*100)):0;
  }
  function renderAttendance() {
    const average=academic.subjects.length?academic.subjects.reduce((sum,subject)=>sum+attendanceRate(subject),0)/academic.subjects.length:0;
    attendanceView.innerHTML=`<div class="academic-heading section-heading"><div><p class="eyebrow">ATTENDANCE</p><h2>出欠管理</h2><p>遅刻3回を欠席1回相当として目安を計算</p></div><button class="primary-btn" data-add-subject>＋ 科目</button></div><div class="attendance-summary"><small>平均出席率</small><b>${average.toFixed(1)}%</b></div><div class="subject-list">${academic.subjects.length?academic.subjects.map(subject=>`<article class="panel subject-row" data-subject-id="${subject.id}"><label>科目名<input data-subject-field="name" value="${escapeHtml(subject.name)}" maxlength="30"></label><label>実施回数<input type="number" min="0" data-subject-field="held" value="${subject.held}"></label><label>出席<input type="number" min="0" data-subject-field="attended" value="${subject.attended}"></label><label>遅刻<input type="number" min="0" data-subject-field="late" value="${subject.late}"></label><label>欠席<input type="number" min="0" data-subject-field="absent" value="${subject.absent}"></label><div class="subject-rate"><span>出席率</span><b>${attendanceRate(subject).toFixed(1)}%</b><i><em style="width:${attendanceRate(subject)}%"></em></i></div><button data-delete-subject aria-label="科目を削除">×</button></article>`).join(""):'<div class="panel salary-empty">科目を追加してください</div>'}</div>`;
  }
  function passPrice(months) {
    const values={1:Number(academic.commuter.pass1)||0,3:Number(academic.commuter.pass3)||0,6:Number(academic.commuter.pass6)||0};
    if(months===1)return values[1];if(months===3)return values[3];if(months===6)return values[6];
    if(months===12)return values[6]*2;return values[1]*months;
  }
  function renderCommuter() {
    const value=academic.commuter,months=Number(value.months)||1,normal=(Number(value.oneWay)||0)*2*(Number(value.daysPerMonth)||0)*months,pass=passPrice(months),saving=pass?normal-pass:0;
    commuterView.innerHTML=`<div class="academic-heading"><p class="eyebrow">COMMUTER PASS</p><h2>定期券計算</h2><p>通常運賃と通学定期券を比較</p></div><div class="commuter-layout"><article class="panel commuter-form"><div class="form-grid"><label>片道運賃（円）<input type="number" min="0" data-commuter-field="oneWay" value="${value.oneWay}"></label><label>月の通学日数<input type="number" min="0" max="31" data-commuter-field="daysPerMonth" value="${value.daysPerMonth}"></label></div><label>比較期間<select data-commuter-field="months">${[1,3,6,12].map(number=>`<option value="${number}" ${months===number?"selected":""}>${number}か月</option>`).join("")}</select></label><div class="pass-price-grid"><label>1か月定期<input type="number" min="0" data-commuter-field="pass1" value="${value.pass1}"></label><label>3か月定期<input type="number" min="0" data-commuter-field="pass3" value="${value.pass3}"></label><label>6か月定期<input type="number" min="0" data-commuter-field="pass6" value="${value.pass6}"></label></div></article><article class="panel commuter-result"><div><small>通常運賃</small><b>${money(normal)}</b></div><div><small>定期券</small><b>${pass?money(pass):"未入力"}</b></div><div class="saving-result"><small>${saving>=0?"定期券がお得":"通常運賃がお得"}</small><strong>${money(Math.abs(saving))}</strong></div></article></div>`;
  }
  function render(){renderAttendance();renderCommuter();}
  document.addEventListener("click",event=>{
    if(event.target.closest("[data-add-subject]")){academic.subjects.push({id:Date.now(),name:`科目${academic.subjects.length+1}`,held:0,attended:0,late:0,absent:0});save();renderAttendance();}
    const deletion=event.target.closest("[data-delete-subject]");if(deletion){const id=Number(deletion.closest("[data-subject-id]").dataset.subjectId);academic.subjects=academic.subjects.filter(subject=>subject.id!==id);save();renderAttendance();}
  });
  document.addEventListener("change",event=>{
    const subjectRow=event.target.closest("[data-subject-id]");if(subjectRow&&event.target.dataset.subjectField){const subject=academic.subjects.find(item=>item.id===Number(subjectRow.dataset.subjectId));subject[event.target.dataset.subjectField]=event.target.type==="number"?Number(event.target.value):event.target.value;save();renderAttendance();return;}
    if(event.target.dataset.commuterField){academic.commuter[event.target.dataset.commuterField]=event.target.tagName==="SELECT"||event.target.type==="number"?Number(event.target.value):event.target.value;save();renderCommuter();}
  });
  document.addEventListener("input",event=>{const subjectRow=event.target.closest("[data-subject-id]");if(subjectRow&&event.target.dataset.subjectField){const subject=academic.subjects.find(item=>item.id===Number(subjectRow.dataset.subjectId));subject[event.target.dataset.subjectField]=event.target.type==="number"?Number(event.target.value):event.target.value;save();}if(event.target.dataset.commuterField){academic.commuter[event.target.dataset.commuterField]=Number(event.target.value)||0;save();}});
  window.ExpenceAcademicStore={snapshot:()=>structuredClone(academic),restore:value=>{academic={...emptyState(),...(value||{})};save(true);render();},reset:()=>{academic=emptyState();save(true);render();}};
  render();applyMode(mode === "academic");
})();
