(function() {
  var CDNS = [
    'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js',
    'https://unpkg.com/mathjax@3/es5/tex-mml-chtml.js'
  ];
  function tryNext(i) {
    if (i >= CDNS.length) return;
    var s = document.createElement('script');
    s.src = CDNS[i];
    s.onload = function() { window._mathjaxReady = true; };
    s.onerror = function() { tryNext(i + 1); };
    document.head.appendChild(s);
  }
  tryNext(0);
})();
