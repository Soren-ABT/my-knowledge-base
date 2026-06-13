(function() {
  var timeEl = document.getElementById('clock-time');
  var dateEl = document.getElementById('clock-date');
  if (!timeEl || !dateEl) return;
  var weekdays = ['日','一','二','三','四','五','六'];
  function tick() {
    var now = new Date();
    timeEl.textContent = now.toLocaleTimeString('zh-CN', { hour12: false });
    dateEl.textContent = now.getFullYear() + '年' + (now.getMonth()+1) + '月' + now.getDate() + '日 星期' + weekdays[now.getDay()];
  }
  setInterval(tick, 1000);
})();
