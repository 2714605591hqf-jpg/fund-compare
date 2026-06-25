/* ==========================================
   主入口 + 交互逻辑 v2.0
   ========================================== */

var pendingDeleteId = null;

// 全局联动筛选：在一只基金中勾选 → 所有基金联动
var filterFocusStocks = {};  // { stockName: true }
var filterActive = false;

function initApp() {
  renderAll();
  bindEvents();
}

document.addEventListener('DOMContentLoaded', initApp);

// ==========================================
//  事件绑定
// ==========================================

function bindEvents() {
  var si = $('.search-input');
  if (si) si.addEventListener('input', function () { renderAll(); });

  var fc = $('.filter-checkbox');
  if (fc) fc.addEventListener('change', function () {
    manualCollapse = {};
    filterFocusStocks = {};
    filterActive = false;
    renderAll();
  });

  var addBtn = $('#btn-add-fund');
  if (addBtn) addBtn.addEventListener('click', showAddModal);

  var grid = $('.fund-grid');
  if (grid) {
    grid.addEventListener('click', handleCardClick);
    grid.addEventListener('dblclick', handleCardClick);
  }

  document.addEventListener('click', handleGlobalClick);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeAllModals();
  });
}

// ==========================================
//  卡片点击
// ==========================================

function handleCardClick(e) {
  var card = e.target.closest('.fund-card');
  if (!card) return;
  var fundId = card.getAttribute('data-id');
  if (!fundId) return;

  // 折叠（筛选模式下标记手动操作）
  if (e.target.closest('.btn-collapse')) {
    var fc = $('.filter-checkbox');
    if (fc && fc.checked) manualCollapse[fundId] = true;
    toggleCollapse(fundId);
    renderAll();
    return;
  }

  // 置顶
  if (e.target.closest('.btn-pin')) {
    togglePin(fundId);
    renderAll();
    return;
  }

  // 删除
  if (e.target.closest('.btn-delete')) {
    var name = card.querySelector('.fund-name').textContent;
    showDeleteModal(fundId, name);
    return;
  }

  // 全选/全不选
  if (e.target.closest('.btn-text-link')) {
    var btn = e.target.closest('.btn-text-link');
    var isAll = btn.textContent.trim() === '全选';
    var cbs = card.querySelectorAll('.stock-check');
    for (var i = 0; i < cbs.length; i++) cbs[i].checked = isAll;
    return;
  }

  // 确定按钮
  if (e.target.closest('.btn-confirm')) {
    handleConfirm(fundId, card);
    return;
  }

  // 下拉展开按钮
  if (e.target.closest('.btn-dropdown')) {
    toggleShowAll(fundId);
    renderAll();
    return;
  }

  // 双击分类标签 → 编辑
  if (e.target.closest('.category-tag') && e.type === 'dblclick') {
    var catTag = e.target.closest('.category-tag');
    var fid = catTag.getAttribute('data-fund-id');
    if (fid) startEditCategory(catTag, fid);
    return;
  }

  // 双击基金名 → 编辑
  if (e.target.closest('.fund-name') && e.type === 'dblclick') {
    var fnSpan = e.target.closest('.fund-name');
    startEditFundName(fnSpan, fundId);
    return;
  }

  // 双击股票名 → 编辑
  if (e.target.closest('.stock-name') && e.type === 'dblclick') {
    var nameSpan = e.target.closest('.stock-name');
    startEditStockName(nameSpan, fundId, card);
    return;
  }

  // 点击折叠的股票行 → 展开（加入焦点）
  if (e.target.closest('.stock-item.stock-folded')) {
    var item = e.target.closest('.stock-item.stock-folded');
    var cb = item.querySelector('.stock-check');
    var stockName = cb ? cb.getAttribute('data-stock') : null;
    if (stockName && filterActive) {
      filterFocusStocks[stockName] = true;
      renderAll();
    }
    return;
  }
}

// ==========================================
//  基金名称编辑
// ==========================================

function startEditFundName(nameSpan, fundId) {
  var original = nameSpan.getAttribute('data-original') || nameSpan.textContent.trim();

  var input = document.createElement('input');
  input.type = 'text';
  input.value = original;
  input.style.cssText = 'font-size:16px;font-weight:600;padding:2px 8px;border:1px solid #4A90D9;border-radius:4px;width:80%;font-family:inherit;color:#2E5C8A;';

  nameSpan.replaceWith(input);
  input.focus();
  input.select();

  var save = function () {
    var newName = input.value.trim();
    if (newName && newName !== original) {
      updateFund(fundId, { name: newName });
    }
    renderAll();
  };

  input.addEventListener('blur', save);
  input.addEventListener('keydown', function (ev) {
    if (ev.key === 'Enter') { input.blur(); }
    if (ev.key === 'Escape') {
      input.removeEventListener('blur', save);
      renderAll();
    }
  });
}

// ==========================================
//  分类编辑
// ==========================================

function startEditCategory(catSpan, fundId) {
  var original = catSpan.getAttribute('data-original') || '';

  var input = document.createElement('input');
  input.type = 'text';
  input.value = original;
  input.placeholder = '输入分类';
  input.style.cssText = 'font-size:12px;padding:2px 6px;border:1px solid #4A90D9;border-radius:4px;width:60px;font-family:inherit;';

  catSpan.replaceWith(input);
  input.focus();
  input.select();

  var save = function () {
    var newCat = input.value.trim();
    updateFund(fundId, { category: newCat });
    renderAll();
  };

  input.addEventListener('blur', save);
  input.addEventListener('keydown', function (ev) {
    if (ev.key === 'Enter') { input.blur(); }
    if (ev.key === 'Escape') {
      input.removeEventListener('blur', save);
      renderAll();
    }
  });
}

// ==========================================
//  股票名称编辑
// ==========================================

function startEditStockName(nameSpan, fundId, card) {
  var original = nameSpan.getAttribute('data-original');

  // 创建输入框替换
  var input = document.createElement('input');
  input.type = 'text';
  input.className = 'stock-edit-input';
  input.value = original;
  input.style.cssText = 'font-size:14px;padding:2px 6px;border:1px solid #4A90D9;border-radius:4px;width:80%;font-family:inherit;';

  nameSpan.replaceWith(input);
  input.focus();
  input.select();

  var save = function () {
    var newName = input.value.trim();
    if (newName && newName !== original) {
      // 更新数据
      var funds = getFunds();
      var fund = funds.find(function (f) { return f.id === fundId; });
      if (fund) {
        var idx = fund.stocks.indexOf(original);
        if (idx !== -1) fund.stocks[idx] = newName;
        saveFunds(funds);
      }
    }
    renderAll();
  };

  input.addEventListener('blur', save);
  input.addEventListener('keydown', function (ev) {
    if (ev.key === 'Enter') { input.blur(); }
    if (ev.key === 'Escape') {
      input.removeEventListener('blur', save);
      renderAll();
    }
  });
}

// ==========================================
//  确定按钮
// ==========================================

function handleConfirm(fundId, card) {
  var cbs = card.querySelectorAll('.stock-check');
  var focus = {};
  var total = cbs.length;

  for (var i = 0; i < cbs.length; i++) {
    var cb = cbs[i];
    var sn = cb.getAttribute('data-stock');
    if (sn && cb.checked) focus[sn] = true;
  }

  filterFocusStocks = focus;
  filterActive = true;

  // 重置所有基金的下拉展开状态
  var funds = getFunds();
  for (var j = 0; j < funds.length; j++) {
    if (funds[j].showAll) {
      funds[j].showAll = false;
    }
  }
  saveFunds(funds);

  renderAll();
}

// ==========================================
//  添加基金
// ==========================================

function showAddModal() {
  clearAddForm();
  var modal = $('#modal-add');
  if (!modal) return;
  modal.style.display = '';
  var fi = modal.querySelector('.form-input');
  if (fi) setTimeout(function () { fi.focus(); }, 100);
}

function handleAddFund() {
  var modal = $('#modal-add');
  if (!modal) return;
  var nameInput = modal.querySelector('.form-group .form-input');
  var fundName = nameInput ? nameInput.value.trim() : '';
  if (!fundName) { flashError(nameInput); return; }

  var stockInputs = modal.querySelectorAll('.stock-input');
  var stocks = [];
  for (var i = 0; i < stockInputs.length; i++) {
    var v = stockInputs[i].value.trim();
    if (v) stocks.push(v);
  }
  if (stocks.length === 0) {
    if (stockInputs[0]) flashError(stockInputs[0]);
    return;
  }

  addFund(fundName, stocks);
  renderAll();
  closeAllModals();
}

function clearAddForm() {
  var modal = $('#modal-add');
  if (!modal) return;
  var inputs = modal.querySelectorAll('.form-input');
  for (var i = 0; i < inputs.length; i++) inputs[i].value = '';
}

function flashError(input) {
  input.style.borderColor = 'var(--danger)';
  input.focus();
  setTimeout(function () { input.style.borderColor = ''; }, 1500);
}

// ==========================================
//  删除基金
// ==========================================

function showDeleteModal(fundId, fundName) {
  var modal = $('#modal-delete');
  if (!modal) return;
  pendingDeleteId = fundId;
  var ns = modal.querySelector('.delete-fund-name');
  if (ns) ns.textContent = fundName;
  modal.style.display = '';
}

function handleDeleteConfirm() {
  if (pendingDeleteId) {
    deleteFund(pendingDeleteId);
    pendingDeleteId = null;
    renderAll();
  }
  closeAllModals();
}

// ==========================================
//  弹窗控制
// ==========================================

function handleGlobalClick(e) {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.style.display = 'none'; return;
  }
  if (e.target.classList.contains('btn-cancel') || e.target.classList.contains('modal-close')) {
    closeAllModals(); return;
  }
  if (e.target.closest('#modal-add .btn-primary')) {
    handleAddFund(); return;
  }
  if (e.target.closest('#modal-delete .btn-danger')) {
    handleDeleteConfirm(); return;
  }
}

function closeAllModals() {
  var modals = document.querySelectorAll('.modal-overlay');
  for (var i = 0; i < modals.length; i++) modals[i].style.display = 'none';
}
