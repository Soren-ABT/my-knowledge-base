(function() {
  var lb = document.getElementById('gallery-lightbox');
  if (!lb) return;

  var lbImg = document.getElementById('gallery-lb-img');
  var captionEl = lb.querySelector('.gallery-lb-caption');
  var counterEl = lb.querySelector('.gallery-lb-counter');
  var cards = [];
  var currentIdx = -1;

  function collectCards() {
    cards = [];
    document.querySelectorAll('.gallery-photo-card').forEach(function(el) {
      cards.push({
        src: el.dataset.gallerySrc || '',
        title: el.dataset.galleryTitle || '',
      });
    });
  }
  collectCards();

  document.addEventListener('astro:after-swap', function() {
    var newLb = document.getElementById('gallery-lightbox');
    if (newLb) {
      lb = newLb;
      lbImg = document.getElementById('gallery-lb-img');
      captionEl = lb.querySelector('.gallery-lb-caption');
      counterEl = lb.querySelector('.gallery-lb-counter');
      collectCards();
    }
  });

  function open(idx) {
    if (!cards.length || !lbImg || !lb) return;
    currentIdx = idx;
    var card = cards[idx];
    lbImg.src = card.src;
    lbImg.alt = card.title || '';
    if (captionEl) captionEl.textContent = card.title || '';
    if (counterEl) counterEl.textContent = (idx + 1) + ' / ' + cards.length;
    lb.classList.add('active');
    lb.removeAttribute('inert');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    if (!lb) return;
    lb.classList.remove('active');
    lb.setAttribute('inert', '');
    document.body.style.overflow = '';
    currentIdx = -1;
  }

  function prev() {
    if (currentIdx < 0) return;
    open((currentIdx - 1 + cards.length) % cards.length);
  }

  function next() {
    if (currentIdx < 0) return;
    open((currentIdx + 1) % cards.length);
  }

  document.addEventListener('click', function(e) {
    var target = e.target;
    if (!target.closest('.gallery-photo-inner')) return;
    var card = target.closest('.gallery-photo-card');
    if (!card) return;
    e.preventDefault();
    var idx = parseInt(card.dataset.galleryIndex || '-1');
    if (!isNaN(idx)) open(idx);
  });

  var closeBtn = lb.querySelector('.gallery-lb-close');
  if (closeBtn) closeBtn.addEventListener('click', function(e) { e.stopPropagation(); close(); });

  var prevBtn = lb.querySelector('.gallery-lb-prev');
  var nextBtn = lb.querySelector('.gallery-lb-next');
  if (prevBtn) prevBtn.addEventListener('click', function(e) { e.stopPropagation(); prev(); });
  if (nextBtn) nextBtn.addEventListener('click', function(e) { e.stopPropagation(); next(); });

  lb.addEventListener('click', function(e) {
    var target = e.target;
    if (target === lb || target.classList.contains('gallery-lb-bg')) close();
  });

  document.addEventListener('keydown', function(e) {
    if (!lb || !lb.classList.contains('active')) return;
    if (e.key === 'Escape') { close(); return; }
    if (e.key === 'ArrowLeft') { prev(); return; }
    if (e.key === 'ArrowRight') { next(); return; }
  });

  var touchStartX = 0;
  lb.addEventListener('touchstart', function(e) {
    touchStartX = e.touches[0].clientX;
  }, { passive: true });

  lb.addEventListener('touchend', function(e) {
    var dx = (e.changedTouches[0] || e.touches[0]).clientX - touchStartX;
    if (Math.abs(dx) > 50) {
      if (dx > 0) prev();
      else next();
    }
  });
})();
