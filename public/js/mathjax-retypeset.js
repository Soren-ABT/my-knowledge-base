(function() {
  var pending = false;
  function retypeset() {
    if (window.MathJax && window.MathJax.typesetPromise) {
      pending = false;
      MathJax.typesetPromise().catch(function(){});
    } else {
      pending = true;
    }
  }
  document.addEventListener('astro:after-swap', retypeset);
  var tid = setInterval(function() {
    if (window._mathjaxReady && pending) { retypeset(); }
    if (window._mathjaxReady && !pending) { clearInterval(tid); }
  }, 300);
})();
