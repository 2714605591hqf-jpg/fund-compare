/* ==========================================
   数据层 v2.0
   数据结构: { id, name, stocks[], pinned, collapsed, showAll, createdAt }
   ========================================== */

var STORAGE_KEY = 'duibi_funds';

// --- 示例数据 ---
var DEMO_FUNDS = [
  {
    id: 'demo_1',
    name: '易方达蓝筹精选',
    stocks: ['贵州茅台','五粮液','泸州老窖','腾讯控股','招商银行','美的集团','中国平安','伊利股份','格力电器','恒瑞医药'],
    pinned: true, collapsed: false, showAll: false,
    createdAt: Date.now() - 2000
  },
  {
    id: 'demo_2',
    name: '中欧医疗健康',
    stocks: ['恒瑞医药','迈瑞医疗','药明康德','爱尔眼科','长春高新','片仔癀','云南白药','华兰生物','康泰生物','智飞生物'],
    pinned: false, collapsed: false, showAll: false,
    createdAt: Date.now() - 1000
  },
  {
    id: 'demo_3',
    name: '兴全趋势投资',
    stocks: ['贵州茅台','招商银行','中国平安','美的集团','万华化学','东方雨虹','隆基绿能','恩捷股份','宁德时代','保利发展'],
    pinned: false, collapsed: true, showAll: false,
    createdAt: Date.now()
  }
];

// --- 核心 API ---

function getFunds() {
  var raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try { return sortFunds(JSON.parse(raw)); }
    catch (e) { localStorage.removeItem(STORAGE_KEY); }
  }
  return initDemo();
}

function saveFunds(funds) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(funds));
}

function addFund(name, stocks) {
  var funds = getFunds();
  var fund = {
    id: generateId(),
    name: name.trim(),
    stocks: filterEmpty(stocks).slice(0, 10),
    pinned: false, collapsed: false, showAll: false,
    createdAt: Date.now()
  };
  funds.push(fund);
  saveFunds(funds);
  return fund;
}

function deleteFund(id) {
  var funds = getFunds();
  saveFunds(funds.filter(function (f) { return f.id !== id; }));
}

function updateFund(id, changes) {
  var funds = getFunds();
  var fund = funds.find(function (f) { return f.id === id; });
  if (fund) { Object.assign(fund, changes); saveFunds(funds); }
}

function togglePin(id) {
  var funds = getFunds();
  var fund = funds.find(function (f) { return f.id === id; });
  if (fund) { fund.pinned = !fund.pinned; saveFunds(funds); return fund.pinned; }
  return false;
}

function toggleCollapse(id) {
  var funds = getFunds();
  var fund = funds.find(function (f) { return f.id === id; });
  if (fund) { fund.collapsed = !fund.collapsed; saveFunds(funds); return fund.collapsed; }
  return false;
}

function toggleShowAll(id) {
  var funds = getFunds();
  var fund = funds.find(function (f) { return f.id === id; });
  if (fund) { fund.showAll = !fund.showAll; saveFunds(funds); return fund.showAll; }
  return false;
}

// --- 内部 ---

function sortFunds(funds) {
  return funds.slice().sort(function (a, b) {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    if (!a.collapsed && b.collapsed) return -1;
    if (a.collapsed && !b.collapsed) return 1;
    return b.createdAt - a.createdAt;
  });
}

function initDemo() {
  saveFunds(DEMO_FUNDS);
  return DEMO_FUNDS.slice();
}
