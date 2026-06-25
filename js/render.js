/* ==========================================
   渲染引擎 v2.0 — 含筛选系统
   ========================================== */

// 手动折叠覆盖（筛选模式下用户手动操作过的基金）
var manualCollapse = {};

// 当前选中的分类筛选（空=全部）
var activeCategory = '';

function renderAll() {
  var grid = $('.fund-grid');
  if (!grid) return;
  grid.innerHTML = '';

  var funds = getFunds();

  // 渲染分类筛选条
  renderCategoryBar(funds);

  if (funds.length === 0) {
    grid.appendChild(renderEmptyState());
    return;
  }

  // 搜索
  var searchTerm = '';
  var si = $('.search-input');
  if (si) searchTerm = si.value;
  var sr = searchFunds(funds, searchTerm);
  var visible = sr.filtered;
  var highlights = sr.highlights;
  if (visible.length === 0) {
    grid.appendChild(renderSearchEmpty(searchTerm));
    return;
  }

  // 分类过滤
  if (activeCategory === '__all__') {
    visible = visible.filter(function (f) { return !f.category; });
  } else if (activeCategory) {
    visible = visible.filter(function (f) { return f.category === activeCategory; });
  }

  // 筛选开关
  var filterOn = false;
  var fc = $('.filter-checkbox');
  if (fc) filterOn = fc.checked;


  // 颜色映射
  var colorMap = buildColorMap(funds);

  // 筛选模式：仅对比展开的基金，折叠的不参与
  var sharedStocks = [];
  if (filterOn) {
    var compareFunds = visible.filter(function (f) { return !f.collapsed; });
    sharedStocks = getSharedStocks(compareFunds);
    // 按共同持仓数量降序，同数量按创建时间
    visible.sort(function (a, b) {
      var ac = 0, bc = 0;
      for (var si2 = 0; si2 < a.stocks.length; si2++) {
        if (inArray(sharedStocks, a.stocks[si2])) ac++;
      }
      for (var sj = 0; sj < b.stocks.length; sj++) {
        if (inArray(sharedStocks, b.stocks[sj])) bc++;
      }
      if (bc !== ac) return bc - ac;
      return b.createdAt - a.createdAt;
    });
  }

  // 渲染
  for (var i = 0; i < visible.length; i++) {
    var fund = visible[i];
    var hlSet = highlights[fund.id] || new Set();
    grid.appendChild(renderCard(fund, colorMap, hlSet, filterOn, sharedStocks));
  }
}

function renderCard(fund, colorMap, hlSet, filterOn, sharedStocks) {
  var collapsed = fund.collapsed;

  // 全局联动筛选：0焦点股票 → 折叠
  if (filterActive && !manualCollapse[fund.id]) {
    var hasFocus = false;
    for (var fi = 0; fi < fund.stocks.length; fi++) {
      if (filterFocusStocks[fund.stocks[fi]]) { hasFocus = true; break; }
    }
    if (!hasFocus) collapsed = true;
    else collapsed = false;
  }

  // 共同持仓筛选：0共同持仓 → 折叠（全局筛选未生效时）
  if (!filterActive && filterOn && !manualCollapse[fund.id]) {
    var hasShared = false;
    for (var i = 0; i < fund.stocks.length; i++) {
      if (inArray(sharedStocks, fund.stocks[i])) { hasShared = true; break; }
    }
    if (!hasShared && sharedStocks.length > 0) collapsed = true;
    else if (hasShared) collapsed = false;
  }

  var cls = 'fund-card';
  if (fund.pinned) cls += ' pinned';
  if (collapsed) cls += ' collapsed';

  var card = createElement('div', { className: cls, 'data-id': fund.id });
  card.appendChild(renderCardHeader(fund, hlSet, collapsed));
  card.appendChild(renderStockBody(fund, colorMap, hlSet, filterOn, sharedStocks));
  card.appendChild(renderCardButtons());

  return card;
}

function renderCardHeader(fund, hlSet, effectiveCollapsed) {
  var header = createElement('div', { className: 'card-header' });

  var pinBtn = createElement('button', { className: 'btn-icon btn-pin', title: fund.pinned ? '取消置顶' : '置顶' }, '📌');
  if (!fund.pinned) pinBtn.style.opacity = '0.35';

  var nameCls = 'fund-name';
  var st = '';
  var si = $('.search-input');
  if (si) st = si.value.trim().toLowerCase();
  if (st && fund.name.toLowerCase().indexOf(st) !== -1) nameCls += ' highlight-name';
  var nameSpan = createElement('span', { className: nameCls, title: '双击编辑' }, escapeHtml(fund.name));
  nameSpan.setAttribute('data-original', fund.name);

  var actions = createElement('div', { className: 'card-actions' });
  var collIcon = effectiveCollapsed ? '▶' : '▼';
  var collTitle = effectiveCollapsed ? '展开' : '折叠';
  var collapseBtn = createElement('button', { className: 'btn-icon btn-collapse', title: collTitle }, collIcon);
  var deleteBtn = createElement('button', { className: 'btn-icon btn-delete', title: '删除' }, '✕');
  actions.appendChild(collapseBtn);
  actions.appendChild(deleteBtn);

  header.appendChild(pinBtn);
  header.appendChild(nameSpan);

  // 分类标签
  var cat = fund.category || '';
  var catSpan = createElement('span', {
    className: 'category-tag' + (cat ? '' : ' category-tag-empty'),
    title: cat ? '双击编辑分类' : '双击添加分类',
    'data-fund-id': fund.id
  }, cat || '+');
  catSpan.setAttribute('data-original', cat);
  header.appendChild(catSpan);

  header.appendChild(actions);
  return header;
}

function renderStockBody(fund, colorMap, hlSet, filterOn, sharedStocks) {
  var wrapper = createElement('div', { className: 'stock-list-wrapper' });
  var ol = createElement('ol', { className: 'stock-list' });

  var hiddenCount = 0; // 独有 + 确定折叠

  for (var i = 0; i < fund.stocks.length; i++) {
    var stock = fund.stocks[i];
    var color = (colorMap && colorMap[stock]) ? colorMap[stock] : null;
    var isHL = hlSet && hlSet.has ? hlSet.has(stock) : false;

    // 是否独有（共同持仓筛选）
    var isUnique = !filterActive && filterOn && sharedStocks.length > 0 && !inArray(sharedStocks, stock);

    // 全局联动筛选：不在焦点中的隐藏
    var isFiltered = filterActive && !filterFocusStocks[stock];

    // 隐藏的：独有 或 被筛选掉
    var isHidden = isUnique || isFiltered;
    if (isHidden) {
      hiddenCount++;
      if (!fund.showAll) continue;
    }

    ol.appendChild(renderStockItem(stock, color, isHL, isUnique, isFiltered));
  }

  wrapper.appendChild(ol);

  // 下拉按钮（含独有和折叠的）
  if (hiddenCount > 0) {
    var dropRow = createElement('div', { className: 'dropdown-row' });
    var label = fund.showAll
      ? '⬆ 收起全部持仓（' + hiddenCount + '只）'
      : '⬇ 查看全部持仓（' + hiddenCount + '只）';
    var dropBtn = createElement('button', { className: 'btn-dropdown', type: 'button' }, label);
    dropRow.appendChild(dropBtn);
    wrapper.appendChild(dropRow);
  }

  return wrapper;
}

function renderStockItem(stockName, color, isHighlight, isUnique, isFiltered) {
  var cls = 'stock-item';
  if (isHighlight) cls += ' stock-highlight';
  if (isUnique) cls += ' stock-unique';
  if (isFiltered) cls += ' stock-folded';

  var li = createElement('li', { className: cls });
  if (isFiltered) li.setAttribute('title', '点击展开');

  var dot;
  if (color) {
    dot = createElement('span', { className: 'color-dot' });
    dot.style.backgroundColor = color;
  } else {
    dot = createElement('span', { className: 'color-dot color-dot-empty' });
  }
  li.appendChild(dot);

  // 股票名（可双击编辑）
  var nameSpan = createElement('span', { className: 'stock-name', title: '双击编辑' }, escapeHtml(stockName));
  nameSpan.setAttribute('data-original', stockName);
  li.appendChild(nameSpan);

  // 复选框：在焦点中 → 勾选
  var label = createElement('label', { className: 'stock-check-label' });
  var cb = createElement('input', { className: 'stock-check', type: 'checkbox', 'data-stock': stockName });
  if (filterActive) {
    cb.checked = !!filterFocusStocks[stockName];
  } else {
    cb.checked = !isUnique;
  }
  label.appendChild(cb);
  li.appendChild(label);

  return li;
}

function renderCardButtons() {
  var row = createElement('div', { className: 'card-btn-row' });
  row.appendChild(createElement('button', { className: 'btn-text-link', type: 'button' }, '全选'));
  row.appendChild(createElement('button', { className: 'btn-text-link', type: 'button' }, '全不选'));
  row.appendChild(createElement('button', { className: 'btn btn-confirm', type: 'button' }, '确定'));
  return row;
}

// ==========================================
//  分类筛选条
// ==========================================

function renderCategoryBar(funds) {
  var bar = $('.category-bar');
  if (!bar) {
    bar = createElement('div', { className: 'category-bar' });
    var toolbar = $('.toolbar');
    if (toolbar) toolbar.insertAdjacentElement('afterend', bar);
  }
  bar.innerHTML = '';

  // 收集所有分类
  var cats = {};
  for (var i = 0; i < funds.length; i++) {
    var c = funds[i].category || '';
    if (c.trim()) cats[c.trim()] = true;
  }

  var catNames = Object.keys(cats);
  if (catNames.length === 0) { bar.style.display = 'none'; return; }
  bar.style.display = '';

  // "全部"按钮（未分类的基金）
  var allBtn = createElement('button', {
    className: 'cat-chip' + (activeCategory === '__all__' ? ' cat-chip-active' : '')
  }, '全部');
  allBtn.addEventListener('click', function () {
    activeCategory = '__all__';
    renderAll();
  });
  bar.appendChild(allBtn);

  // "不限"按钮（显示所有基金）
  var anyBtn = createElement('button', {
    className: 'cat-chip' + (activeCategory === '' ? ' cat-chip-active' : '')
  }, '不限');
  anyBtn.addEventListener('click', function () {
    activeCategory = '';
    renderAll();
  });
  bar.appendChild(anyBtn);

  for (var j = 0; j < catNames.length; j++) {
    (function (cat) {
      var active = activeCategory === cat;
      var chip = createElement('button', {
        className: 'cat-chip' + (active ? ' cat-chip-active' : '')
      }, escapeHtml(cat));
      chip.addEventListener('click', function () {
        activeCategory = active ? '' : cat;
        renderAll();
      });
      bar.appendChild(chip);
    })(catNames[j]);
  }
}

// ==========================================
//  空状态
// ==========================================

function renderEmptyState() {
  var w = createElement('div', { className: 'empty-state' });
  w.appendChild(createElement('div', { className: 'empty-icon' }, '📊'));
  w.appendChild(createElement('h3', { className: 'empty-title' }, '还没有基金数据'));
  w.appendChild(createElement('p', { className: 'empty-desc' }, '点击上方"+ 添加基金"按钮，开始对比你的基金持仓吧'));
  return w;
}

function renderSearchEmpty(term) {
  var w = createElement('div', { className: 'empty-state' });
  w.appendChild(createElement('div', { className: 'empty-icon' }, '🔍'));
  w.appendChild(createElement('h3', { className: 'empty-title' }, '未找到匹配结果'));
  w.appendChild(createElement('p', { className: 'empty-desc' }, '没有基金或股票包含"' + escapeHtml(term) + '"'));
  return w;
}
