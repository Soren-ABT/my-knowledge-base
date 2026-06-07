/**
 * Music Player Lyrics Module — vanilla JS
 * Parses LRC lyrics and displays synced scrolling lyrics panel.
 */
window.__musicPlayerLyrics = function (MP) {
  if (MP._lyrics) return;

  var _state = MP.getState();
  var _lines = [];
  var _isOpen = false;
  var _rafId = null;
  var _currentLineIdx = -1;

  /* =================================================================
     LRC Parser
     Supports: [mm:ss.xx], [mm:ss], multi-timestamp lines, offset tags
     ================================================================= */
  function parseLRC(lrcText) {
    if (!lrcText) return [];
    var lines = [];
    var rawLines = lrcText.split(/\r?\n/);
    var offset = 0;

    for (var i = 0; i < rawLines.length; i++) {
      var line = rawLines[i].trim();
      if (!line) continue;

      // Offset tag: [offset:+/-ms]
      var offsetMatch = line.match(/^\[offset:\s*([+-]?\d+)\]/i);
      if (offsetMatch) {
        offset = parseInt(offsetMatch[1]) / 1000;
        continue;
      }

      // Skip metadata tags
      if (/^\[(ti|ar|al|by|length|re|ve|lang):/i.test(line)) continue;

      // Extract all timestamps on this line
      var timestamps = [];
      var textStart = 0;
      var tagRegex = /\[(\d{1,3}):(\d{2})(?:\.(\d{2,3}))?\]/g;
      var match;

      while ((match = tagRegex.exec(line)) !== null) {
        var mins = parseInt(match[1]);
        var secs = parseInt(match[2]);
        var ms = match[3] ? parseInt(match[3]) : 0;
        if (match[3] && match[3].length === 2) ms *= 10;
        var time = mins * 60 + secs + ms / 1000 + offset;
        timestamps.push(Math.max(0, time));
        textStart = match.index + match[0].length;
      }

      var text = line.substring(textStart).trim();
      // Replace common HTML entities if present
      text = text.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

      for (var j = 0; j < timestamps.length; j++) {
        lines.push({ time: timestamps[j], text: text });
      }
    }

    // Sort by time
    lines.sort(function (a, b) {
      return a.time - b.time;
    });

    return lines;
  }

  function loadLyricsForTrack(track) {
    _lines = [];
    _currentLineIdx = -1;

    // First try embedded LRC text
    if (track.lrc) {
      _lines = parseLRC(track.lrc);
      if (_lines.length > 0) return;
    }

    // Try loading external .lrc file
    if (track.url) {
      var lrcUrl = track.url.replace(/\.[^.]+$/, ".lrc");
      fetch(lrcUrl)
        .then(function (r) {
          if (!r.ok) throw new Error("no lrc");
          return r.text();
        })
        .then(function (text) {
          _lines = parseLRC(text);
          if (_isOpen) renderLyrics();
        })
        .catch(function () {
          // No external LRC file
        });
    }
  }

  /* =================================================================
     Rendering
     ================================================================= */

  function getEl(id) {
    return document.getElementById(id);
  }

  function renderLyrics() {
    var container = getEl("music-lyrics-content");
    if (!container) return;

    if (_lines.length === 0) {
      container.innerHTML =
        '<div class="music-lyrics-empty">暂无歌词</div>';
      return;
    }

    var html = "";
    for (var i = 0; i < _lines.length; i++) {
      var cls = i === _currentLineIdx ? " current" : "";
      html +=
        '<div class="music-lyrics-line' +
        cls +
        '" data-line="' +
        i +
        '">' +
        _lines[i].text +
        "</div>";
    }
    container.innerHTML = html;

    if (_currentLineIdx >= 0) {
      scrollToCurrentLine();
    }
  }

  function scrollToCurrentLine() {
    var container = getEl("music-lyrics-content");
    if (!container) return;
    var line = container.querySelector(".music-lyrics-line.current");
    if (line) {
      line.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  function updateCurrentLine(currentTime) {
    if (_lines.length === 0) return;

    var newIdx = -1;
    for (var i = 0; i < _lines.length; i++) {
      if (_lines[i].time <= currentTime) {
        newIdx = i;
      } else {
        break;
      }
    }

    if (newIdx !== _currentLineIdx) {
      _currentLineIdx = newIdx;
      var container = getEl("music-lyrics-content");
      if (!container) return;

      // Remove all special classes
      var allLines = container.querySelectorAll(".music-lyrics-line.current, .music-lyrics-line.prevnext");
      for (var i = 0; i < allLines.length; i++) {
        allLines[i].classList.remove("current", "prevnext");
      }

      var currLine = container.querySelector(
        '.music-lyrics-line[data-line="' + newIdx + '"]'
      );
      if (currLine) {
        currLine.classList.add("current");
        currLine.scrollIntoView({ behavior: "smooth", block: "center" });
      }

      // Add prevnext class to adjacent lines (Roon-style)
      var prevLine = container.querySelector(
        '.music-lyrics-line[data-line="' + (newIdx - 1) + '"]'
      );
      var nextLine = container.querySelector(
        '.music-lyrics-line[data-line="' + (newIdx + 1) + '"]'
      );
      if (prevLine) prevLine.classList.add("prevnext");
      if (nextLine) nextLine.classList.add("prevnext");
    }
  }

  /* =================================================================
     Animation loop
     ================================================================= */

  function startLoop() {
    if (_rafId) return;
    function loop() {
      _state = MP.getState();
      if (_isOpen && _state.isPlaying) {
        updateCurrentLine(_state.currentTime);
      }
      _rafId = requestAnimationFrame(loop);
    }
    _rafId = requestAnimationFrame(loop);
  }

  function stopLoop() {
    if (_rafId) {
      cancelAnimationFrame(_rafId);
      _rafId = null;
    }
  }

  /* =================================================================
     Open / Close
     ================================================================= */

  function open() {
    _isOpen = true;
    var panel = getEl("music-lyrics-panel");
    if (panel) {
      panel.style.display = '';
      panel.classList.add("open");
    }
    var backdrop = getEl("music-lyrics-backdrop");
    if (backdrop) {
      backdrop.style.display = '';
      backdrop.classList.add("open");
    }

    _state = MP.getState();
    if (_state.currentSong && _state.currentSong.url) {
      loadLyricsForTrack(_state.currentSong);
    }
    renderLyrics();
    startLoop();

    if (_state.currentTime > 0) {
      updateCurrentLine(_state.currentTime);
    }
  }

  function close() {
    _isOpen = false;
    var panel = getEl("music-lyrics-panel");
    if (panel) panel.classList.remove("open");
    var backdrop = getEl("music-lyrics-backdrop");
    if (backdrop) backdrop.classList.remove("open");
    stopLoop();
    setTimeout(function() {
      if (!_isOpen) {
        if (panel) panel.style.display = 'none';
        if (backdrop) backdrop.style.display = 'none';
      }
    }, 350);
  }

  function toggle() {
    _isOpen ? close() : open();
  }

  /* =================================================================
     Track change listener
     ================================================================= */

  MP.subscribe(function (s) {
    var prev = _state.currentSong;
    _state = s;
    if (s.currentSong && s.currentSong.url !== (prev && prev.url)) {
      // Track changed
      _lines = [];
      _currentLineIdx = -1;
      if (_isOpen) {
        loadLyricsForTrack(s.currentSong);
        renderLyrics();
      }
    }
  });

  /* =================================================================
     Boot
     ================================================================= */

  function boot() {
    MP._lyrics = {
      open: open,
      close: close,
      toggle: toggle,
      isOpen: function () {
        return _isOpen;
      },
    };

    window.addEventListener("music-player:toggle-lyrics", function () {
      toggle();
    });
    window.addEventListener("music-player:close-lyrics", function () {
      close();
    });

    // Click backdrop to close
    var backdrop = getEl("music-lyrics-backdrop");
    if (backdrop) {
      backdrop.addEventListener("click", function () {
        close();
      });
    }
  }

  boot();
};

// Self-boot: poll for player engine (loaded with defer)
(function waitForPlayer() {
  var MP = window.__musicPlayer;
  if (MP) {
    window.__musicPlayerLyrics(MP);
  } else {
    setTimeout(waitForPlayer, 20);
  }
})();
