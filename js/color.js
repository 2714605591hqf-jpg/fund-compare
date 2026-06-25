/* ==========================================
   颜色分配系统 v2.0
   ========================================== */

var PALETTE = [
  '#4A90D9','#E8734A','#50B86C','#F5A623','#BD10E0',
  '#7ED321','#D0021B','#8B572A','#00B4D8','#FF6B6B',
  '#6C5CE7','#FD79A8','#00B894','#E17055','#A29BFE',
  '#FDCB6E','#E84393','#0984E3','#00CEC9','#D980FA'
];

function buildColorMap(funds) {
  if (!funds || funds.length < 2) return {};

  var countMap = {};
  for (var i = 0; i < funds.length; i++) {
    var stocks = funds[i].stocks || [];
    var seen = {};
    for (var j = 0; j < stocks.length; j++) {
      var name = stocks[j].trim();
      if (!name || seen[name]) continue;
      seen[name] = true;
      countMap[name] = (countMap[name] || 0) + 1;
    }
  }

  var shared = [];
  var names = Object.keys(countMap);
  for (var k = 0; k < names.length; k++) {
    if (countMap[names[k]] >= 2) shared.push(names[k]);
  }
  shared.sort(function (a, b) { return countMap[b] - countMap[a]; });

  var colorMap = {};
  for (var m = 0; m < shared.length; m++) {
    colorMap[shared[m]] = PALETTE[m % PALETTE.length];
  }
  return colorMap;
}
