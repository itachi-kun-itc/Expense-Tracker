const KEY = "expence-tracker-v2";
const iconPaths = {
  home:'<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10M9.5 20v-6h5v6"/>',
  transfer:'<path d="M7 3v18m0-18L3.5 6.5M7 3l3.5 3.5M17 21V3m0 18-3.5-3.5M17 21l3.5-3.5"/>',
  target:'<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3.5"/>',
  chart:'<path d="M4 19V5m0 14h16"/><path d="m7 15 3-4 3 2 5-7"/>',
  cloud:'<path d="M7 18h10a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.2 8.3 4.5 4.5 0 0 0 7 18Z"/><path d="m9 14 2 2 4-4"/>',
  user:'<circle cx="12" cy="8" r="3.5"/><path d="M5 20c.7-4 3-6 7-6s6.3 2 7 6"/>',
  reset:'<path d="M4 7v5h5"/><path d="M5.5 11A7 7 0 1 1 7 17.5"/>', plus:'<path d="M12 5v14M5 12h14"/>',
  food:'<path d="M7 3v8m-3-8v5a3 3 0 0 0 6 0V3M7 11v10M16 3v18m0-18c3 2 4 5 4 8h-4"/>',
  transport:'<path d="M5 16V7c0-3 2-4 7-4s7 1 7 4v9M5 11h14M8 16h.01M16 16h.01M7 16v3m10-3v3"/>',
  hobby:'<path d="M8 9h8a5 5 0 0 1 4.7 6.7l-.8 2.1a2 2 0 0 1-3.4.6L14 16h-4l-2.5 2.4a2 2 0 0 1-3.4-.6l-.8-2.1A5 5 0 0 1 8 9Z"/><path d="M8 12v4m-2-2h4m6 0h.01"/>',
  daily:'<path d="M6 7h12l-1 14H7L6 7Z"/><path d="M9 7V5a3 3 0 0 1 6 0v2"/>',
  fixed:'<path d="m3 11 9-7 9 7"/><path d="M5.5 10v10h13V10M9 20v-6h6v6"/>',
  school:'<path d="m3 8 9-4 9 4-9 4-9-4Z"/><path d="M6 10.5V16c3 2 9 2 12 0v-5.5M21 8v6"/>',
  salary:'<path d="M6 3h12v18H6z"/><path d="M9 8h6M9 12h2m2 0h2m-6 4h2m2 0h2"/>',
  other:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  sheet:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M4 9h16M10 9v12M4 15h16"/>',
  wallet:'<path d="M4 6.5h14a2 2 0 0 1 2 2v10H4a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2h13"/><path d="M15 11h5v4h-5a2 2 0 0 1 0-4Z"/>'
};
const icon = name => `<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${iconPaths[name] || iconPaths.other}</svg>`;
window.uiIcon = icon;
document.querySelectorAll("[data-icon]").forEach(element => element.innerHTML = icon(element.dataset.icon));

const cats = {
  food:{name:"食費",icon:icon("food"),color:"#d66f63",bg:"#fceceb"}, transport:{name:"交通費",icon:icon("transport"),color:"#de8061",bg:"#feeee8"},
  hobby:{name:"趣味・娯楽",icon:icon("hobby"),color:"#735fc0",bg:"#f0ecfb"}, daily:{name:"日用品",icon:icon("daily"),color:"#c99b36",bg:"#fcf4dc"},
  fixed:{name:"固定費",icon:icon("fixed"),color:"#568fb7",bg:"#e8f3fa"}, school:{name:"大学・学習",icon:icon("school"),color:"#5267c9",bg:"#edf0ff"},
  salary:{name:"給与",icon:icon("salary"),color:"#5267c9",bg:"#edf0ff"}, other:{name:"その他",icon:icon("other"),color:"#7c8493",bg:"#f0f2f5"}
};
const localToday = new Date().toLocaleDateString("sv-SE"), currentMonth = localToday.slice(0,7);
const budgetTemplate = () => Object.fromEntries(Object.keys(cats).filter(key => key !== "salary").map(key => [key,0]));
const initial = { month:currentMonth, assets:0, previousBalance:0, scheduledBills:0, budgets:budgetTemplate(), budgetsByMonth:{}, carryoversByMonth:{}, carryoverModes:{}, carryoverUpdatedAt:{}, carryoverUpdateKeys:{}, carryoverUpdateLabels:{}, recurring:[], transactions:[] };
let state = load(), filter = "all";
const yen = value => `${value < 0 ? "−" : ""}${Math.abs(Math.round(value || 0)).toLocaleString("ja-JP")}円`;
const dateLabel = date => new Intl.DateTimeFormat("ja-JP",{month:"short",day:"numeric"}).format(new Date(`${date}T00:00:00`));
const escapeHtml = value => String(value ?? "").replace(/[&<>\"]/g, character => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[character]));

function normalizeState(value) {
  const result = { ...structuredClone(initial), ...(value || {}) };
  result.transactions = Array.isArray(result.transactions) ? result.transactions : [];
  result.recurring = Array.isArray(result.recurring) ? result.recurring : [];
  result.budgetsByMonth = result.budgetsByMonth && typeof result.budgetsByMonth === "object" ? result.budgetsByMonth : {};
  result.carryoversByMonth = result.carryoversByMonth && typeof result.carryoversByMonth === "object" ? result.carryoversByMonth : {};
  result.carryoverModes = result.carryoverModes && typeof result.carryoverModes === "object" ? result.carryoverModes : {};
  result.carryoverUpdatedAt = result.carryoverUpdatedAt && typeof result.carryoverUpdatedAt === "object" ? result.carryoverUpdatedAt : {};
  result.carryoverUpdateKeys = result.carryoverUpdateKeys && typeof result.carryoverUpdateKeys === "object" ? result.carryoverUpdateKeys : {};
  result.carryoverUpdateLabels = result.carryoverUpdateLabels && typeof result.carryoverUpdateLabels === "object" ? result.carryoverUpdateLabels : {};
  if (!Object.hasOwn(result.carryoversByMonth,result.month)) {
    result.carryoversByMonth[result.month] = Number(result.assets) || 0;
    if (Number(result.assets)) result.carryoverModes[result.month] = "manual";
  }
  if (!result.budgetsByMonth[result.month]) result.budgetsByMonth[result.month] = { ...budgetTemplate(), ...(result.budgets || {}) };
  return result;
}
function load() { try { return normalizeState(JSON.parse(localStorage.getItem(KEY) || "null")); } catch { return normalizeState(null); } }
function save(skipSync=false) { localStorage.setItem(KEY,JSON.stringify(state)); if (!skipSync) window.CloudSync?.schedule(); }
function monthBudgets() { return state.budgetsByMonth[state.month] ||= budgetTemplate(); }
function monthOffset(month,offset) { const [year,value]=month.split("-").map(Number),date=new Date(year,value-1+offset,1);return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}`; }
function monthRows(month=state.month) { return state.transactions.filter(item => String(item.date).startsWith(month)); }
function items() { return monthRows(); }
function totalsForMonth(month=state.month) { const rows=monthRows(month),income=rows.filter(item=>item.type==="income").reduce((sum,item)=>sum+Number(item.amount||0),0),expense=rows.filter(item=>item.type==="expense").reduce((sum,item)=>sum+Number(item.amount||0),0);return {income,expense,balance:income-expense}; }
function totals() { return totalsForMonth(); }
function carryoverForMonth(month=state.month) { return Number(state.carryoversByMonth[month]) || 0; }
function currentAssetsForMonth(month=state.month) { return carryoverForMonth(month) + totalsForMonth(month).balance; }
function spent(key) { return items().filter(item=>item.type==="expense"&&item.category===key).reduce((sum,item)=>sum+Number(item.amount||0),0); }
function recurringTotal() { return state.recurring.reduce((sum,item)=>sum+Number(item.amount||0),0); }
function salaryPaydays() {
  try { const salary=JSON.parse(localStorage.getItem("expence-tracker-salary-v1")||"null");return Array.isArray(salary?.jobs)?salary.jobs.filter(job=>job.status!=="retired"&&Number(job.payday)>0).map(job=>({id:Number(job.id)||String(job.name||"給与"),name:String(job.name||"給与"),day:Math.min(31,Math.max(1,Number(job.payday)||25))})):[]; }
  catch { return []; }
}
function salarySchedule(month) {
  const [year,value]=month.split("-").map(Number),lastDay=new Date(year,value,0).getDate();
  return salaryPaydays().map(item=>({...item,date:new Date(year,value-1,Math.min(lastDay,item.day))})).sort((a,b)=>a.date-b.date||String(a.id).localeCompare(String(b.id)));
}
function carryoverPaydayStatus(month) {
  const now=new Date();now.setHours(0,0,0,0);const schedule=salarySchedule(month),passed=schedule.filter(item=>{const date=new Date(item.date);date.setHours(0,0,0,0);return date<now;});
  return {schedule,passed,lastPassed:passed.at(-1)||null,next:schedule.find(item=>{const date=new Date(item.date);date.setHours(0,0,0,0);return date>=now;})||null};
}
function updateAutomaticCarryover(month) {
  if(state.carryoverModes[month]==="manual")return false;
  const previous=monthOffset(month,-1),status=carryoverPaydayStatus(previous),payday=status.lastPassed;if(!payday||!Object.hasOwn(state.carryoversByMonth,previous))return false;
  const amount=currentAssetsForMonth(previous),key=`${previous}:${payday.id}:${payday.date.toLocaleDateString("sv-SE")}`,changed=Number(state.carryoversByMonth[month])!==amount||state.carryoverModes[month]!=="auto"||state.carryoverUpdateKeys[month]!==key;
  if(changed){state.carryoversByMonth[month]=amount;state.carryoverModes[month]="auto";state.carryoverUpdatedAt[month]=new Date().toISOString();state.carryoverUpdateKeys[month]=key;state.carryoverUpdateLabels[month]=`${payday.name}（${payday.date.toLocaleDateString("ja-JP")}）`;}
  return changed;
}
function refreshAutomaticCarryovers() { const selected=updateAutomaticCarryover(state.month),next=updateAutomaticCarryover(monthOffset(currentMonth,1));return selected||next; }
function setCarryover(amount,month=state.month,mode="manual",skipSync=false) { state.carryoversByMonth[month]=Number(amount)||0;state.carryoverModes[month]=mode;state.carryoverUpdatedAt[month]=new Date().toISOString();state.assets=state.carryoversByMonth[month];save(skipSync);render(); }
function nextSalaryDates() {
  const now=new Date();now.setHours(0,0,0,0);
  return salaryPaydays().map(job=>{let year=now.getFullYear(),month=now.getMonth(),last=new Date(year,month+1,0).getDate(),date=new Date(year,month,Math.min(last,job.day));if(date<now){month++;if(month>11){month=0;year++;}last=new Date(year,month+1,0).getDate();date=new Date(year,month,Math.min(last,job.day));}return {...job,date,days:Math.ceil((date-now)/86400000)};});
}
function toast(message="保存しました") { const element=document.querySelector("#toast"); element.textContent=message;element.classList.add("show");setTimeout(()=>element.classList.remove("show"),1800); }
function shiftMonth(offset) { const [year,month]=state.month.split("-").map(Number), date=new Date(year,month-1+offset,1);state.month=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}`;state.assets=carryoverForMonth();monthBudgets();save();render(); }

function render() { if(refreshAutomaticCarryovers())save();header();dashboard();transactions();budgets();assets();renderCarryover();renderRecurring();renderExpenseBreakdown();window.dispatchEvent(new Event("expence-finance-render")); }
function header() {
  const [year,month]=state.month.split("-"); monthPicker.value=state.month; todayLabel.textContent=`${year}年 ${+month}月のマネーレポート`;
  document.querySelectorAll("[data-finance-month]").forEach(input=>input.value=state.month);
}
function dashboard() {
  const {income,expense,balance}=totals(),max=Math.max(income,expense,1),current=currentAssetsForMonth(),fixed=Number(state.scheduledBills||0)+recurringTotal();
  monthlyBalance.textContent=yen(balance);balanceDiff.textContent=(balance-state.previousBalance>0?"+":"")+yen(balance-state.previousBalance);incomeValue.textContent=yen(income);expenseValue.textContent=yen(expense);incomeBar.style.width=income/max*100+"%";expenseBar.style.width=expense/max*100+"%";
  const paydays=nextSalaryDates();daysLeft.innerHTML=paydays.length?paydays.map(item=>`<span class="payday-count">${escapeHtml(item.name)}まで <b>${item.days}日</b></span>`).join(""):'<span class="payday-count">給与日未設定</span>';currentAssets.textContent=yen(current);scheduledBills.textContent=yen(-fixed);forecastValue.textContent=yen(current-fixed);
  const budgets=monthBudgets();budgetGrid.innerHTML=["food","transport","hobby","daily"].map(key=>{const category=cats[key],used=spent(key),budget=budgets[key]||0,percent=Math.min(100,Math.round(used/budget*100)||0);return `<article class="budget-card"><div class="budget-top"><span class="category-icon" style="background:${category.bg};color:${category.color}">${category.icon}</span><span class="subtle">${percent}%</span></div><p class="amount">${yen(used)} <small>/ ${yen(budget)}</small></p><p class="subtle">${category.name}</p><div class="progress"><i style="width:${percent}%;background:${percent>85?'#ee9478':category.color}"></i></div><div class="budget-foot"><span>残り</span><b>${yen(Math.max(0,budget-used))}</b></div></article>`}).join("");
  week();recentList.innerHTML=[...items()].sort((a,b)=>b.date.localeCompare(a.date)||b.id-a.id).slice(0,4).map(activity).join("")||'<p class="empty">まだ記録がありません</p>';
}
function activity(item) { const category=cats[item.category]||cats.other;return `<div class="activity"><span class="activity-icon" style="background:${category.bg};color:${category.color}">${category.icon}</span><div><p>${escapeHtml(item.memo||category.name)}</p><small>${dateLabel(item.date)} ・ ${category.name}</small></div><b class="${item.type==='income'?'positive':''}">${item.type==='income'?'+':'−'}${yen(item.amount)}</b></div>`; }
function week() { const days=[];for(let index=6;index>=0;index--){const date=new Date();date.setHours(12,0,0,0);date.setDate(date.getDate()-index);const iso=date.toLocaleDateString("sv-SE");days.push({label:date.getDate()+"日",value:state.transactions.filter(item=>item.date===iso&&item.type==="expense").reduce((sum,item)=>sum+item.amount,0)});}const max=Math.max(...days.map(day=>day.value),1);weekChart.innerHTML=days.map(day=>`<div class="chart-column"><i data-value="${yen(day.value)}" style="height:${Math.max(3,day.value/max*82)}%"></i><span>${day.label}</span></div>`).join(""); }
function transactions() {
  let rows=[...items()].sort((a,b)=>b.date.localeCompare(a.date)||b.id-a.id);if(filter!=="all")rows=rows.filter(item=>item.type===filter);
  transactionTable.innerHTML='<div class="tx-row header"><span>日付</span><span>内容</span><span>カテゴリ</span><span>金額</span><span></span></div>'+(rows.map(item=>{const category=cats[item.category]||cats.other;return `<div class="tx-row"><span>${dateLabel(item.date)}</span><div><b>${escapeHtml(item.memo||category.name)}</b></div><span class="tx-category">${category.name}</span><b class="${item.type==='income'?'positive':''}">${item.type==='income'?'+':'−'}${yen(item.amount)}</b><button data-delete="${item.id}" aria-label="削除">×</button></div>`}).join("")||'<p class="empty">この月の記録はありません</p>');
}
function budgets() { const budgets=monthBudgets();budgetEditor.innerHTML=Object.keys(budgets).map(key=>{const category=cats[key],used=spent(key),value=Number(budgets[key])||0;return `<div class="budget-edit-row"><span class="category-icon" style="background:${category.bg};color:${category.color}">${category.icon}</span><div><b>${category.name}</b><p class="subtle">今月 ${yen(used)} 使用</p></div><input type="number" min="0" step="1000" data-budget="${key}" value="${value||""}" placeholder="例：30,000"><span class="subtle">残り ${yen(Math.max(0,value-used))}</span></div>`}).join(""); }
function renderExpenseBreakdown() {
  const expenses=items().filter(item=>item.type==="expense"),total=expenses.reduce((sum,item)=>sum+Number(item.amount||0),0),values=Object.keys(cats).filter(key=>key!=="salary").map(key=>({key,value:expenses.filter(item=>item.category===key).reduce((sum,item)=>sum+Number(item.amount||0),0)})).filter(item=>item.value>0).sort((a,b)=>b.value-a.value);
  expenseBreakdown.innerHTML=values.length?`<div class="expense-total"><small>支出合計</small><b>${yen(total)}</b></div><div class="expense-ratio-list">${values.map(item=>{const category=cats[item.key],percent=Math.round(item.value/total*100);return `<div><span>${category.name}</span><div class="ratio-bar"><i style="width:${percent}%;background:${category.color}"></i></div><b>${percent}%</b><small>${yen(item.value)}</small></div>`}).join("")}</div>`:'<p class="salary-empty">この月の支出はありません</p>';
}
function renderRecurring() {
  recurringCategory.innerHTML=Object.keys(cats).filter(key=>key!=="salary").map(key=>`<option value="${key}">${cats[key].name}</option>`).join("");
  recurringList.innerHTML=state.recurring.length?state.recurring.map(item=>{const category=cats[item.category]||cats.fixed;return `<div class="recurring-row"><span class="category-icon" style="background:${category.bg};color:${category.color}">${category.icon}</span><div><b>${escapeHtml(item.name)}</b><small>毎月${item.day}日・${category.name}</small></div><strong>${yen(item.amount)}</strong><button type="button" data-delete-recurring="${item.id}" aria-label="定額支出を削除">×</button></div>`}).join(""):'<p class="salary-empty">定額支出はありません</p>';
}
function assets() { const {balance}=totals(),current=currentAssetsForMonth(),fixed=Number(state.scheduledBills||0)+recurringTotal(),salaries=Array(6).fill(0);let value=current;const values=[value,...salaries.map(salary=>value+=salary-fixed)],labels=["現在","1か月","2か月","3か月","4か月","5か月","6か月"],min=Math.min(...values),max=Math.max(...values),range=Math.max(max-min,1),width=620,height=180,padding=18,points=values.map((number,index)=>`${padding+index*(width-padding*2)/(values.length-1)},${height-padding-(number-min)/range*(height-padding*2)}`).join(" ");assetTotal.textContent=yen(current);assetChange.textContent=yen(balance);assetChart.innerHTML=`<svg viewBox="0 0 ${width} ${height}" role="img"><defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#aebbf5" stop-opacity=".45"/><stop offset="1" stop-color="#aebbf5" stop-opacity="0"/></linearGradient></defs><polygon points="${padding},${height-padding} ${points} ${width-padding},${height-padding}" fill="url(#area)"/><polyline points="${points}" fill="none" stroke="#5267c9" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>${points.split(" ").map((point,index)=>{const[x,y]=point.split(",");return `<circle cx="${x}" cy="${y}" r="4" fill="#fff" stroke="#5267c9" stroke-width="3"/><text x="${x}" y="${height-2}" text-anchor="middle" font-size="9" fill="#7b8495">${labels[index]}</text>`}).join("")}</svg>`; }
function renderCarryover() {
  const input=document.querySelector("[data-carryover-input]"),monthLabel=document.querySelector("[data-carryover-month]"),modeLabel=document.querySelector("[data-carryover-mode]"),note=document.querySelector("[data-carryover-note]");if(!input)return;
  const [year,month]=state.month.split("-").map(Number),mode=state.carryoverModes[state.month],previous=monthOffset(state.month,-1),paydayStatus=carryoverPaydayStatus(previous),updated=state.carryoverUpdatedAt[state.month],updateLabel=state.carryoverUpdateLabels[state.month];
  input.value=carryoverForMonth()||"";input.placeholder="例：500,000";monthLabel.textContent=`${year}年${month}月の開始時点`;modeLabel.textContent=mode==="manual"?"手動設定":mode==="auto"?"自動更新":"未設定";modeLabel.className=`carryover-mode ${mode||"pending"}`;
  if(mode==="manual")note.textContent="手動設定が優先されています。自動更新に戻すこともできます。";
  else if(mode==="auto"&&updated)note.textContent=`${updateLabel||"給与日"}経過後の資産から自動更新（${new Date(updated).toLocaleString("ja-JP")}）${paydayStatus.next?`。次は${paydayStatus.next.name}の給与日後に再更新します`:""}`;
  else if(mode==="auto"&&paydayStatus.next)note.textContent=`自動更新を予約済みです。${paydayStatus.next.name}の${paydayStatus.next.date.toLocaleDateString("ja-JP")}の翌日以降に更新します。`;
  else if(!salaryPaydays().length)note.textContent="給与タブで振込日を設定すると、翌月分を自動更新します。";
  else if(paydayStatus.next)note.textContent=`${paydayStatus.next.name}の${paydayStatus.next.date.toLocaleDateString("ja-JP")}の翌日以降に、前月の資産から自動更新します。`;
}

function setFinanceTab(tab="transactions") { document.querySelectorAll("[data-finance-panel]").forEach(panel=>panel.hidden=panel.dataset.financePanel!==tab);document.querySelectorAll("[data-finance-tab]").forEach(button=>button.classList.toggle("active",button.dataset.financeTab===tab)); }
function nav(view) { const target=document.querySelector(`#${view}View`);if(!target)return false;document.querySelectorAll(".view").forEach(element=>element.classList.remove("active"));target.classList.add("active");document.querySelectorAll("[data-view]").forEach(button=>button.classList.toggle("active",button.dataset.view===view));document.querySelector(".topbar").classList.toggle("is-hidden",view!=="dashboard");document.body.dataset.activeView=view;pageTitle.textContent="ホーム";document.querySelector("main").scrollTo({top:0,behavior:"smooth"});return true; }
window.appNav = nav;
function options() { const type=document.querySelector('input[name="type"]:checked').value,keys=type==="income"?["salary","other"]:Object.keys(cats).filter(key=>key!=="salary");categoryInput.innerHTML=keys.map(key=>`<option value="${key}">${cats[key].name}</option>`).join(""); }
function openModal() { dateInput.value="";options();transactionModal.showModal();setTimeout(()=>amountInput.focus(),80); }

document.addEventListener("click", event => {
  const financeTab=event.target.closest("[data-finance-tab]")?.dataset.financeTab,go=event.target.closest("[data-go]")?.dataset.go,requestedView=event.target.closest("[data-view]")?.dataset.view;
  if(financeTab)setFinanceTab(financeTab);if(go==="transactions"||go==="budget"){nav("finances");setFinanceTab(go);}else if(requestedView)nav(requestedView);if(requestedView==="finances")setFinanceTab("transactions");
  const monthStep=event.target.closest("[data-finance-month-step]");if(monthStep)shiftMonth(Number(monthStep.dataset.financeMonthStep));
  if(event.target.closest("[data-open-modal]"))openModal();if(event.target.closest("[data-close]"))transactionModal.close();
  if(event.target.closest("[data-recurring-open]")){recurringForm.reset();recurringCategory.value="fixed";recurringDialog.showModal();}
  if(event.target.closest("[data-recurring-close]"))recurringDialog.close();
  const selectedFilter=event.target.closest("[data-filter]");if(selectedFilter){filter=selectedFilter.dataset.filter;document.querySelectorAll(".filter").forEach(button=>button.classList.toggle("active",button===selectedFilter));transactions();}
  const deletion=event.target.closest("[data-delete]");if(deletion&&confirm("この記録を削除しますか？")){state.transactions=state.transactions.filter(item=>item.id!==Number(deletion.dataset.delete));save();render();toast("記録を削除しました");}
  const recurringDeletion=event.target.closest("[data-delete-recurring]");if(recurringDeletion&&confirm("この定額支出を削除しますか？")){state.recurring=state.recurring.filter(item=>item.id!==Number(recurringDeletion.dataset.deleteRecurring));save();render();toast("定額支出を削除しました");}
  if(event.target.closest("[data-save-carryover]")){const input=document.querySelector("[data-carryover-input]");setCarryover(Number(input.value),state.month,"manual");toast("繰越金を手動設定しました");}
  if(event.target.closest("[data-use-auto-carryover]")){state.carryoverModes[state.month]="auto";delete state.carryoverUpdatedAt[state.month];delete state.carryoverUpdateKeys[state.month];delete state.carryoverUpdateLabels[state.month];updateAutomaticCarryover(state.month);save();render();toast("繰越金を自動更新に戻しました");}
});
document.querySelectorAll('input[name="type"]').forEach(radio=>radio.addEventListener("change",options));
transactionForm.addEventListener("submit",event=>{event.preventDefault();const amount=Number(amountInput.value);if(!amount)return;state.transactions.push({id:Date.now(),date:dateInput.value,type:document.querySelector('input[name="type"]:checked').value,category:categoryInput.value,amount,memo:memoInput.value.trim()});save();event.target.reset();transactionModal.close();render();toast("記録を追加しました");});
recurringForm.addEventListener("submit",event=>{event.preventDefault();const form=new FormData(event.target);state.recurring.push({id:Date.now(),name:String(form.get("name")||"").trim(),amount:Number(form.get("amount")),day:Number(form.get("day")),category:String(form.get("category")||"fixed")});save();recurringDialog.close();render();toast("定額支出を追加しました");});
monthPicker.addEventListener("change",event=>{state.month=event.target.value;state.assets=carryoverForMonth();monthBudgets();save();render();});
document.querySelector("[data-finance-month]").addEventListener("change",event=>{state.month=event.target.value;state.assets=carryoverForMonth();monthBudgets();save();render();});
document.querySelector("[data-carryover-input]").addEventListener("keydown",event=>{if(event.key!=="Enter")return;event.preventDefault();document.querySelector("[data-save-carryover]").click();});
saveBudget.addEventListener("click",()=>{const budgets=monthBudgets();document.querySelectorAll("[data-budget]").forEach(input=>budgets[input.dataset.budget]=Number(input.value));save();render();toast("予算を更新しました");});
resetButton.addEventListener("click",()=>{if(!confirm("家計・給与・資産・シート・学業データをすべて初期状態に戻しますか？"))return;state=normalizeState(null);window.ExpenceSalaryStore?.reset();window.ExpenceWorkspaceStore?.reset();window.ExpenceAcademicStore?.reset();save();render();toast("すべて0に戻しました");});
function upsertSalaryIncome(entry) {
  const amount=Math.max(0,Math.round(Number(entry?.amount)||0)),date=String(entry?.date||""),sourceId=String(entry?.sourceId||"");
  if(!amount||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!sourceId)return null;
  let transaction=state.transactions.find(item=>item.sourceId===sourceId),created=false;
  if(!transaction){transaction={id:Date.now(),sourceId};state.transactions.push(transaction);created=true;}
  Object.assign(transaction,{date,type:"income",category:"salary",amount,memo:String(entry.memo||"給与").slice(0,40)});
  save();render();return {created,transaction:structuredClone(transaction)};
}
window.ExpenceFinanceStore={snapshot:()=>structuredClone(state),transactions:()=>structuredClone(state.transactions),currentAssets:(month=state.month)=>currentAssetsForMonth(month),carryover:(month=state.month)=>carryoverForMonth(month),hasCarryover:(month=state.month)=>Object.hasOwn(state.carryoversByMonth,month),selectedMonth:()=>state.month,setCarryover:(amount,month=state.month,mode="manual",skipSync=false)=>setCarryover(amount,month,mode,skipSync),upsertSalaryIncome,rerender:render,restore:value=>{state=normalizeState(value);save(true);render();},reset:()=>{state=normalizeState(null);save(true);render();}};
document.body.dataset.activeView="dashboard";
render();
