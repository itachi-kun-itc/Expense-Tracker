const KEY = "expence-tracker-v2";
const iconPaths = {
  home:'<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10M9.5 20v-6h5v6"/>',
  transfer:'<path d="M7 3v18m0-18L3.5 6.5M7 3l3.5 3.5M17 21V3m0 18-3.5-3.5M17 21l3.5-3.5"/>',
  target:'<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3.5"/>',
  chart:'<path d="M4 19V5m0 14h16"/><path d="m7 15 3-4 3 2 5-7"/>',
  cloud:'<path d="M7 18h10a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.2 8.3 4.5 4.5 0 0 0 7 18Z"/><path d="m9 14 2 2 4-4"/>',
  user:'<circle cx="12" cy="8" r="3.5"/><path d="M5 20c.7-4 3-6 7-6s6.3 2 7 6"/>',
  settings:'<path d="M4 7h10m4 0h2M4 17h2m4 0h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
  eye:'<path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6S2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="2.5"/>',
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
  ,card:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 9h18M7 15h4"/>'
};
const icon = name => `<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${iconPaths[name] || iconPaths.other}</svg>`;
window.uiIcon = icon;
document.querySelectorAll("[data-icon]").forEach(element => element.innerHTML = icon(element.dataset.icon));

const cats = {
  food:{name:"食費",icon:icon("food"),color:"#d66f63",bg:"#fceceb"}, transport:{name:"交通費",icon:icon("transport"),color:"#de8061",bg:"#feeee8"},
  hobby:{name:"趣味・娯楽",icon:icon("hobby"),color:"#735fc0",bg:"#f0ecfb"}, daily:{name:"日用品",icon:icon("daily"),color:"#c99b36",bg:"#fcf4dc"},
  fixed:{name:"固定費",icon:icon("fixed"),color:"#568fb7",bg:"#e8f3fa"}, school:{name:"大学・学習",icon:icon("school"),color:"#5267c9",bg:"#edf0ff"},
  salary:{name:"給与",icon:icon("salary"),color:"#5267c9",bg:"#edf0ff"}, card:{name:"カード",icon:icon("card"),color:"#596b98",bg:"#eef1f8"}, other:{name:"その他",icon:icon("other"),color:"#7c8493",bg:"#f0f2f5"}
};
const localToday = new Date().toLocaleDateString("sv-SE"), currentMonth = localToday.slice(0,7);
function parseMoney(value) {
  const normalized=String(value??"").replace(/,/g,"").replace(/[^\d-]/g,"");
  if(!normalized||normalized==="-")return 0;
  return Number(normalized)||0;
}
function formatMoneyInput(value) {
  const raw=String(value??"").replace(/,/g,"").trim();
  if(!raw)return "";
  const negative=raw.startsWith("-"),digits=raw.replace(/\D/g,"");
  if(!digits)return negative?"-":"";
  return `${negative?"-":""}${Number(digits).toLocaleString("ja-JP")}`;
}
window.ExpenceMoney={parse:parseMoney,formatInput:formatMoneyInput};
document.addEventListener("input",event=>{
  const input=event.target.closest?.("[data-money-input]");
  if(!input)return;
  const formatted=formatMoneyInput(input.value);
  if(input.value===formatted)return;
  input.value=formatted;
  input.setSelectionRange?.(formatted.length,formatted.length);
});
const budgetTemplate = () => Object.fromEntries(Object.keys(cats).filter(key => key !== "salary").map(key => [key,0]));
const initial = { month:currentMonth, assets:0, previousBalance:0, scheduledBills:0, budgets:budgetTemplate(), budgetsByMonth:{}, carryoversByMonth:{}, carryoverModes:{}, carryoverUpdatedAt:{}, carryoverUpdateKeys:{}, carryoverUpdateLabels:{}, recurring:[], transactions:[], cardHistory:[], cardRecurring:[] };
let state = load(), filter = "all";
const cardMemoDialog=document.createElement("dialog");cardMemoDialog.id="cardMemoDialog";cardMemoDialog.innerHTML=`<form method="dialog" id="cardMemoForm"><div class="modal-head"><div><p class="eyebrow">CARD MEMO</p><h2>カード履歴を追加</h2></div><button type="button" class="close-btn" data-card-close>← 戻る</button></div><div class="form-grid"><label data-card-date-field>利用日（サブスク等は入力する必要がありません）<input id="cardDateInput" name="date" type="date" required></label><label>金額<input name="amount" type="text" inputmode="numeric" data-money-input required placeholder="3,000"></label></div><label>メモ<input name="memo" type="text" maxlength="60" placeholder="動画配信サービス"></label><label class="card-recurring-option"><input type="checkbox" name="recurring"><span><b>毎月自動的に記録する</b><small>表示中の月から毎月記録</small></span></label><label class="card-recurring-option card-all-periods-option" data-card-all-periods hidden><input type="checkbox" name="allPeriods"><span><b>全期間に適用する</b><small>過去の月を開いた場合も自動記録</small></span></label><button class="primary-btn wide">保存する</button></form>`;document.body.appendChild(cardMemoDialog);const cardMemoForm=cardMemoDialog.querySelector("form"),cardDateInput=cardMemoDialog.querySelector("#cardDateInput"),cardRecurringInput=cardMemoDialog.querySelector('[name="recurring"]'),cardAllPeriodsInput=cardMemoDialog.querySelector('[name="allPeriods"]'),cardAllPeriodsField=cardMemoDialog.querySelector("[data-card-all-periods]"),cardDateField=cardMemoDialog.querySelector("[data-card-date-field]");
const recurringDeleteDialog=document.createElement("dialog");recurringDeleteDialog.id="recurringDeleteDialog";recurringDeleteDialog.innerHTML=`<form method="dialog"><div class="modal-head"><div><p class="eyebrow">SUBSCRIPTION</p><h2>定期記録を削除</h2></div><button type="button" class="close-btn" data-recurring-delete-close>← 戻る</button></div><p class="recurring-delete-note" data-recurring-delete-note></p><div class="recurring-delete-options"><button type="button" data-recurring-delete-scope="month"><b>今月のみ削除</b><small>この月の記録だけを削除</small></button><button type="button" data-recurring-delete-scope="future"><b>今月以降を削除</b><small>この月から先の自動記録を停止</small></button><button type="button" data-recurring-delete-scope="all"><b>全期間を削除</b><small>過去を含むすべての記録を削除</small></button></div></form>`;document.body.appendChild(recurringDeleteDialog);let pendingRecurringDelete=null;recurringDeleteDialog.addEventListener("close",()=>{pendingRecurringDelete=null;});
function updateCardDateField(){const recurring=cardRecurringInput.checked;cardDateField.hidden=recurring;cardAllPeriodsField.hidden=!recurring;cardDateInput.required=!recurring;cardMemoForm.querySelector(".form-grid").classList.toggle("is-recurring",recurring);if(recurring)cardDateInput.value="";else cardAllPeriodsInput.checked=false;}
function focusDateInputOnMonth(input,month){const [year,value]=String(month).split("-").map(Number),lastDay=new Date(year,value,0).getDate();input.min=`${month}-01`;input.max=`${month}-${String(lastDay).padStart(2,"0")}`;}
function clearDateInputMonth(input){input.removeAttribute("min");input.removeAttribute("max");}
const yen = value => `${value < 0 ? "−" : ""}${Math.abs(Math.round(value || 0)).toLocaleString("ja-JP")}円`;
const dateLabel = date => new Intl.DateTimeFormat("ja-JP",{month:"short",day:"numeric"}).format(new Date(`${date}T00:00:00`));
const escapeHtml = value => String(value ?? "").replace(/[&<>\"]/g, character => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[character]));

function normalizeState(value) {
  const result = { ...structuredClone(initial), ...(value || {}) };
  result.transactions = Array.isArray(result.transactions) ? result.transactions : [];
  result.recurring = Array.isArray(result.recurring) ? result.recurring : [];
  result.cardHistory = Array.isArray(result.cardHistory) ? result.cardHistory : [];
  result.cardRecurring = Array.isArray(result.cardRecurring) ? result.cardRecurring : [];
  if(result.recurring.length){result.recurring.forEach(item=>{const id=`legacy-fixed-${item.id}`;if(result.cardRecurring.some(entry=>String(entry.id)===id))return;result.cardRecurring.push({id,startMonth:result.month||currentMonth,day:Math.min(31,Math.max(1,Number(item.day)||1)),cardName:String(item.name||"定額引き落とし"),amount:Math.max(0,Number(item.amount)||0),memo:"定額引き落とし",active:true,skippedMonths:[]});});result.recurring=[];}
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
function assetsAsOf(date=localToday) {
  const target=String(date),targetMonth=target.slice(0,7),manualMonth=Object.keys(state.carryoversByMonth).filter(month=>/^\d{4}-\d{2}$/.test(month)&&month<=targetMonth&&state.carryoverModes[month]==="manual").sort().at(-1)||"";
  const base=manualMonth?carryoverForMonth(manualMonth):0,start=manualMonth?`${manualMonth}-01`:"";
  return base+state.transactions.filter(item=>/^\d{4}-\d{2}-\d{2}$/.test(String(item.date))&&String(item.date)<=target&&(!start||String(item.date)>=start)).reduce((sum,item)=>sum+(item.type==="income"?1:-1)*Number(item.amount||0),0);
}
function spent(key) { return items().filter(item=>item.type==="expense"&&item.category===key).reduce((sum,item)=>sum+Number(item.amount||0),0); }
function recurringTotal() { return state.recurring.reduce((sum,item)=>sum+Number(item.amount||0),0); }
function salaryPaydays() {
  try { const salary=JSON.parse(localStorage.getItem("expence-tracker-salary-v1")||"null");return Array.isArray(salary?.jobs)?salary.jobs.filter(job=>job.status!=="retired"&&Number(job.payday)>0).map(job=>({id:Number(job.id)||String(job.name||"給与"),name:String(job.name||"給与"),day:Math.min(31,Math.max(1,Number(job.payday)||25))})):[]; }
  catch { return []; }
}
function salarySchedule(month) {
  const stored=window.ExpenceSalaryStore?.paymentSchedule?.(month);if(Array.isArray(stored))return stored.map(item=>({...item,date:new Date(`${item.date}T12:00:00`)})).sort((a,b)=>a.date-b.date||String(a.id).localeCompare(String(b.id)));
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
  const month=now.toLocaleDateString("sv-SE").slice(0,7),rows=[...salarySchedule(month),...salarySchedule(monthOffset(month,1)),...salarySchedule(monthOffset(month,2))].filter(item=>item.date>=now);return rows.map(item=>({...item,days:Math.ceil((item.date-now)/86400000)})).sort((a,b)=>a.date-b.date||String(a.id).localeCompare(String(b.id)));
}
function toast(message="保存しました") { const element=document.querySelector("#toast"); element.textContent=message;element.classList.add("show");setTimeout(()=>element.classList.remove("show"),1800); }
function shiftMonth(offset) { const [year,month]=state.month.split("-").map(Number), date=new Date(year,month-1+offset,1);state.month=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}`;state.assets=carryoverForMonth();monthBudgets();save();render(); }

function render() { if(refreshAutomaticCarryovers())save();prepareCardHistory();header();dashboard();transactions();renderCardHistory();renderExpenseBreakdown();window.dispatchEvent(new Event("expence-finance-render")); }
function header() {
  const [year,month]=state.month.split("-"),lastDay=new Date(Number(year),Number(month),0).getDate(),monthLabel=`${year}年${+month}月度`,salaryPeriod=window.ExpenceSalaryStore?.periodForMonth?.(state.month),shortPeriodDate=value=>`${Number(String(value).slice(5,7))}/${Number(String(value).slice(8,10))}`,periodLabel=salaryPeriod?.start&&salaryPeriod?.end?`${shortPeriodDate(salaryPeriod.start)}-${shortPeriodDate(salaryPeriod.end)}`:`${+month}/1-${+month}/${lastDay}`; monthPicker.value=state.month; todayLabel.textContent=`${year}年 ${+month}月のマネーレポート`;
  document.querySelectorAll("[data-finance-month],[data-card-month]").forEach(input=>input.value=state.month);
  document.querySelectorAll("[data-finance-month-label],[data-card-month-label]").forEach(label=>label.textContent=monthLabel);
  document.querySelectorAll("[data-finance-month-period],[data-card-month-period]").forEach(label=>label.textContent=periodLabel);
}
function dashboard() {
  const todayMonth=localToday.slice(0,7),rows=monthRows(todayMonth),{income,expense}=totalsForMonth(todayMonth),salaryTotal=rows.filter(item=>item.type==="income"&&item.category==="salary").reduce((sum,item)=>sum+Number(item.amount||0),0);
  const assetTotal=assetsAsOf(localToday);
  const threshold=localToday,includeThreshold=false;
  const calculatedSalary=window.ExpenceSalaryStore?.nextPayForecast?.(localToday)||null;
  const salaryRows=state.transactions.filter(item=>item.type==="income"&&item.category==="salary"&&String(item.date)>=threshold).sort((a,b)=>String(a.date).localeCompare(String(b.date))||Number(a.id)-Number(b.id)),nextSalary=salaryRows[0],configuredPayday=!calculatedSalary&&!nextSalary&&state.month===todayMonth?nextSalaryDates().sort((a,b)=>a.date-b.date)[0]:null,nextDate=calculatedSalary?.date||nextSalary?.date||configuredPayday?.date?.toLocaleDateString("sv-SE")||"";
  const forecastRows=!calculatedSalary&&nextDate?state.transactions.filter(item=>(includeThreshold?String(item.date)>=threshold:String(item.date)>threshold)&&String(item.date)<=nextDate):[],forecast=assetTotal+(calculatedSalary?Number(calculatedSalary.amount||0):forecastRows.reduce((sum,item)=>sum+(item.type==="income"?1:-1)*Number(item.amount||0),0));
  const fallbackWorkplace=salaryWorkplaceName(),salaryName=calculatedSalary?.name||configuredPayday?.name||String(nextSalary?.memo||"").replace(/\s*給与$/,"")||fallbackWorkplace;
  dashboardAssetTotal.textContent=yen(assetTotal);dashboardAssetAsOf.textContent=new Intl.DateTimeFormat("ja-JP",{year:"numeric",month:"long",day:"numeric"}).format(new Date(`${localToday}T12:00:00`));
  dashboardForecastValue.textContent=yen(nextDate?forecast:assetTotal);dashboardForecastDate.textContent=nextDate?`${salaryName}の給料日・${dateLabel(nextDate)}`:`${fallbackWorkplace}の給料日`;dashboardSalaryTotal.textContent=yen(salaryTotal);dashboardIncomeTotal.textContent=yen(income);dashboardExpenseTotal.textContent=yen(expense);
  dashboardIncomeCategories.innerHTML=categorySummary(rows,"income");dashboardExpenseCategories.innerHTML=categorySummary(rows,"expense");
}
function salaryWorkplaceName() { try { const salary=JSON.parse(localStorage.getItem("expence-tracker-salary-v1")||"null"),jobs=Array.isArray(salary?.jobs)?salary.jobs:[];return String(jobs.find(job=>job.status!=="retired")?.name||jobs[0]?.name||"勤務先1"); } catch { return "勤務先1"; } }
function categorySummary(rows,type) {
  const grouped=rows.filter(item=>item.type===type).reduce((result,item)=>{const key=cats[item.category]?item.category:"other";result[key]=(result[key]||0)+Number(item.amount||0);return result;},{}),values=Object.entries(grouped).sort((a,b)=>b[1]-a[1]);
  return values.length?values.map(([key,value])=>{const category=cats[key]||cats.other;return `<div class="home-category-row"><span class="category-icon" style="background:${category.bg};color:${category.color}">${category.icon}</span><span>${category.name}</span><strong>${yen(value)}</strong></div>`;}).join(""):'<p class="home-category-empty">記録はありません</p>';
}
function activity(item) { const category=cats[item.category]||cats.other;return `<div class="activity"><span class="activity-icon" style="background:${category.bg};color:${category.color}">${category.icon}</span><div><p>${escapeHtml(item.memo||category.name)}</p><small>${dateLabel(item.date)} ・ ${category.name}</small></div><b class="${item.type==='income'?'positive':''}">${item.type==='income'?'+':'−'}${yen(item.amount)}</b></div>`; }
function week() { const days=[];for(let index=6;index>=0;index--){const date=new Date();date.setHours(12,0,0,0);date.setDate(date.getDate()-index);const iso=date.toLocaleDateString("sv-SE");days.push({label:date.getDate()+"日",value:state.transactions.filter(item=>item.date===iso&&item.type==="expense").reduce((sum,item)=>sum+item.amount,0)});}const max=Math.max(...days.map(day=>day.value),1);weekChart.innerHTML=days.map(day=>`<div class="chart-column"><i data-value="${yen(day.value)}" style="height:${Math.max(3,day.value/max*82)}%"></i><span>${day.label}</span></div>`).join(""); }
function transactions() {
  let rows=[...items()].sort((a,b)=>b.date.localeCompare(a.date)||b.id-a.id);if(filter!=="all")rows=rows.filter(item=>item.type===filter);
  transactionTable.innerHTML='<div class="tx-row header"><span>日付</span><span>内容</span><span>カテゴリ</span><span>金額</span><span></span></div>'+(rows.map(item=>{const category=cats[item.category]||cats.other,automatic=Boolean(item.sourceId);return `<div class="tx-row"><span>${dateLabel(item.date)}</span><div><b>${escapeHtml(item.memo||category.name)}</b></div><span class="tx-category">${category.name}</span><b class="${item.type==='income'?'positive':''}">${item.type==='income'?'+':'−'}${yen(item.amount)}</b>${automatic?'<span class="tx-auto">自動</span>':`<div class="tx-actions"><button data-edit="${item.id}" aria-label="編集">編集</button><button data-delete="${item.id}" aria-label="削除">削除</button></div>`}</div>`}).join("")||'<p class="empty">この月の記録はありません</p>');
}
function renderExpenseBreakdown() {
  const monthTotal=totals(),expenses=items().filter(item=>item.type==="expense"),total=expenses.reduce((sum,item)=>sum+Number(item.amount||0),0),values=Object.keys(cats).filter(key=>key!=="salary").map(key=>({key,value:expenses.filter(item=>item.category===key).reduce((sum,item)=>sum+Number(item.amount||0),0)})).filter(item=>item.value>0).sort((a,b)=>b.value-a.value);
  const hasFlow=monthTotal.income>0||monthTotal.expense>0,expensePercent=monthTotal.expense<=0?0:monthTotal.income<=0||monthTotal.balance<0?100:Math.min(100,monthTotal.expense/monthTotal.income*100),incomePercent=hasFlow?100-expensePercent:0,pieBackground=!hasFlow?"#e9edf5":`conic-gradient(#d86f68 0 ${expensePercent}%,#5f7fc8 ${expensePercent}% 100%)`;
  expenseBreakdown.innerHTML=`<div class="expense-pie-wrap"><div class="expense-total" style="background:${pieBackground}"><small>収入－支出</small><b>${yen(monthTotal.balance)}</b></div><div class="expense-pie-legend"><span><i class="income"></i>収入 ${Math.round(incomePercent)}%</span><span><i class="expense"></i>支出 ${Math.round(expensePercent)}%</span></div></div>${values.length?`<div class="expense-ratio-list">${values.map(item=>{const category=cats[item.key],percent=Math.round(item.value/total*100);return `<div><span>${category.name}</span><div class="ratio-bar"><i style="width:${percent}%;background:${category.color}"></i></div><b>${percent}%</b><small>${yen(item.value)}</small></div>`}).join("")}</div>`:'<p class="salary-empty">この月の支出はありません</p>'}`;
}
function renderCardHistory() {
  const list=document.querySelector("#cardHistoryList"),monthInput=document.querySelector("[data-card-month]");if(!list)return;if(monthInput)monthInput.value=state.month;
  const rows=state.cardHistory.filter(item=>String(item.date).startsWith(state.month)).sort((a,b)=>String(b.date).localeCompare(String(a.date))||Number(b.id)-Number(a.id));
  list.innerHTML=rows.length?rows.map(item=>`<article class="card-history-row"><div><span class="card-history-date">${item.recurringId?"サブスク":dateLabel(item.date)}</span><b>カード</b><small>${escapeHtml(item.memo||"メモなし")}</small></div><strong>${yen(item.amount)}</strong><button type="button" data-delete-card-history="${item.id}" aria-label="カード履歴を削除">削除</button></article>`).join(""):'<p class="empty">この月のカード履歴はありません</p>';
}
function prepareCardHistory() { const currentChanged=ensureRecurringCardHistory(currentMonth),selectedChanged=state.month===currentMonth?false:ensureRecurringCardHistory(state.month),expenseChanged=syncCardExpenses();if(currentChanged||selectedChanged||expenseChanged)save(); }
function ensureRecurringCardHistory(month) {
  let changed=false;state.cardRecurring.filter(item=>item.active!==false&&(!item.endMonth||month<=item.endMonth)&&(item.allPeriods||String(item.startMonth)<=month)).forEach(item=>{const targets=[];if(item.allPeriods)targets.push(month);else for(let target=String(item.startMonth);target<=month;target=monthOffset(target,1))targets.push(target);targets.filter(target=>!item.endMonth||target<=item.endMonth).forEach(target=>{if((item.skippedMonths||[]).includes(target))return;const sourceId=`card-recurring:${item.id}:${target}`;if(state.cardHistory.some(row=>row.sourceId===sourceId))return;const [year,value]=target.split("-").map(Number),lastDay=new Date(year,value,0).getDate();state.cardHistory.push({id:Date.now()+Math.floor(Math.random()*100000),sourceId,recurringId:item.id,date:`${target}-${String(Math.min(lastDay,Math.max(1,Number(item.day)||1))).padStart(2,"0")}`,cardName:item.cardName,amount:item.amount,memo:item.memo});changed=true;});});return changed;
}
function openRecurringDelete(row){pendingRecurringDelete={recurringId:row.recurringId,month:String(row.date).slice(0,7)};recurringDeleteDialog.querySelector("[data-recurring-delete-note]").textContent=`${row.memo||"サブスク"}・${pendingRecurringDelete.month.replace("-","年")}月`;recurringDeleteDialog.showModal();}
function deleteRecurring(scope){if(!pendingRecurringDelete)return;const {recurringId,month}=pendingRecurringDelete,recurring=state.cardRecurring.find(item=>String(item.id)===String(recurringId));if(!recurring)return;if(scope==="month"){recurring.skippedMonths=[...new Set([...(recurring.skippedMonths||[]),month])];state.cardHistory=state.cardHistory.filter(item=>String(item.recurringId)!==String(recurringId)||String(item.date).slice(0,7)!==month);}else if(scope==="future"){recurring.endMonth=monthOffset(month,-1);state.cardHistory=state.cardHistory.filter(item=>String(item.recurringId)!==String(recurringId)||String(item.date).slice(0,7)<month);}else if(scope==="all"){state.cardRecurring=state.cardRecurring.filter(item=>String(item.id)!==String(recurringId));state.cardHistory=state.cardHistory.filter(item=>String(item.recurringId)!==String(recurringId));}pendingRecurringDelete=null;recurringDeleteDialog.close();save();render();toast(scope==="month"?"今月の記録を削除しました":scope==="future"?"今月以降の記録を削除しました":"全期間の記録を削除しました");}
function syncCardExpenses() {
  let changed=false;const validSources=new Set();state.cardHistory.forEach(item=>{const month=String(item.date||"").slice(0,7);if(!/^\d{4}-\d{2}$/.test(month))return;const billingMonth=monthOffset(month,1),[year,value]=billingMonth.split("-").map(Number),date=`${billingMonth}-${String(new Date(year,value,0).getDate()).padStart(2,"0")}`,sourceId=`card-history:${item.id}`;validSources.add(sourceId);let row=state.transactions.find(transaction=>transaction.sourceId===sourceId);if(!row){row={id:Date.now()+Math.floor(Math.random()*100000),sourceId};state.transactions.push(row);changed=true;}const next={date,type:"expense",category:"card",amount:Math.max(0,Number(item.amount)||0),memo:"カード"};if(Object.keys(next).some(key=>row[key]!==next[key])){Object.assign(row,next);changed=true;}});const before=state.transactions.length;state.transactions=state.transactions.filter(item=>!String(item.sourceId||"").startsWith("card-history:")||validSources.has(item.sourceId));return changed||state.transactions.length!==before;
}
function assets() { const {balance}=totals(),current=currentAssetsForMonth(),fixed=Number(state.scheduledBills||0)+recurringTotal(),salaries=Array(6).fill(0);let value=current;const values=[value,...salaries.map(salary=>value+=salary-fixed)],labels=["現在","1か月","2か月","3か月","4か月","5か月","6か月"],min=Math.min(...values),max=Math.max(...values),range=Math.max(max-min,1),width=620,height=180,padding=18,points=values.map((number,index)=>`${padding+index*(width-padding*2)/(values.length-1)},${height-padding-(number-min)/range*(height-padding*2)}`).join(" ");assetTotal.textContent=yen(current);assetChange.textContent=yen(balance);assetChart.innerHTML=`<svg viewBox="0 0 ${width} ${height}" role="img"><defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#aebbf5" stop-opacity=".45"/><stop offset="1" stop-color="#aebbf5" stop-opacity="0"/></linearGradient></defs><polygon points="${padding},${height-padding} ${points} ${width-padding},${height-padding}" fill="url(#area)"/><polyline points="${points}" fill="none" stroke="#5267c9" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>${points.split(" ").map((point,index)=>{const[x,y]=point.split(",");return `<circle cx="${x}" cy="${y}" r="4" fill="#fff" stroke="#5267c9" stroke-width="3"/><text x="${x}" y="${height-2}" text-anchor="middle" font-size="9" fill="#7b8495">${labels[index]}</text>`}).join("")}</svg>`; }
function renderCarryover() {
  const input=document.querySelector("[data-carryover-input]"),monthLabel=document.querySelector("[data-carryover-month]"),modeLabel=document.querySelector("[data-carryover-mode]"),note=document.querySelector("[data-carryover-note]");if(!input)return;
  const [year,month]=state.month.split("-").map(Number),mode=state.carryoverModes[state.month],previous=monthOffset(state.month,-1),paydayStatus=carryoverPaydayStatus(previous),updated=state.carryoverUpdatedAt[state.month],updateLabel=state.carryoverUpdateLabels[state.month];
  input.dataset.moneyInput="";input.inputMode="numeric";input.value=formatMoneyInput(carryoverForMonth()||"");input.placeholder="500,000";monthLabel.textContent=`${year}年${month}月の開始時点`;modeLabel.textContent=mode==="manual"?"手動設定":mode==="auto"?"自動更新":"未設定";modeLabel.className=`carryover-mode ${mode||"pending"}`;
  if(mode==="manual")note.textContent="手動設定が優先されています。自動更新に戻すこともできます。";
  else if(mode==="auto"&&updated)note.textContent=`${updateLabel||"給与日"}経過後の資産から自動更新（${new Date(updated).toLocaleString("ja-JP")}）${paydayStatus.next?`。次は${paydayStatus.next.name}の給与日後に再更新します`:""}`;
  else if(mode==="auto"&&paydayStatus.next)note.textContent=`自動更新を予約済みです。${paydayStatus.next.name}の${paydayStatus.next.date.toLocaleDateString("ja-JP")}の翌日以降に更新します。`;
  else if(!salaryPaydays().length)note.textContent="給与タブで振込日を設定すると、翌月分を自動更新します。";
  else if(paydayStatus.next)note.textContent=`${paydayStatus.next.name}の${paydayStatus.next.date.toLocaleDateString("ja-JP")}の翌日以降に、前月の資産から自動更新します。`;
}

function setFinanceTab(tab="transactions") { document.querySelectorAll("[data-finance-panel]").forEach(panel=>panel.hidden=panel.dataset.financePanel!==tab);document.querySelectorAll("[data-finance-tab]").forEach(button=>button.classList.toggle("active",button.dataset.financeTab===tab)); }
function nav(view) { const target=document.querySelector(`#${view}View`);if(!target)return false;const previous=document.body.dataset.activeView;if(previous!==view&&["dashboard","finances","cards"].includes(view)&&state.month!==currentMonth){state.month=currentMonth;state.assets=carryoverForMonth(currentMonth);monthBudgets();save();render();}document.querySelectorAll(".view").forEach(element=>element.classList.remove("active"));target.classList.add("active");document.querySelectorAll("[data-view]").forEach(button=>button.classList.toggle("active",button.dataset.view===view));document.querySelector(".topbar").classList.add("is-hidden");document.body.dataset.activeView=view;pageTitle.textContent="";document.querySelector("main").scrollTo({top:0,behavior:"smooth"});return true; }
window.appNav = nav;
function options() { const type=document.querySelector('input[name="type"]:checked').value,keys=type==="income"?["salary","other"]:Object.keys(cats).filter(key=>key!=="salary");categoryInput.innerHTML=keys.map(key=>`<option value="${key}">${cats[key].name}</option>`).join(""); }
let editingTransactionId=null;
function openModal(item=null) {
  transactionForm.reset();editingTransactionId=item?Number(item.id):null;
  document.querySelector("[data-transaction-eyebrow]").textContent=item?"EDIT RECORD":"NEW RECORD";
  document.querySelector("[data-transaction-title]").textContent=item?"入出金を編集":"入出金を記録";
  document.querySelector("[data-transaction-submit]").textContent=item?"変更を保存":"保存する";
  if(item){clearDateInputMonth(dateInput);document.querySelector(`input[name="type"][value="${item.type}"]`).checked=true;amountInput.value=formatMoneyInput(item.amount);dateInput.value=item.date;memoInput.value=item.memo||"";}else{dateInput.value="";focusDateInputOnMonth(dateInput,state.month);}
  options();if(item&&[...categoryInput.options].some(option=>option.value===item.category))categoryInput.value=item.category;
  transactionModal.showModal();setTimeout(()=>amountInput.focus(),80);
}
function closeTransactionModal(){editingTransactionId=null;transactionForm.reset();transactionModal.close();}

document.addEventListener("click", event => {
  const financeTab=event.target.closest("[data-finance-tab]")?.dataset.financeTab,go=event.target.closest("[data-go]")?.dataset.go,requestedView=event.target.closest("[data-view]")?.dataset.view;
  if(financeTab)setFinanceTab(financeTab);if(go==="transactions"||go==="budget"){nav("finances");setFinanceTab(go);}else if(requestedView)nav(requestedView);if(requestedView==="finances")setFinanceTab("transactions");
  const monthStep=event.target.closest("[data-finance-month-step]");if(monthStep)shiftMonth(Number(monthStep.dataset.financeMonthStep));
  const cardMonthStep=event.target.closest("[data-card-month-step]");if(cardMonthStep)shiftMonth(Number(cardMonthStep.dataset.cardMonthStep));
  if(event.target.closest("[data-open-modal]"))openModal();if(event.target.closest("[data-close]"))closeTransactionModal();
  if(event.target.closest("[data-open-card-modal]")){cardMemoForm.reset();cardDateInput.value="";focusDateInputOnMonth(cardDateInput,state.month);updateCardDateField();cardMemoDialog.showModal();}
  if(event.target.closest("[data-card-close]"))cardMemoDialog.close();
  const selectedFilter=event.target.closest("[data-filter]");if(selectedFilter){filter=selectedFilter.dataset.filter;document.querySelectorAll(".filter").forEach(button=>button.classList.toggle("active",button===selectedFilter));transactions();}
  const editButton=event.target.closest("[data-edit]");if(editButton){const item=state.transactions.find(row=>row.id===Number(editButton.dataset.edit));if(item&&!item.sourceId)openModal(item);}
  const deletion=event.target.closest("[data-delete]");if(deletion&&confirm("この記録を削除しますか？")){state.transactions=state.transactions.filter(item=>item.id!==Number(deletion.dataset.delete));save();render();toast("記録を削除しました");}
  const cardDeletion=event.target.closest("[data-delete-card-history]");if(cardDeletion){const id=Number(cardDeletion.dataset.deleteCardHistory),row=state.cardHistory.find(item=>item.id===id);if(row?.recurringId)openRecurringDelete(row);else if(row&&confirm("この月のカード履歴を削除しますか？")){state.cardHistory=state.cardHistory.filter(item=>item.id!==id);save();render();toast("カード履歴を削除しました");}}
  const recurringDeleteScope=event.target.closest("[data-recurring-delete-scope]")?.dataset.recurringDeleteScope;if(recurringDeleteScope)deleteRecurring(recurringDeleteScope);
  if(event.target.closest("[data-recurring-delete-close]")){pendingRecurringDelete=null;recurringDeleteDialog.close();}
  if(event.target.closest("[data-save-carryover]")){const input=document.querySelector("[data-carryover-input]");setCarryover(parseMoney(input.value),state.month,"manual");toast("繰越金を手動設定しました");}
  if(event.target.closest("[data-use-auto-carryover]")){state.carryoverModes[state.month]="auto";delete state.carryoverUpdatedAt[state.month];delete state.carryoverUpdateKeys[state.month];delete state.carryoverUpdateLabels[state.month];updateAutomaticCarryover(state.month);save();render();toast("繰越金を自動更新に戻しました");}
});
document.querySelectorAll('input[name="type"]').forEach(radio=>radio.addEventListener("change",options));
transactionForm.addEventListener("submit",event=>{event.preventDefault();const amount=parseMoney(amountInput.value),date=dateInput.value;if(!amount||!date)return;const next={date,type:document.querySelector('input[name="type"]:checked').value,category:categoryInput.value,amount,memo:memoInput.value.trim()},editing=editingTransactionId!==null,item=editing?state.transactions.find(row=>row.id===editingTransactionId):null;if(item&&!item.sourceId)Object.assign(item,next);else state.transactions.push({id:Date.now(),...next});state.month=date.slice(0,7);state.assets=carryoverForMonth(state.month);monthBudgets();save();closeTransactionModal();render();toast(editing?"記録を更新しました":"記録を追加しました");});
cardRecurringInput.addEventListener("change",updateCardDateField);
cardMemoForm.addEventListener("submit",event=>{event.preventDefault();const form=new FormData(event.target),recurring=form.get("recurring")==="on",allPeriods=recurring&&form.get("allPeriods")==="on",date=recurring?`${state.month}-01`:String(form.get("date")||""),amount=parseMoney(form.get("amount")),cardName="カード",memo=String(form.get("memo")||"").trim();if(!date||!amount)return;if(recurring){state.cardRecurring.push({id:Date.now(),startMonth:state.month,day:1,cardName,amount,memo,allPeriods,active:true,skippedMonths:[]});}else state.cardHistory.push({id:Date.now(),date,cardName,amount,memo});state.month=date.slice(0,7);save();cardMemoDialog.close();render();toast(recurring?(allPeriods?"全期間の自動記録を設定しました":"毎月の自動記録を設定しました"):"カード履歴を追加しました");});
monthPicker.addEventListener("change",event=>{state.month=event.target.value;state.assets=carryoverForMonth();monthBudgets();save();render();});
document.querySelector("[data-finance-month]").addEventListener("change",event=>{state.month=event.target.value;state.assets=carryoverForMonth();monthBudgets();save();render();});
document.querySelector("[data-card-month]").addEventListener("change",event=>{state.month=event.target.value;state.assets=carryoverForMonth();monthBudgets();save();render();});
document.querySelector("[data-carryover-input]")?.addEventListener("keydown",event=>{if(event.key!=="Enter")return;event.preventDefault();document.querySelector("[data-save-carryover]")?.click();});
resetButton.addEventListener("click",async()=>{if(!confirm("勤務先・給与明細を含む、アプリ内のすべてのデータを初期化しますか？"))return;resetButton.disabled=true;try{state=normalizeState(null);window.ExpenceWorkspaceStore?.reset();window.ExpenceAcademicStore?.reset();await window.ExpenceSalaryStore?.reset({deleteFiles:true});localStorage.removeItem("expence-tracker-app-mode-v1");save();render();window.appNav?.("dashboard");toast("すべてのデータを初期化しました");}finally{resetButton.disabled=false;}});
function upsertSalaryIncome(entry) {
  const amount=Math.max(0,Math.round(Number(entry?.amount)||0)),date=String(entry?.date||""),sourceId=String(entry?.sourceId||"");
  if(!amount||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!sourceId)return null;
  let transaction=state.transactions.find(item=>item.sourceId===sourceId),created=false;
  if(!transaction&&entry?.legacySourcePrefix)transaction=state.transactions.find(item=>String(item.sourceId||"").startsWith(String(entry.legacySourcePrefix))&&String(item.date||"").startsWith(date.slice(0,7)));
  if(!transaction){transaction={id:Date.now(),sourceId};state.transactions.push(transaction);created=true;}
  Object.assign(transaction,{sourceId,date,type:"income",category:"salary",amount,memo:String(entry.memo||"給与").slice(0,40)});
  if(entry?.legacySourcePrefix)state.transactions=state.transactions.filter(item=>item===transaction||!(String(item.sourceId||"").startsWith(String(entry.legacySourcePrefix))&&String(item.date||"").startsWith(date.slice(0,7))));
  if(entry?.selectMonth!==false){state.month=date.slice(0,7);state.assets=carryoverForMonth(state.month);monthBudgets();}
  save();render();return {created,transaction:structuredClone(transaction)};
}
function removeSalaryIncome(sourceId,legacySourcePrefix="",month="") {
  const before=state.transactions.length;
  state.transactions=state.transactions.filter(item=>item.sourceId!==String(sourceId||"")&&!(legacySourcePrefix&&String(item.sourceId||"").startsWith(legacySourcePrefix)&&String(item.date||"").startsWith(month)));
  if(state.transactions.length===before)return false;
  save();render();return true;
}
function syncSalaryIncomes(entries=[]) {
  const normalized=entries.map((entry,index)=>({sourceId:String(entry?.sourceId||""),date:String(entry?.date||""),amount:Math.max(0,Math.round(Number(entry?.amount)||0)),memo:String(entry?.memo||"給与").slice(0,40),index})).filter(entry=>entry.sourceId.startsWith("salary-month:")&&/^\d{4}-\d{2}-\d{2}$/.test(entry.date)&&entry.amount>0),desired=new Set(normalized.map(entry=>entry.sourceId));
  let changed=false;
  normalized.forEach(entry=>{let row=state.transactions.find(item=>item.sourceId===entry.sourceId);if(!row){row={id:Date.now()+entry.index,sourceId:entry.sourceId};state.transactions.push(row);changed=true;}const next={date:entry.date,type:"income",category:"salary",amount:entry.amount,memo:entry.memo};if(Object.keys(next).some(key=>row[key]!==next[key])){Object.assign(row,next);changed=true;}});
  const before=state.transactions.length;state.transactions=state.transactions.filter(item=>{const source=String(item.sourceId||"");return !(source.startsWith("salary-month:")||/^salary:[^:]+:/.test(source))||desired.has(source);});if(state.transactions.length!==before)changed=true;
  if(changed){save();render();}return changed;
}
window.ExpenceFinanceStore={snapshot:()=>structuredClone(state),transactions:()=>structuredClone(state.transactions),currentAssets:(month=state.month)=>currentAssetsForMonth(month),carryover:(month=state.month)=>carryoverForMonth(month),hasCarryover:(month=state.month)=>Object.hasOwn(state.carryoversByMonth,month),selectedMonth:()=>state.month,setCarryover:(amount,month=state.month,mode="manual",skipSync=false)=>setCarryover(amount,month,mode,skipSync),upsertSalaryIncome,removeSalaryIncome,syncSalaryIncomes,rerender:render,restore:value=>{state=normalizeState(value);save(true);render();window.ExpenceSalaryStore?.recalculateAllSalaryIncome?.();},reset:()=>{state=normalizeState(null);save(true);render();}};
document.body.dataset.activeView="dashboard";
render();
