/* ==========================================
   搜索与筛选 v2.0
   ========================================== */

/**
 * 搜索基金
 * @returns { filtered: Fund[], highlights: { fundId: Set<stockName> } }
 */
function searchFunds(funds, term) {
  var allHighlights = {};
  for (var i = 0; i < funds.length; i++) {
    allHighlights[funds[i].id] = new Set();
  }

  if (!term || term.trim() === '') {
    return { filtered: funds.slice(), highlights: allHighlights };
  }

  var lower = term.trim().toLowerCase();
  var filtered = [];
  var highlights = {};

  for (var i = 0; i < funds.length; i++) {
    var fund = funds[i];
    var nameMatch = fund.name.toLowerCase().indexOf(lower) !== -1;
    var matchingStocks = [];

    for (var j = 0; j < fund.stocks.length; j++) {
      if (fund.stocks[j].toLowerCase().indexOf(lower) !== -1) {
        matchingStocks.push(fund.stocks[j]);
      }
    }

    if (nameMatch || matchingStocks.length > 0) {
      filtered.push(fund);
      highlights[fund.id] = new Set();
      for (var k = 0; k < matchingStocks.length; k++) {
        highlights[fund.id].add(matchingStocks[k]);
      }
    }
  }

  return { filtered: filtered, highlights: highlights };
}

/**
 * 共同持仓（≥2家持有的股票），按出现次数降序
 */
function getSharedStocks(funds) {
  if (!funds || funds.length < 2) return [];

  var countMap = {};
  for (var i = 0; i < funds.length; i++) {
    var seen = {};
    var stocks = funds[i].stocks || [];
    for (var j = 0; j < stocks.length; j++) {
      var name = stocks[j].trim();
      if (!name || seen[name]) continue;
      seen[name] = true;
      countMap[name] = (countMap[name] || 0) + 1;
    }
  }

  var result = [];
  var names = Object.keys(countMap);
  for (var k = 0; k < names.length; k++) {
    if (countMap[names[k]] >= 2) result.push(names[k]);
  }
  result.sort(function (a, b) { return countMap[b] - countMap[a]; });
  return result;
}

function inArray(arr, item) {
  for (var i = 0; i < arr.length; i++) {
    if (arr[i] === item) return true;
  }
  return false;
}
