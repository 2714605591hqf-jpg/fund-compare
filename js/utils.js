/* ==========================================
   工具函数 v2.0
   ========================================== */

/** 生成唯一 ID */
function generateId() {
  return Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8);
}

/** 快捷选择单个元素 */
function $(sel, parent) {
  return (parent || document).querySelector(sel);
}

/** 快捷选择多个元素 */
function $$(sel, parent) {
  return Array.prototype.slice.call((parent || document).querySelectorAll(sel));
}

/** 创建元素 */
function createElement(tag, attrs) {
  var el = document.createElement(tag);
  var children = [];
  for (var i = 2; i < arguments.length; i++) children.push(arguments[i]);
  for (var key in attrs) {
    if (attrs.hasOwnProperty(key)) {
      if (key === 'className') el.className = attrs[key];
      else el.setAttribute(key, attrs[key]);
    }
  }
  for (var j = 0; j < children.length; j++) {
    var child = children[j];
    if (typeof child === 'string') el.appendChild(document.createTextNode(child));
    else if (child instanceof Node) el.appendChild(child);
  }
  return el;
}

/** HTML 转义 */
function escapeHtml(str) {
  var map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(str).replace(/[&<>"']/g, function (c) { return map[c]; });
}

/** 过滤空字符串 */
function filterEmpty(arr) {
  return arr.filter(function (s) { return s.trim() !== ''; });
}
