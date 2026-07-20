(() => {
  const FINANCE_KEY = "expence-tracker-forecast-v1";
  const SHEETS_KEY = "expence-tracker-sheets-v1";
  const yen = value => `${Math.round(Number(value) || 0).toLocaleString("ja-JP")}円`;
  const today = new Date().toLocaleDateString("sv-SE");

  let forecast = load(FINANCE_KEY, { currentAssets: 0, nextIncome: 0, scheduledBills: 0 });
  let sheets = load(SHEETS_KEY, []);
  let activeSheetId = null;
  let selectedCell = null;

  function load(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? structuredClone(fallback); }
    catch { return structuredClone(fallback); }
  }
  function save(key, value, skipSync = false) { localStorage.setItem(key, JSON.stringify(value)); if (!skipSync) window.CloudSync?.schedule(); }

  const style = document.createElement("link");
  style.rel = "stylesheet";
  style.href = "workspace.css?v=20260720-2";
  document.head.appendChild(style);

  function financeData() {
    const list = typeof state !== "undefined" ? state.transactions : [];
    const month = typeof state !== "undefined" ? state.month : today.slice(0, 7);
    const monthRows = list.filter(t => t.date.startsWith(month));
    const todayRows = list.filter(t => t.date === today);
    const sum = (rows, type) => rows.filter(t => t.type === type).reduce((n, t) => n + Number(t.amount || 0), 0);
    const monthIncome = sum(monthRows, "income");
    const monthExpense = sum(monthRows, "expense");
    return {
      todayIncome: sum(todayRows, "income"),
      todayExpense: sum(todayRows, "expense"),
      monthIncome,
      monthExpense,
      afterNextIncome: Number(forecast.currentAssets) + monthIncome - monthExpense + Number(forecast.nextIncome) - Number(forecast.scheduledBills)
    };
  }

  const financeStrip = document.createElement("div");
  financeStrip.className = "daily-summary";
  document.querySelector("#dashboardView .hero-grid").after(financeStrip);

  function renderFinance() {
    const d = financeData();
    financeStrip.innerHTML = `
      <article><span class="metric-icon expense">↓</span><div><small>今日の支出</small><b>${yen(d.todayExpense)}</b></div></article>
      <article><span class="metric-icon income">↑</span><div><small>今日の収入</small><b>${yen(d.todayIncome)}</b></div></article>
      <article><span class="metric-icon month">月</span><div><small>今月の収入</small><b>${yen(d.monthIncome)}</b></div></article>
      <article class="next-assets"><span class="metric-icon assets">円</span><div><small>次の収入込み資産</small><b>${yen(d.afterNextIncome)}</b></div><button data-forecast-settings>設定</button></article>`;
    const title = document.querySelector(".forecast-card .label");
    const note = document.querySelector(".forecast-card .subtle");
    if (title) title.textContent = "次の収入込み資産";
    if (note) note.textContent = "現在資産＋今月収支＋次回収入−引き落とし";
    if (document.querySelector("#forecastValue")) document.querySelector("#forecastValue").textContent = yen(d.afterNextIncome);
    if (document.querySelector("#currentAssets")) document.querySelector("#currentAssets").textContent = yen(forecast.currentAssets);
    if (document.querySelector("#scheduledBills")) document.querySelector("#scheduledBills").textContent = `＋${yen(forecast.nextIncome)}`;
    const labels = document.querySelectorAll(".forecast-row span");
    if (labels[0]) labels[0].textContent = "現在の資産";
    if (labels[1]) labels[1].textContent = "次の収入";
  }

  const forecastDialog = document.createElement("dialog");
  forecastDialog.id = "forecastDialog";
  forecastDialog.innerHTML = `<form method="dialog" id="forecastForm"><div class="modal-head"><div><p class="eyebrow">ASSET FORECAST</p><h2>資産予測の設定</h2></div><button type="button" class="close-btn" data-forecast-close>×</button></div><label>現在の資産<input name="currentAssets" type="number" min="0"></label><label>次に入る収入<input name="nextIncome" type="number" min="0"></label><label>今後の引き落とし<input name="scheduledBills" type="number" min="0"></label><button class="primary-btn wide">保存する</button></form>`;
  document.body.appendChild(forecastDialog);

  const nav = document.createElement("button");
  nav.className = "nav-item";
  nav.dataset.view = "sheets";
  nav.innerHTML = `<span>${window.uiIcon?.("sheet") || "▦"}</span>マイシート`;
  document.querySelector(".main-nav").appendChild(nav);
  const mobileNav = document.createElement("button");
  mobileNav.type = "button";
  mobileNav.dataset.view = "sheets";
  mobileNav.innerHTML = `<i>${window.uiIcon?.("sheet") || "▦"}</i><span>シート</span>`;
  document.querySelector(".mobile-nav").appendChild(mobileNav);

  const sheetsView = document.createElement("section");
  sheetsView.id = "sheetsView";
  sheetsView.className = "view";
  sheetsView.innerHTML = `<div class="section-heading sheet-heading"><div><p class="eyebrow">MY SHEETS</p><h2>マイシート</h2><p>必要な管理表を、必要になったときに追加。</p></div><button class="primary-btn" data-add-sheet>＋ シートを追加</button></div><div id="sheetWorkspace"></div>`;
  document.querySelector(".content").appendChild(sheetsView);

  const sheetDialog = document.createElement("dialog");
  sheetDialog.id = "sheetDialog";
  sheetDialog.innerHTML = `<form method="dialog" id="sheetForm"><div class="modal-head"><div><p class="eyebrow">NEW SHEET</p><h2>シートを追加</h2></div><button type="button" class="close-btn" data-sheet-close>×</button></div><label>シート名<input name="name" required maxlength="30" placeholder="例：教習所"></label><div class="template-options"><label><input type="radio" name="template" value="blank" checked><span><b>空白シート</b><small>自由にセルへ入力</small></span></label><label><input type="radio" name="template" value="gpa"><span><b>GPA計算</b><small>単位と評点から自動計算</small></span></label></div><button class="primary-btn wide">追加する</button></form>`;
  document.body.appendChild(sheetDialog);

  function blankData(rows = 12, cols = 6) { return Array.from({ length: rows }, () => Array(cols).fill("")); }
  function createSheet(name, template) {
    const data = template === "gpa" ? [["科目名", "単位", "評点", "評価", "GP"], ...blankData(10, 5)] : blankData();
    const sheet = { id: Date.now(), name, template, data, styles: {}, zoom: 100, updatedAt: new Date().toISOString() };
    sheets.push(sheet); save(SHEETS_KEY, sheets); activeSheetId = sheet.id; renderSheets();
  }
  function grade(score) {
    if (score === "" || Number.isNaN(Number(score))) return ["", ""];
    const n = Number(score);
    if (n >= 90) return ["秀", 4];
    if (n >= 80) return ["優", 3];
    if (n >= 70) return ["良", 2];
    if (n >= 60) return ["可", 1];
    return ["不可", 0];
  }
  function gpa(sheet) {
    let credits = 0, points = 0;
    sheet.data.slice(1).forEach(row => {
      const credit = Number(row[1]), gp = grade(row[2])[1];
      if (credit && gp !== "") { credits += credit; points += credit * gp; }
    });
    return credits ? (points / credits).toFixed(2) : "-";
  }
  function refToCell(ref) {
    const match = /^([A-Z]+)(\d+)$/i.exec(ref);
    if (!match) return null;
    let col = 0;
    for (const letter of match[1].toUpperCase()) col = col * 26 + letter.charCodeAt(0) - 64;
    return { row: Number(match[2]) - 1, col: col - 1 };
  }
  function rangeValues(sheet, start, end, seen) {
    const a = refToCell(start), b = refToCell(end);
    if (!a || !b) return [];
    const values = [];
    for (let row = Math.min(a.row,b.row); row <= Math.max(a.row,b.row); row++) {
      for (let col = Math.min(a.col,b.col); col <= Math.max(a.col,b.col); col++) values.push(numericCell(sheet,row,col,seen));
    }
    return values;
  }
  function numericCell(sheet, row, col, seen = new Set()) {
    const key = `${row}:${col}`;
    if (seen.has(key)) throw new Error("cycle");
    if (!sheet.data[row] || col >= sheet.data[row].length) return 0;
    const raw = sheet.data[row][col] ?? "";
    if (typeof raw === "string" && raw.startsWith("=")) return Number(evaluateFormula(sheet,raw,new Set([...seen,key]))) || 0;
    return Number(raw) || 0;
  }
  function evaluateFormula(sheet, formula, seen = new Set()) {
    try {
      let expression = formula.slice(1).toUpperCase();
      expression = expression.replace(/(SUM|AVERAGE|MIN|MAX)\(([A-Z]+\d+):([A-Z]+\d+)\)/g, (_, fn, start, end) => {
        const values = rangeValues(sheet,start,end,seen);
        if (!values.length) return "0";
        if (fn === "SUM") return String(values.reduce((a,b)=>a+b,0));
        if (fn === "AVERAGE") return String(values.reduce((a,b)=>a+b,0)/values.length);
        if (fn === "MIN") return String(Math.min(...values));
        return String(Math.max(...values));
      });
      expression = expression.replace(/\b[A-Z]+\d+\b/g, ref => {
        const cell = refToCell(ref);
        return String(cell ? numericCell(sheet,cell.row,cell.col,seen) : 0);
      });
      if (!/^[0-9+\-*/().,\s]+$/.test(expression)) throw new Error("invalid");
      const result = Function(`"use strict";return (${expression})`)();
      if (!Number.isFinite(result)) throw new Error("invalid");
      return Math.round(result * 1000000) / 1000000;
    } catch (error) { return error.message === "cycle" ? "#CYCLE" : "#ERROR"; }
  }
  function cellValue(sheet, row, col) {
    if (sheet.template === "gpa" && row > 0 && col === 3) return grade(sheet.data[row][2])[0];
    if (sheet.template === "gpa" && row > 0 && col === 4) return grade(sheet.data[row][2])[1];
    const raw = sheet.data[row][col] ?? "";
    return typeof raw === "string" && raw.startsWith("=") ? evaluateFormula(sheet,raw) : raw;
  }
  function cellStyle(sheet, row, col) {
    sheet.styles ||= {};
    return sheet.styles[`${row}:${col}`] || {};
  }
  function styleText(style) {
    return `text-align:${style.align || "left"};font-size:${style.fontSize || 11}px;background:${style.fill || "#ffffff"};font-weight:${style.bold ? 700 : 400}`;
  }
  function renderSheets() {
    const workspace = document.querySelector("#sheetWorkspace");
    const active = sheets.find(s => s.id === activeSheetId);
    if (active) { renderEditor(active); return; }
    if (!sheets.length) {
      workspace.innerHTML = `<div class="empty-sheets"><span>▦</span><h2>まだシートがありません</h2><p>教習所、資格、学習記録などを後から自由に追加できます。</p><button class="primary-btn" data-add-sheet>最初のシートを追加</button></div>`;
      return;
    }
    workspace.innerHTML = `<div class="sheet-cards">${sheets.map(s => `<button class="sheet-card" data-open-sheet="${s.id}"><span>▦</span><div><b>${escapeHtml(s.name)}</b><small>${s.template === "gpa" ? "GPA計算テンプレート" : `${s.data.length}行 × ${s.data[0].length}列`}</small></div><i>→</i></button>`).join("")}</div>`;
  }
  function renderEditor(sheet) {
    sheet.styles ||= {};
    sheet.zoom = Math.min(200, Math.max(75, Number(sheet.zoom) || 100));
    const letters = Array.from({ length: sheet.data[0].length }, (_, i) => String.fromCharCode(65 + i));
    const rows = sheet.data.map((row, r) => `<div class="sheet-row"><b class="row-number">${r + 1}</b>${row.map((_, c) => {
      const computed = sheet.template === "gpa" && (r === 0 || c > 2);
      const selected = selectedCell?.row === r && selectedCell?.col === c;
      return `<div class="sheet-cell ${computed ? "formula" : ""} ${selected ? "selected" : ""}" style="${styleText(cellStyle(sheet,r,c))}" ${computed ? "" : "contenteditable=true"} data-cell-row="${r}" data-cell-col="${c}">${escapeHtml(String(cellValue(sheet, r, c)))}</div>`;
    }).join("")}</div>`).join("");
    const gridStyle = `style="--sheet-cols:${sheet.data[0].length};zoom:${sheet.zoom / 100}"`;
    const selectedStyle = selectedCell ? cellStyle(sheet,selectedCell.row,selectedCell.col) : {};
    const raw = selectedCell ? sheet.data[selectedCell.row]?.[selectedCell.col] ?? "" : "";
    document.querySelector("#sheetWorkspace").innerHTML = `<div class="sheet-toolbar"><button class="text-btn" data-sheet-back>← 一覧</button><div><h2>${escapeHtml(sheet.name)}</h2><p>${sheet.template === "gpa" ? `現在のGPA：${gpa(sheet)}` : "セルをクリックして入力"}</p></div><div class="sheet-actions"><button data-add-row>＋行</button>${sheet.template === "blank" ? "<button data-add-col>＋列</button>" : ""}<button data-export-sheet>CSV</button><button class="danger" data-delete-sheet>削除</button></div></div><div class="format-toolbar"><div class="cell-address">${selectedCell ? `${letters[selectedCell.col]}${selectedCell.row+1}` : "-"}</div><button data-format-bold class="${selectedStyle.bold ? "active" : ""}" title="太字"><b>B</b></button><select data-format-size title="文字サイズ">${[10,11,12,14,16,18,20,24].map(n=>`<option value="${n}" ${(selectedStyle.fontSize||11)===n?"selected":""}>${n}</option>`).join("")}</select><span class="toolbar-separator"></span><button data-format-align="left" class="${(selectedStyle.align||"left")==="left"?"active":""}" title="左揃え">≡</button><button data-format-align="center" class="${selectedStyle.align==="center"?"active":""}" title="中央揃え">≡</button><button data-format-align="right" class="${selectedStyle.align==="right"?"active":""}" title="右揃え">≡</button><label class="fill-control" title="塗りつぶし">■<input type="color" data-format-fill value="${selectedStyle.fill||"#ffffff"}"></label><span class="toolbar-separator"></span><span class="fx">fx</span><input class="formula-input" data-formula-input value="${escapeHtml(String(raw))}" placeholder="=SUM(A1:A5)" ${selectedCell?"":"disabled"}></div><div class="spreadsheet-wrap"><div class="spreadsheet" ${gridStyle}><div class="sheet-row sheet-letters"><b></b>${letters.map(x=>`<b>${x}</b>`).join("")}</div>${rows}</div></div><div class="formula-help">関数例：<code>=SUM(A1:A5)</code> <code>=AVERAGE(B1:B5)</code> <code>=MIN(A1:A5)</code> <code>=MAX(A1:A5)</code> <code>=A1+B1</code></div>`;
    const actions = document.querySelector(".sheet-actions");
    actions?.insertAdjacentHTML("afterbegin", `<span class="sheet-zoom"><button type="button" data-sheet-zoom="-25" title="セルを縮小">−</button><b>${sheet.zoom}%</b><button type="button" data-sheet-zoom="25" title="セルを拡大">＋</button></span>`);
  }
  function selectCell(element) {
    selectedCell = { row:Number(element.dataset.cellRow), col:Number(element.dataset.cellCol) };
    document.querySelectorAll(".sheet-cell.selected").forEach(cell=>cell.classList.remove("selected"));
    element.classList.add("selected");
    const sheet = activeSheet(), style = cellStyle(sheet,selectedCell.row,selectedCell.col);
    const letters = String.fromCharCode(65 + selectedCell.col);
    document.querySelector(".cell-address").textContent = `${letters}${selectedCell.row+1}`;
    document.querySelector("[data-formula-input]").disabled = false;
    document.querySelector("[data-formula-input]").value = sheet.data[selectedCell.row][selectedCell.col] ?? "";
    document.querySelector("[data-format-size]").value = style.fontSize || 11;
    document.querySelector("[data-format-fill]").value = style.fill || "#ffffff";
    document.querySelector("[data-format-bold]").classList.toggle("active",Boolean(style.bold));
    document.querySelectorAll("[data-format-align]").forEach(button=>button.classList.toggle("active",button.dataset.formatAlign === (style.align||"left")));
  }
  function applyCellStyle(change) {
    if (!selectedCell) return;
    const sheet = activeSheet(), key = `${selectedCell.row}:${selectedCell.col}`;
    sheet.styles ||= {}; sheet.styles[key] = { ...(sheet.styles[key]||{}), ...change };
    save(SHEETS_KEY,sheets); renderEditor(sheet);
  }
  function escapeHtml(value) { return value.replace(/[&<>"]/g, ch => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[ch])); }
  function activeSheet() { return sheets.find(s => s.id === activeSheetId); }
  function exportCsv(sheet) {
    const csv = sheet.data.map((row, r) => row.map((_, c) => `"${String(cellValue(sheet,r,c)).replaceAll('"','""')}"`).join(",")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv" }));
    a.download = `${sheet.name}.csv`; a.click(); URL.revokeObjectURL(a.href);
  }

  document.addEventListener("click", e => {
    if (e.target.closest('[data-view="sheets"]')) { document.querySelector("#pageTitle").textContent = "マイシート"; activeSheetId = null; renderSheets(); }
    if (e.target.closest("[data-forecast-settings]")) {
      Object.entries(forecast).forEach(([key, value]) => forecastDialog.elements?.[key] ? forecastDialog.elements[key].value = value : null);
      forecastDialog.querySelector('[name="currentAssets"]').value = forecast.currentAssets;
      forecastDialog.querySelector('[name="nextIncome"]').value = forecast.nextIncome;
      forecastDialog.querySelector('[name="scheduledBills"]').value = forecast.scheduledBills;
      forecastDialog.showModal();
    }
    if (e.target.closest("[data-forecast-close]")) forecastDialog.close();
    if (e.target.closest("[data-add-sheet]")) { sheetDialog.querySelector("form").reset(); sheetDialog.showModal(); }
    if (e.target.closest("[data-sheet-close]")) sheetDialog.close();
    const open = e.target.closest("[data-open-sheet]");
    if (open) { activeSheetId = Number(open.dataset.openSheet); selectedCell = null; renderSheets(); }
    if (e.target.closest("[data-sheet-back]")) { activeSheetId = null; selectedCell = null; renderSheets(); }
    if (e.target.closest("[data-add-row]")) { const s=activeSheet(); s.data.push(Array(s.data[0].length).fill("")); save(SHEETS_KEY,sheets); renderEditor(s); }
    if (e.target.closest("[data-add-col]")) { const s=activeSheet(); if(s.data[0].length<12){s.data.forEach(r=>r.push(""));save(SHEETS_KEY,sheets);renderEditor(s);} }
    const zoomButton = e.target.closest("[data-sheet-zoom]");
    if (zoomButton) { const s=activeSheet(); s.zoom=Math.min(200,Math.max(75,(Number(s.zoom)||100)+Number(zoomButton.dataset.sheetZoom)));save(SHEETS_KEY,sheets);renderEditor(s); }
    if (e.target.closest("[data-export-sheet]")) exportCsv(activeSheet());
    if (e.target.closest("[data-delete-sheet]") && confirm("このシートを削除しますか？")) { sheets=sheets.filter(s=>s.id!==activeSheetId);save(SHEETS_KEY,sheets);activeSheetId=null;renderSheets(); }
    const cell = e.target.closest("[data-cell-row]");
    if (cell) selectCell(cell);
    if (e.target.closest("[data-format-bold]") && selectedCell) applyCellStyle({bold:!cellStyle(activeSheet(),selectedCell.row,selectedCell.col).bold});
    const align = e.target.closest("[data-format-align]");
    if (align) applyCellStyle({align:align.dataset.formatAlign});
    if (e.target.closest("[data-delete]")) setTimeout(renderFinance);
  });
  document.addEventListener("input", e => {
    if (!e.target.matches("[data-cell-row]")) return;
    const s = activeSheet(), r = Number(e.target.dataset.cellRow), c = Number(e.target.dataset.cellCol);
    s.data[r][c] = e.target.textContent; s.updatedAt = new Date().toISOString(); save(SHEETS_KEY, sheets);
    const formulaInput = document.querySelector("[data-formula-input]");
    if (formulaInput) formulaInput.value = e.target.textContent;
  });
  document.addEventListener("focusin", e => {
    if (!e.target.matches("[data-cell-row]")) return;
    selectCell(e.target);
    const raw = activeSheet().data[selectedCell.row][selectedCell.col] ?? "";
    if (typeof raw === "string" && raw.startsWith("=")) e.target.textContent = raw;
  });
  document.addEventListener("focusout", e => {
    if (!e.target.matches("[data-cell-row]")) return;
    if (e.relatedTarget?.closest?.(".format-toolbar")) return;
    setTimeout(()=>{ if (activeSheet()) renderEditor(activeSheet()); },0);
  });
  document.addEventListener("change", e => {
    if (e.target.matches("[data-format-size]")) applyCellStyle({fontSize:Number(e.target.value)});
    if (e.target.matches("[data-format-fill]")) applyCellStyle({fill:e.target.value});
  });
  document.addEventListener("keydown", e => {
    if (!e.target.matches("[data-formula-input]") || e.key !== "Enter" || !selectedCell) return;
    e.preventDefault(); const sheet = activeSheet();
    sheet.data[selectedCell.row][selectedCell.col] = e.target.value.trim();
    save(SHEETS_KEY,sheets); renderEditor(sheet);
  });
  document.querySelector("#forecastForm").addEventListener("submit", e => {
    e.preventDefault(); const fd = new FormData(e.target);
    forecast = { currentAssets:Number(fd.get("currentAssets")), nextIncome:Number(fd.get("nextIncome")), scheduledBills:Number(fd.get("scheduledBills")) };
    save(FINANCE_KEY, forecast); forecastDialog.close(); renderFinance();
  });
  document.querySelector("#sheetForm").addEventListener("submit", e => {
    e.preventDefault(); const fd = new FormData(e.target); createSheet(fd.get("name").trim(), fd.get("template")); sheetDialog.close();
  });
  document.querySelector("#transactionForm").addEventListener("submit", () => setTimeout(renderFinance));
  document.querySelector("#monthPicker").addEventListener("change", () => setTimeout(renderFinance));
  window.ExpenceWorkspaceStore = {
    snapshot: () => ({ forecast: structuredClone(forecast), sheets: structuredClone(sheets) }),
    restore: value => {
      forecast = { currentAssets: 0, nextIncome: 0, scheduledBills: 0, ...(value?.forecast || {}) };
      sheets = Array.isArray(value?.sheets) ? value.sheets : [];
      save(FINANCE_KEY, forecast, true); save(SHEETS_KEY, sheets, true);
      activeSheetId = null; selectedCell = null; renderFinance(); renderSheets();
    },
    reset: () => {
      forecast = { currentAssets: 0, nextIncome: 0, scheduledBills: 0 }; sheets = [];
      save(FINANCE_KEY, forecast, true); save(SHEETS_KEY, sheets, true);
      activeSheetId = null; selectedCell = null; renderFinance(); renderSheets();
    }
  };
  renderFinance(); renderSheets();
})();
