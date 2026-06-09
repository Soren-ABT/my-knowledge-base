/**
 * Music Player Library — Apple Music-style browser
 * Sidebar navigation + main content area with grid/list/detail views.
 * References: Apple Music web player, navidrome, Windows Media Player
 */
window.__musicPlayerLibrary = function (MP) {
  if (MP._lib) return;

  var PLAY_COUNTS_KEY = "music-library-playcounts";
  var RECENT_KEY = "music-library-recent";
  var FAVORITES_KEY = "music-library-favorites";
  var MAX_RECENT = 30;
  var _state = MP.getState();

  var lib = {
    // view: "browse" | "recentlyAdded" | "artists" | "albums" | "songs" | "genres" | "detail"
    view: "browse",
    activeGenre: null,
    activeArtist: null,
    activeYear: null,
    sortKey: "album",
    sortAsc: true,
    detailAlbumKey: null,
    isOpen: false,
    playCounts: {},
  };

  function loadPlayCounts() {
    try {
      var raw = localStorage.getItem(PLAY_COUNTS_KEY);
      if (raw) lib.playCounts = JSON.parse(raw);
    } catch (e) {
      lib.playCounts = {};
    }
  }

  function savePlayCounts() {
    try {
      localStorage.setItem(PLAY_COUNTS_KEY, JSON.stringify(lib.playCounts));
    } catch (e) {}
  }

  function recordPlay(trackKey) {
    lib.playCounts[trackKey] = (lib.playCounts[trackKey] || 0) + 1;
    savePlayCounts();
  }

  function loadRecent() {
    try {
      var raw = localStorage.getItem(RECENT_KEY);
      if (raw) lib._recentList = JSON.parse(raw);
    } catch (e) { lib._recentList = []; }
    if (!lib._recentList) lib._recentList = [];
    // Purge entries for tracks no longer in the playlist
    var validUrls = {};
    var pl = _state.playlist;
    for (var i = 0; i < pl.length; i++) { validUrls[pl[i].url] = true; }
    var filtered = [];
    for (var i = 0; i < lib._recentList.length; i++) {
      if (validUrls[lib._recentList[i].url]) filtered.push(lib._recentList[i]);
    }
    if (filtered.length !== lib._recentList.length) {
      lib._recentList = filtered;
      saveRecent();
    }
  }

  function saveRecent() {
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(lib._recentList));
    } catch (e) {}
  }

  function loadFavorites() {
    try {
      var raw = localStorage.getItem(FAVORITES_KEY);
      if (raw) lib._favorites = JSON.parse(raw);
    } catch (e) { lib._favorites = []; }
    if (!lib._favorites) lib._favorites = [];
  }

  function saveFavorites() {
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(lib._favorites));
    } catch (e) {}
  }

  function toggleFavorite(albumKey) {
    if (!lib._favorites) lib._favorites = [];
    var idx = lib._favorites.indexOf(albumKey);
    if (idx > -1) {
      lib._favorites.splice(idx, 1);
    } else {
      lib._favorites.unshift(albumKey);
    }
    saveFavorites();
    return idx === -1; // true = now favorited
  }

  function isFavorite(albumKey) {
    return lib._favorites && lib._favorites.indexOf(albumKey) > -1;
  }

  function getFavoriteAlbums() {
    if (!lib._favorites || !lib._favorites.length) return [];
    var allAlbums = getAlbums();
    var albumMap = {};
    for (var i = 0; i < allAlbums.length; i++) {
      albumMap[allAlbums[i].album + "|" + allAlbums[i].artist] = allAlbums[i];
    }
    var result = [];
    for (var i = 0; i < lib._favorites.length; i++) {
      var a = albumMap[lib._favorites[i]];
      if (a) result.push(a);
    }
    return result;
  }

  function recordRecentPlay(track) {
    if (!track || !track.url) return;
    // Remove duplicate
    for (var i = lib._recentList.length - 1; i >= 0; i--) {
      if (lib._recentList[i].url === track.url) lib._recentList.splice(i, 1);
    }
    lib._recentList.unshift({
      url: track.url,
      title: track.title,
      artist: track.artist,
      album: track.album,
      cover: track.cover,
      albumArtist: track.albumArtist,
      year: track.year,
      genre: track.genre,
      playedAt: Date.now(),
    });
    if (lib._recentList.length > MAX_RECENT) lib._recentList.length = MAX_RECENT;
    saveRecent();
  }

  function getRecentlyPlayedAlbums() {
    if (!lib._recentList || !lib._recentList.length) return [];
    var seen = {};
    var albums = [];
    for (var i = 0; i < lib._recentList.length; i++) {
      var r = lib._recentList[i];
      var key = (r.album || "Unknown") + "|" + (r.albumArtist || r.artist || "Unknown");
      if (!seen[key]) {
        seen[key] = true;
        albums.push({
          album: r.album || "Unknown",
          artist: r.albumArtist || r.artist || "Unknown",
          cover: r.cover || "",
          year: r.year || 0,
          genre: r.genre || "",
          playedAt: r.playedAt,
          tracks: [],
        });
      }
    }
    return albums.slice(0, 12);
  }

  function trackKey(t) {
    return (t.artist || "") + "|" + (t.title || "");
  }

  function fmtTime(s) {
    if (!s && s !== 0) return "0:00";
    var m = Math.floor(s / 60);
    var sec = Math.floor(s % 60);
    return m + ":" + (sec < 10 ? "0" : "") + sec;
  }

  function fmtDuration(totalSec) {
    var h = Math.floor(totalSec / 3600);
    var m = Math.floor((totalSec % 3600) / 60);
    if (h > 0) return h + "h " + m + "m";
    return m + " min";
  }

  /* =================================================================
     Data — build derived structures from playlist
     ================================================================= */

  function getAlbums() {
    var playlist = _state.playlist;
    var map = {};
    for (var i = 0; i < playlist.length; i++) {
      var t = playlist[i];
      var key = (t.album || "Unknown") + "|" + (t.albumArtist || t.artist || "Unknown");
      if (!map[key]) {
        map[key] = {
          album: t.album || "Unknown",
          artist: t.albumArtist || t.artist || "Unknown",
          cover: t.cover || "",
          year: t.year || 0,
          genre: t.genre || "",
          tracks: [],
          totalDuration: 0,
          maxYear: t.year || 0,
        };
      }
      map[key].tracks.push(t);
      map[key].totalDuration += t.duration || 0;
      if (t.year > map[key].maxYear) map[key].maxYear = t.year;
    }
    var albums = [];
    for (var k in map) {
      if (map.hasOwnProperty(k)) albums.push(map[k]);
    }
    return albums;
  }

  function getArtists() {
    var playlist = _state.playlist;
    var map = {};
    for (var i = 0; i < playlist.length; i++) {
      var t = playlist[i];
      var artistName = t.albumArtist || t.artist || "Unknown";
      if (!map[artistName]) {
        map[artistName] = {
          name: artistName,
          albums: {},
          totalTracks: 0,
          totalDuration: 0,
          genres: {},
        };
      }
      var artist = map[artistName];
      var albumKey = (t.album || "Unknown") + "|" + (t.albumArtist || t.artist || "Unknown");
      if (!artist.albums[albumKey]) {
        artist.albums[albumKey] = {
          album: t.album || "Unknown",
          cover: t.cover || "",
          year: t.year || 0,
          genre: t.genre || "",
          trackCount: 0,
        };
      }
      artist.albums[albumKey].trackCount++;
      artist.totalTracks++;
      artist.totalDuration += t.duration || 0;
      if (t.genre) {
        var genres = t.genre.split(",");
        for (var g = 0; g < genres.length; g++) {
          var gn = genres[g].trim();
          if (gn) artist.genres[gn] = (artist.genres[gn] || 0) + 1;
        }
      }
    }
    var artists = [];
    for (var n in map) {
      if (map.hasOwnProperty(n)) artists.push(map[n]);
    }
    return artists;
  }

  function getGenres() {
    var playlist = _state.playlist;
    var set = {};
    var genres = [];
    for (var i = 0; i < playlist.length; i++) {
      var g = playlist[i].genre;
      if (!g) continue;
      var parts = g.split(",");
      for (var j = 0; j < parts.length; j++) {
        var gn = parts[j].trim();
        if (gn && !set[gn]) {
          set[gn] = true;
          genres.push(gn);
        }
      }
    }
    return genres.sort();
  }

  function getAllTracks() {
    return _state.playlist.slice();
  }

  function getFilteredTracks() {
    var playlist = _state.playlist;
    var result = [];
    for (var i = 0; i < playlist.length; i++) {
      var t = playlist[i];
      if (lib.activeGenre && !hasGenre(t, lib.activeGenre)) continue;
      if (lib.activeArtist && (t.albumArtist || t.artist) !== lib.activeArtist) continue;
      if (lib.activeYear && t.year !== lib.activeYear) continue;
      if (lib.detailAlbumKey) {
        var parts = decodeURIComponent(lib.detailAlbumKey).split("|");
        var albumName = parts.slice(0, -1).join("|") || parts[0];
        var albumArtist = parts[parts.length - 1];
        if ((t.album || "Unknown") !== albumName || (t.albumArtist || t.artist || "Unknown") !== albumArtist) continue;
      }
      result.push(t);
    }
    return result;
  }

  function hasGenre(t, genre) {
    if (!t.genre) return false;
    return t.genre.toLowerCase().indexOf(genre.toLowerCase()) > -1;
  }

  function findTrackIndex(track) {
    var playlist = _state.playlist;
    for (var i = 0; i < playlist.length; i++) {
      if (playlist[i].url === track.url) return i;
    }
    return -1;
  }

  /* =================================================================
     Rendering helpers
     ================================================================= */

  function getEl(id) {
    return document.getElementById(id);
  }

  function escapeHTML(str) {
    var div = document.createElement("div");
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  /* =================================================================
     Dynamic color extraction (Apple Music-style per-content theming)
     ================================================================= */

  var _dominantColors = {}; // cache: url → color

  function extractDominantColor(imageUrl, callback) {
    if (_dominantColors[imageUrl]) {
      callback(_dominantColors[imageUrl]);
      return;
    }
    // Default gradient color
    if (!imageUrl) {
      callback(null);
      return;
    }
    var img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = function () {
      try {
        var canvas = document.createElement("canvas");
        var size = 50; // sample at 50x50 for performance
        canvas.width = size;
        canvas.height = size;
        var ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, size, size);
        var data = ctx.getImageData(0, 0, size, size).data;
        var r = 0, g = 0, b = 0, count = 0;
        // Sample every 4th pixel for performance
        for (var i = 0; i < data.length; i += 16) {
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          count++;
        }
        r = Math.round(r / count);
        g = Math.round(g / count);
        b = Math.round(b / count);
        // Boost saturation slightly (Apple Music-style vibrant colors)
        var max = Math.max(r, g, b);
        var min = Math.min(r, g, b);
        var s = max > 0 ? (max - min) / max : 0;
        if (s < 0.2 && max > 40) {
          // Desaturated - shift to a warmer hue
          r = Math.min(255, r + 20);
          g = Math.min(255, g + 5);
        }
        var color = "rgb(" + r + "," + g + "," + b + ")";
        _dominantColors[imageUrl] = color;
        callback(color);
      } catch (e) {
        _dominantColors[imageUrl] = null;
        callback(null);
      }
    };
    img.onerror = function () {
      _dominantColors[imageUrl] = null;
      callback(null);
    };
    img.src = imageUrl;
  }

  function applyHeroTheme(imageUrl, targetEl) {
    if (!targetEl) return;
    extractDominantColor(imageUrl, function (color) {
      if (color) {
        targetEl.style.setProperty("--hero-accent", color);
        targetEl.classList.add("has-hero-theme");
      } else {
        targetEl.classList.remove("has-hero-theme");
      }
    });
  }

  /* =================================================================
     View transition
     ================================================================= */

  function renderWithTransition(renderFn) {
    var container = getEl("music-lib-content");
    if (!container) { renderFn(); return; }
    container.style.opacity = "0";
    container.style.transition = "opacity 0.15s ease";
    setTimeout(function () {
      renderFn();
      // Force reflow
      container.offsetHeight;
      container.style.opacity = "1";
    }, 150);
  }

  /* =================================================================
     Sidebar
     ================================================================= */

  function renderSidebar() {
    var sidebar = getEl("music-lib-sidebar-nav");
    if (!sidebar) return;

    var items = [
      { id: "browse", icon: "browse", label: "浏览", desc: "Browse" },
      { id: "recentlyAdded", icon: "clock", label: "最近添加", desc: "Recently Added" },
      { id: "favorites", icon: "heart", label: "收藏", desc: "Favorites" },
      { id: "artists", icon: "artists", label: "艺术家", desc: "Artists" },
      { id: "albums", icon: "albums", label: "专辑", desc: "Albums" },
      { id: "songs", icon: "songs", label: "歌曲", desc: "Songs" },
      { id: "genres", icon: "genres", label: "流派", desc: "Genres" },
      { id: "years", icon: "years", label: "年份", desc: "Years" },
    ];

    var html = "";
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var active = lib.view === item.id ? " active" : "";
      html +=
        '<div class="music-lib-sidebar-item' + active + '" data-nav="' + item.id + '">' +
        '<span class="music-lib-sidebar-icon">' + sidebarIcon(item.icon) + "</span>" +
        '<span class="music-lib-sidebar-label">' + item.label + "</span>" +
        "</div>";
    }

    // Stats at bottom of sidebar
    var playlist = _state.playlist;
    html += '<div class="music-lib-sidebar-stats">';
    html += '<div class="music-lib-sidebar-stat"><span class="stat-dot"></span><span class="stat-num">' + playlist.length + "</span> 首歌曲</div>";
    html += '<div class="music-lib-sidebar-stat"><span class="stat-dot"></span><span class="stat-num">' + getAlbums().length + "</span> 张专辑</div>";
    html += '<div class="music-lib-sidebar-stat"><span class="stat-dot"></span><span class="stat-num">' + getArtists().length + "</span> 位艺术家</div>";
    html += "</div>";

    sidebar.innerHTML = html;

    // Bind clicks
    sidebar.querySelectorAll(".music-lib-sidebar-item").forEach(function (el) {
      el.addEventListener("click", function () {
        navigateTo(this.dataset.nav);
      });
    });
  }

  function sidebarIcon(type) {
    var icons = {
      browse: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="18" height="18"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
      clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="18" height="18"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
      artists: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="18" height="18"><circle cx="12" cy="8" r="4"/><path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/></svg>',
      albums: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="18" height="18"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>',
      songs: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="18" height="18"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
      genres: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="18" height="18"><path d="M4 20V4M12 20V10M20 20V6"/></svg>',
      years: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="18" height="18"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
      heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="18" height="18"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>',
    };
    return icons[type] || "";
  }

  function navigateTo(view) {
    lib.view = view;
    lib.detailAlbumKey = null;
    lib.activeArtist = null;
    lib.activeGenre = null;
    lib.activeYear = null;
    lib._searchQuery = "";
    resetSearchFilter();
    var searchInput = getEl("music-lib-search");
    if (searchInput) searchInput.value = "";
    render();
  }

  /* =================================================================
     Top Bar
     ================================================================= */

  function renderTopBar() {
    var titleEl = getEl("music-lib-title");
    if (titleEl) {
      var titles = {
        browse: "浏览",
        recentlyPlayed: "最近播放",
        recentlyAdded: "最近添加",
        favorites: "收藏",
        artists: "艺术家",
        albums: "专辑",
        songs: "歌曲",
        genres: "流派",
        years: "年份",
        detail: "专辑详情",
      };
      titleEl.textContent = titles[lib.view] || "音乐库";
    }

    // Back button visibility
    var backBtn = getEl("music-lib-back");
    if (backBtn) {
      backBtn.style.visibility = (lib.view === "detail" || lib.activeArtist) ? "visible" : "hidden";
    }

    // View toggle buttons only show in albums view
    var toggles = getEl("music-lib-view-toggles");
    if (toggles) {
      toggles.style.display = (lib.view === "albums" || lib.view === "recentlyAdded" || lib.view === "recentlyPlayed") ? "flex" : "none";
    }

    // Update view toggle active state
    var btnGrid = getEl("music-lib-view-grid");
    var btnList = getEl("music-lib-view-list");
    if (btnGrid) btnGrid.classList.toggle("active", lib.view === "albums" || lib.view === "browse" || lib.view === "recentlyAdded" || lib.view === "recentlyPlayed");
    if (btnList) btnList.classList.toggle("active", lib.view === "songs");
  }

  /* =================================================================
     Browse View — featured sections
     ================================================================= */

  function renderBrowse() {
    var container = getEl("music-lib-content");
    if (!container) return;
    container.className = "music-library-content music-library-browse";

    var albums = getAlbums();
    var artists = getArtists();
    var playlist = _state.playlist;

    // Sort albums by year descending for "Recently Added" feel
    albums.sort(function (a, b) { return (b.maxYear || b.year) - (a.maxYear || a.year); });

    var html = "";

    // Hero section — now playing or first album
    if (_state.currentSong && _state.currentSong.url) {
      html +=
        '<div class="music-lib-hero" id="music-lib-hero">' +
        '<div class="music-lib-hero-cover">' +
        (_state.currentSong.cover
          ? '<img src="' + _state.currentSong.cover + '" alt="" crossorigin="anonymous" />'
          : '<div class="music-lib-hero-cover-placeholder"></div>') +
        "</div>" +
        '<div class="music-lib-hero-info">' +
        '<div class="music-lib-hero-label">正在播放</div>' +
        '<div class="music-lib-hero-title">' + escapeHTML(_state.currentSong.title || "--") + "</div>" +
        '<div class="music-lib-hero-subtitle">' + escapeHTML(_state.currentSong.artist || "--") + "</div>" +
        (_state.currentSong.album ? '<div class="music-lib-hero-album">' + escapeHTML(_state.currentSong.album) + "</div>" : "") +
        '<button class="music-lib-hero-play-btn" id="music-lib-hero-play-btn"><svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14" style="margin-right:2px"><path d="M8 5v14l11-7z"/></svg>沉浸播放</button>' +
        "</div>" +
        "</div>";

      // Apply dynamic hero theme from album art
      if (_state.currentSong.cover) {
        setTimeout(function() {
          var heroEl = document.getElementById("music-lib-hero");
          if (heroEl) applyHeroTheme(_state.currentSong.cover, heroEl);
          // Also apply to detail hero if visible
          var detailHero = document.querySelector(".music-lib-detail-hero");
          if (detailHero) applyHeroTheme(_state.currentSong.cover, detailHero);
        }, 50);
      }
    }

    // Recently Played section (Apple Music "Heavy Rotation" style)
    var recentPlayedAlbums = getRecentlyPlayedAlbums();
    if (recentPlayedAlbums.length > 0) {
      html += '<div class="music-lib-section">';
      html +=
        '<div class="music-lib-section-header">' +
        '<span class="music-lib-section-title">最近播放</span>' +
        '<div class="music-lib-section-actions">' +
        '<button class="music-lib-section-play-btn" title="播放最近播放" aria-label="播放最近播放"><svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><path d="M8 5v14l11-7z"/></svg></button>' +
        '<button class="music-lib-section-more" data-nav="recentlyPlayed">显示全部 →</button>' +
        "</div>" +
        "</div>";
      html += '<div class="music-lib-horizontal-scroll">';
      for (var i = 0; i < Math.min(recentPlayedAlbums.length, 8); i++) {
        html += renderAlbumCard(recentPlayedAlbums[i], "small");
      }
      html += "</div></div>";
    }

    // Recently Added section
    var recentAlbums = albums.slice(0, 8);
    if (recentAlbums.length > 0) {
      html += '<div class="music-lib-section">';
      html +=
        '<div class="music-lib-section-header">' +
        '<span class="music-lib-section-title">最近添加</span>' +
        '<div class="music-lib-section-actions">' +
        '<button class="music-lib-section-shuffle-btn" title="随机播放最近添加" aria-label="随机播放最近添加"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="12" height="12"><path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg></button>' +
        '<button class="music-lib-section-more" data-nav="recentlyAdded">显示全部 →</button>' +
        "</div>" +
        "</div>";
      html += '<div class="music-lib-horizontal-scroll">';
      for (var i = 0; i < recentAlbums.length; i++) {
        html += renderAlbumCard(recentAlbums[i], "small");
      }
      html += "</div></div>";
    }

    // Artists section
    var topArtists = artists.slice(0, 8);
    if (topArtists.length > 0) {
      html += '<div class="music-lib-section">';
      html +=
        '<div class="music-lib-section-header">' +
        '<span class="music-lib-section-title">艺术家</span>' +
        '<button class="music-lib-section-more" data-nav="artists">显示全部 →</button>' +
        "</div>";
      html += '<div class="music-lib-horizontal-scroll">';
      for (var i = 0; i < topArtists.length; i++) {
        html += renderArtistCircle(topArtists[i]);
      }
      html += "</div></div>";
    }

    // All Albums grid
    if (albums.length > 0) {
      html += '<div class="music-lib-section">';
      html +=
        '<div class="music-lib-section-header">' +
        '<span class="music-lib-section-title">所有专辑</span>' +
        '<div class="music-lib-section-actions">' +
        '<button class="music-lib-section-more" data-nav="albums">显示全部 →</button>' +
        "</div>" +
        "</div>";
      html += '<div class="music-library-grid">';
      var displayAlbums = albums.slice(0, 12);
      for (var i = 0; i < displayAlbums.length; i++) {
        html += renderAlbumCard(displayAlbums[i], "normal");
      }
      html += "</div></div>";
    }

    // Genre quick access
    var genres = getGenres().slice(0, 10);
    if (genres.length > 0) {
      html += '<div class="music-lib-section">';
      html +=
        '<div class="music-lib-section-header">' +
        '<span class="music-lib-section-title">流派</span>' +
        '<button class="music-lib-section-more" data-nav="genres">显示全部 →</button>' +
        "</div>";
      html += '<div class="music-lib-genre-grid">';
      for (var i = 0; i < genres.length; i++) {
        html +=
          '<div class="music-lib-genre-card" data-genre="' + genres[i].replace(/"/g, "&quot;") + '">' +
          '<div class="music-lib-genre-card-name">' + genres[i] + "</div>" +
          "</div>";
      }
      html += "</div></div>";
    }

    if (!playlist.length) {
      html = '<div class="music-lib-empty">音乐库为空</div>';
    }

    container.innerHTML = html;
    bindBrowseEvents();
    initScrollArrows();
  }

  function initScrollArrows() {
    var container = getEl("music-lib-content");
    if (!container) return;
    container.querySelectorAll(".music-lib-horizontal-scroll").forEach(function (scroll) {
      // Skip if already wrapped
      if (scroll.parentElement.classList.contains("music-lib-scroll-wrapper")) return;

      var wrapper = document.createElement("div");
      wrapper.className = "music-lib-scroll-wrapper";
      scroll.parentNode.insertBefore(wrapper, scroll);
      wrapper.appendChild(scroll);

      var leftArrow = document.createElement("button");
      leftArrow.className = "music-lib-scroll-arrow music-lib-scroll-arrow--left";
      leftArrow.setAttribute("aria-label", "向左滚动");
      leftArrow.innerHTML = '<svg viewBox="0 0 9 31" width="9" height="31" fill="currentColor"><path d="M8.09 29.46c-.2-.3-.5-.6-.8-.9L1.62 22.9c-.5-.56-.8-1.02-.9-1.53-.1-.5 0-1 .2-1.46.21-.46.53-.92.97-1.43l5.64-5.66c.3-.3.6-.6.8-.9.2-.3.1-.6-.1-.76-.2-.2-.5-.22-.8-.12-.3.1-.6.3-.9.6L.78 17.3c-.36.43-.63.78-.81 1.22-.18.44-.24.94-.1 1.47.14.53.45 1.04.83 1.49l5.76 5.76c.27.27.55.5.83.6.28.1.57.1.8-.12.24-.2.27-.48.1-.76-.16-.27-.5-.57-.8-.87L2.5 21.4c-.4-.45-.7-.91-.9-1.37-.2-.47-.27-.92-.17-1.38.1-.47.4-.93.9-1.42l5.66-5.66c.3-.3.57-.5.87-.6.3-.1.6-.1.8.12.25.2.3.49.1.76Z"/></svg>';
      wrapper.appendChild(leftArrow);

      var rightArrow = document.createElement("button");
      rightArrow.className = "music-lib-scroll-arrow music-lib-scroll-arrow--right";
      rightArrow.setAttribute("aria-label", "向右滚动");
      rightArrow.innerHTML = '<svg viewBox="0 0 9 31" width="9" height="31" fill="currentColor"><path d="M.91 1.54c.2.3.5.6.8.9l5.67 5.66c.5.56.8 1.02.9 1.53.1.5 0 1-.2 1.46-.21.46-.53.92-.97 1.43L1.37 18.1c-.3.3-.6.6-.8.9-.2.3-.1.6.1.76.2.2.5.22.8.12.3-.1.6-.3.9-.6l5.74-5.74c.36-.43.63-.78.81-1.22.18-.44.24-.94.1-1.47-.14-.53-.45-1.04-.83-1.49L1.63 3.6c-.27-.27-.55-.5-.83-.6-.28-.1-.57-.1-.8.12-.24.2-.27.48-.1.76.16.27.5.57.8.87l5.79 5.79c.4.45.7.91.9 1.37.2.47.27.92.17 1.38-.1.47-.4.93-.9 1.42L1.37 19.37c-.3.3-.57.5-.87.6-.3.1-.6.1-.8-.12-.25-.2-.3-.49-.1-.76Z"/></svg>';
      wrapper.appendChild(rightArrow);

      function updateArrowVisibility() {
        var canScrollLeft = scroll.scrollLeft > 2;
        var canScrollRight = scroll.scrollLeft < scroll.scrollWidth - scroll.clientWidth - 2;
        leftArrow.classList.toggle("visible", canScrollLeft);
        rightArrow.classList.toggle("visible", canScrollRight);
      }

      leftArrow.addEventListener("click", function () {
        scroll.scrollBy({ left: -scroll.clientWidth * 0.75, behavior: "smooth" });
      });
      rightArrow.addEventListener("click", function () {
        scroll.scrollBy({ left: scroll.clientWidth * 0.75, behavior: "smooth" });
      });

      scroll.addEventListener("scroll", updateArrowVisibility);
      // Initial visibility check
      setTimeout(updateArrowVisibility, 100);
    });
  }

  function bindBrowseEvents() {
    var container = getEl("music-lib-content");
    if (!container) return;

    // "Show all" buttons
    container.querySelectorAll(".music-lib-section-more").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        navigateTo(this.dataset.nav);
      });
    });

    // Album cards
    container.querySelectorAll(".music-lib-album-card").forEach(function (card) {
      card.addEventListener("click", function () {
        showAlbumDetail(this.dataset.albumKey);
      });
    });

    // Artist circles
    container.querySelectorAll(".music-lib-artist-circle").forEach(function (el) {
      el.addEventListener("click", function () {
        showArtistView(this.dataset.artist);
      });
    });

    // Genre cards
    container.querySelectorAll(".music-lib-genre-card").forEach(function (el) {
      el.addEventListener("click", function () {
        lib.activeGenre = this.dataset.genre;
        lib.view = "albums";
        render();
      });
    });

    // Section play buttons
    container.querySelectorAll(".music-lib-section-play-btn").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        // Find the nearest section and play its first track
        var section = this.closest(".music-lib-section");
        if (section) {
          var firstCard = section.querySelector(".music-lib-album-card");
          if (firstCard) {
            var albumKey = firstCard.dataset.albumKey;
            if (albumKey) {
              var parts = decodeURIComponent(albumKey).split("|");
              var albumName = parts.slice(0, -1).join("|") || parts[0];
              var albumArtist = parts[parts.length - 1];
              // Find first track of this album
              var playlist = _state.playlist;
              for (var i = 0; i < playlist.length; i++) {
                if ((playlist[i].album || "Unknown") === albumName &&
                    (playlist[i].albumArtist || playlist[i].artist || "Unknown") === albumArtist) {
                  MP.playIndex(i);
                  break;
                }
              }
            }
          }
        }
      });
    });

    // Section shuffle buttons
    container.querySelectorAll(".music-lib-section-shuffle-btn").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        var section = this.closest(".music-lib-section");
        if (section) {
          // Collect all track indices from the section
          var trackIndices = [];
          var cards = section.querySelectorAll(".music-lib-album-card");
          cards.forEach(function (card) {
            var albumKey = card.dataset.albumKey;
            if (albumKey) {
              var parts = decodeURIComponent(albumKey).split("|");
              var albumName = parts.slice(0, -1).join("|") || parts[0];
              var albumArtist = parts[parts.length - 1];
              var playlist = _state.playlist;
              for (var i = 0; i < playlist.length; i++) {
                if ((playlist[i].album || "Unknown") === albumName &&
                    (playlist[i].albumArtist || playlist[i].artist || "Unknown") === albumArtist) {
                  trackIndices.push(i);
                }
              }
            }
          });
          if (trackIndices.length > 0) {
            if (!MP.getState().isShuffled) MP.toggleShuffle();
            var randomIdx = trackIndices[Math.floor(Math.random() * trackIndices.length)];
            MP.playIndex(randomIdx);
          }
        }
      });
    });

    // Hero play button → open immersive mode
    var heroPlayBtn = document.getElementById("music-lib-hero-play-btn");
    if (heroPlayBtn) {
      heroPlayBtn.addEventListener("click", function(e) {
        e.stopPropagation();
        window.dispatchEvent(new CustomEvent('music-player:open-immersive'));
      });
    }

    // Hero cover double-click → immersive mode
    var heroCover = container.querySelector(".music-lib-hero-cover");
    if (heroCover) {
      heroCover.addEventListener("dblclick", function(e) {
        e.stopPropagation();
        window.dispatchEvent(new CustomEvent('music-player:open-immersive'));
      });
    }
  }

  /* =================================================================
     Album Card (reusable)
     ================================================================= */

  function renderAlbumCard(a, size) {
    var isSmall = size === "small";
    var cls = isSmall ? "music-lib-album-card music-lib-album-card-sm" : "music-lib-album-card";
    var albumKey = a.album + "|" + a.artist;
    var isFav = isFavorite(albumKey);
    return (
      '<div class="' + cls + '" data-album-key="' + encodeURIComponent(albumKey) + '">' +
      '<div class="music-lib-album-cover">' +
      (a.cover
        ? '<img src="' + a.cover + '" alt="" loading="lazy" onerror="this.parentElement.innerHTML=\'<div class=&quot;music-lib-album-cover-placeholder&quot;></div>\'" />'
        : '<div class="music-lib-album-cover-placeholder">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" width="40" height="40"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>' +
          "</div>") +
      '<div class="music-lib-album-cover-overlay">' +
      '<svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M8 5v14l11-7z"/></svg>' +
      '<button class="music-lib-album-love' + (isFav ? " loved" : "") + '" data-album-key="' + encodeURIComponent(albumKey) + '" aria-label="' + (isFav ? "取消收藏" : "收藏") + '" title="' + (isFav ? "取消收藏" : "收藏") + '">' +
      '<svg viewBox="0 0 24 24" width="14" height="14"><path d="' + (isFav ? "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" : "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z") + '" fill="' + (isFav ? "#ef4444" : "none") + '" stroke="currentColor" stroke-width="' + (isFav ? "0" : "1.5") + '"/></svg>' +
      "</button>" +
      "</div>" +
      "</div>" +
      '<div class="music-lib-album-name">' + escapeHTML(a.album) + "</div>" +
      '<div class="music-lib-album-artist">' + escapeHTML(a.artist) + "</div>" +
      (!isSmall
        ? '<div class="music-lib-album-meta">' + a.tracks.length + " 首 · " + fmtDuration(a.totalDuration) + "</div>"
        : "") +
      "</div>"
    );
  }

  /* =================================================================
     Artist Circle
     ================================================================= */

  function renderArtistCircle(artist) {
    // Find a cover from the artist's albums
    var cover = "";
    for (var k in artist.albums) {
      if (artist.albums.hasOwnProperty(k) && artist.albums[k].cover) {
        cover = artist.albums[k].cover;
        break;
      }
    }
    return (
      '<div class="music-lib-artist-circle" data-artist="' + escapeHTML(artist.name) + '">' +
      '<div class="music-lib-artist-avatar">' +
      (cover
        ? '<img src="' + cover + '" alt="" loading="lazy" onerror="this.parentElement.innerHTML=\'<div class=&quot;music-lib-artist-avatar-placeholder&quot;></div>\'" />'
        : '<div class="music-lib-artist-avatar-placeholder">' +
          '<svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28"><circle cx="12" cy="8" r="4"/><path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/></svg>' +
          "</div>") +
      "</div>" +
      '<div class="music-lib-artist-name">' + escapeHTML(artist.name) + "</div>" +
      "</div>"
    );
  }

  /* =================================================================
     Recently Played View
     ================================================================= */

  function renderRecentlyPlayed() {
    var container = getEl("music-lib-content");
    if (!container) return;
    container.className = "music-library-content";

    var albums = getRecentlyPlayedAlbums();

    if (albums.length === 0) {
      container.innerHTML = '<div class="music-lib-empty">还没有播放记录</div>';
      return;
    }

    // Merge with full album data for track counts/duration
    var allAlbums = getAlbums();
    var albumMap = {};
    for (var i = 0; i < allAlbums.length; i++) {
      albumMap[allAlbums[i].album + "|" + allAlbums[i].artist] = allAlbums[i];
    }
    for (var i = 0; i < albums.length; i++) {
      var merged = albumMap[albums[i].album + "|" + albums[i].artist];
      if (merged) {
        albums[i].tracks = merged.tracks;
        albums[i].totalDuration = merged.totalDuration;
      }
    }

    var html = '<div class="music-library-grid">';
    for (var i = 0; i < albums.length; i++) {
      html += renderAlbumCard(albums[i], "normal");
    }
    html += "</div>";
    container.innerHTML = html;
    bindAlbumCardClicks();
  }

  /* =================================================================
     Favorites View
     ================================================================= */

  function renderFavorites() {
    var container = getEl("music-lib-content");
    if (!container) return;
    container.className = "music-library-content";

    var albums = getFavoriteAlbums();

    if (albums.length === 0) {
      container.innerHTML = '<div class="music-lib-empty">还没有收藏专辑<br><small style="opacity:0.7">点击专辑封面上的 ♡ 图标收藏专辑</small></div>';
      return;
    }

    var html = '<div class="music-library-grid">';
    for (var i = 0; i < albums.length; i++) {
      html += renderAlbumCard(albums[i], "normal");
    }
    html += "</div>";
    container.innerHTML = html;
    bindAlbumCardClicks();
  }

  /* =================================================================
     Recently Added View
     ================================================================= */

  function renderRecentlyAdded() {
    var container = getEl("music-lib-content");
    if (!container) return;
    container.className = "music-library-content";

    var albums = getAlbums();
    albums.sort(function (a, b) { return (b.maxYear || b.year) - (a.maxYear || a.year); });

    if (albums.length === 0) {
      container.innerHTML = '<div class="music-lib-empty">没有找到专辑</div>';
      return;
    }

    var html = '<div class="music-library-grid">';
    for (var i = 0; i < albums.length; i++) {
      html += renderAlbumCard(albums[i], "normal");
    }
    html += "</div>";
    container.innerHTML = html;
    bindAlbumCardClicks();
  }

  /* =================================================================
     Artists View
     ================================================================= */

  function renderArtists() {
    var container = getEl("music-lib-content");
    if (!container) return;
    container.className = "music-library-content";

    if (lib.activeArtist) {
      renderArtistDetail();
      return;
    }

    var artists = getArtists();
    artists.sort(function (a, b) { return a.name.localeCompare(b.name); });

    if (artists.length === 0) {
      container.innerHTML = '<div class="music-lib-empty">没有找到艺术家</div>';
      return;
    }

    var html = '<div class="music-library-grid music-library-artists-grid">';
    for (var i = 0; i < artists.length; i++) {
      html += renderArtistCircle(artists[i]);
    }
    html += "</div>";
    container.innerHTML = html;

    container.querySelectorAll(".music-lib-artist-circle").forEach(function (el) {
      el.addEventListener("click", function () {
        showArtistView(this.dataset.artist);
      });
    });
  }

  function showArtistView(artistName) {
    lib.activeArtist = artistName;
    lib.view = "artists";
    render();
  }

  function renderArtistDetail() {
    var container = getEl("music-lib-content");
    if (!container) return;
    container.className = "music-library-content";

    var name = lib.activeArtist;
    var artists = getArtists();
    var artist = null;
    for (var i = 0; i < artists.length; i++) {
      if (artists[i].name === name) { artist = artists[i]; break; }
    }
    if (!artist) return;

    // Find cover
    var cover = "";
    for (var k in artist.albums) {
      if (artist.albums.hasOwnProperty(k) && artist.albums[k].cover) {
        cover = artist.albums[k].cover;
        break;
      }
    }

    var albumKeys = Object.keys(artist.albums);
    var albumList = [];
    for (var i = 0; i < albumKeys.length; i++) {
      albumList.push(artist.albums[albumKeys[i]]);
    }
    albumList.sort(function (a, b) { return (b.year || 0) - (a.year || 0); });

    var topGenres = [];
    for (var g in artist.genres) {
      if (artist.genres.hasOwnProperty(g)) {
        topGenres.push({ name: g, count: artist.genres[g] });
      }
    }
    topGenres.sort(function (a, b) { return b.count - a.count; });
    topGenres = topGenres.slice(0, 5);

    var html =
      '<div class="music-lib-artist-detail">' +
      '<div class="music-lib-artist-hero">' +
      '<div class="music-lib-artist-hero-cover">' +
      (cover
        ? '<img src="' + cover + '" alt="" />'
        : '<div class="music-lib-artist-avatar-placeholder" style="width:100px;height:100px;border-radius:50%;"><svg viewBox="0 0 24 24" fill="currentColor" width="40" height="40"><circle cx="12" cy="8" r="4"/><path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/></svg></div>') +
      "</div>" +
      '<div class="music-lib-artist-hero-info">' +
      '<div class="music-lib-artist-hero-name">' + escapeHTML(artist.name) + "</div>" +
      '<div class="music-lib-artist-hero-meta">' +
      albumList.length + " 张专辑 · " + artist.totalTracks + " 首歌曲" +
      "</div>" +
      (topGenres.length > 0
        ? '<div class="music-lib-artist-hero-genres">' +
          topGenres.map(function (g) { return '<span class="music-lib-tag">' + g.name + "</span>"; }).join("") +
          "</div>"
        : "") +
      '<div class="music-lib-artist-hero-actions">' +
      '<button class="music-lib-btn music-lib-btn-primary" id="music-lib-artist-play"><svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14" style="margin-right:3px;vertical-align:-2px"><path d="M8 5v14l11-7z"/></svg>播放</button>' +
      '<button class="music-lib-btn" id="music-lib-artist-shuffle"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="14" height="14" style="margin-right:3px;vertical-align:-2px"><path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg>随机播放</button>' +
      "</div>" +
      "</div>" +
      "</div>" +
      '<div class="music-lib-section">' +
      '<div class="music-lib-section-header"><span class="music-lib-section-title">专辑</span></div>' +
      '<div class="music-library-grid">';

    for (var i = 0; i < albumList.length; i++) {
      var a = albumList[i];
      html += renderAlbumCard({ album: a.album, artist: artist.name, cover: a.cover, year: a.year, genre: a.genre, tracks: [], totalDuration: 0 }, "normal");
    }

    html += "</div></div>";

    // Top tracks
    var artistTracks = getFilteredTracks();
    if (artistTracks.length > 0) {
      artistTracks.sort(function (a, b) {
        var ca = lib.playCounts[trackKey(a)] || 0;
        var cb = lib.playCounts[trackKey(b)] || 0;
        return cb - ca;
      });
      var topTracks = artistTracks.slice(0, 10);

      html += '<div class="music-lib-section">';
      html += '<div class="music-lib-section-header"><span class="music-lib-section-title">热门歌曲</span></div>';
      html += '<div class="music-library-track-list">';
      for (var i = 0; i < topTracks.length; i++) {
        html += renderTrackRow(topTracks[i], i + 1);
      }
      html += "</div></div>";
    }

    html += "</div>";
    container.innerHTML = html;

    // Bind
    bindAlbumCardClicks();
    bindTrackClicks();
    bindArtistActions(artist);
  }

  function renderTrackRow(t, idx) {
    var isCurrent = _state.currentSong && _state.currentSong.url === t.url;
    var tkey = trackKey(t);
    var plays = lib.playCounts[tkey] || 0;
    var trackIndex = findTrackIndex(t);
    return (
      '<div class="music-lib-track-row' + (isCurrent ? " current" : "") + '" data-track-index="' + trackIndex + '">' +
      '<div class="music-lib-track-row-idx">' + (isCurrent ? '<span class="music-lib-playing-indicator"></span>' : idx) + "</div>" +
      '<div class="music-lib-track-row-info">' +
      '<div class="music-lib-track-row-title">' + escapeHTML(t.title) + "</div>" +
      '<div class="music-lib-track-row-artist">' + escapeHTML(t.artist) + (t.album ? " · " + escapeHTML(t.album) : "") + "</div>" +
      "</div>" +
      '<button class="music-lib-track-info-btn" data-track-index="' + trackIndex + '" title="属性" aria-label="属性">ⓘ</button>' +
      (t.qualityBadge ? '<div class="music-lib-track-row-quality" style="background:' + qualityColor(t.qualityTier) + ';color:' + (["studioMaster", "hiRes", "highLossy"].indexOf(t.qualityTier) >= 0 ? "#000" : "#fff") + '">' + t.qualityBadge + "</div>" : '<div class="music-lib-track-row-quality"></div>') +
      '<div class="music-lib-track-row-plays">' + (plays > 0 ? plays + "次" : "") + "</div>" +
      '<div class="music-lib-track-row-duration">' + fmtTime(t.duration) + "</div>" +
      "</div>"
    );
  }

  function qualityColor(tier) {
    var colors = {
      studioMaster: "#ffd700", hiRes: "#ff8c00", cdQuality: "#4caf50",
      lossless: "#2196f3", highLossy: "#ff9800", standardLossy: "#9e9e9e", lowLossy: "#757575",
    };
    return colors[tier] || "#888";
  }

  function bindArtistActions(artist) {
    var playBtn = getEl("music-lib-artist-play");
    var shuffleBtn = getEl("music-lib-artist-shuffle");

    // Get first track of the artist
    var tracks = getFilteredTracks();
    if (tracks.length === 0) return;

    if (playBtn) {
      playBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        var idx = findTrackIndex(tracks[0]);
        if (idx >= 0) MP.playIndex(idx);
      });
    }
    if (shuffleBtn) {
      shuffleBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        if (!MP.getState().isShuffled) MP.toggleShuffle();
        var randomIdx = findTrackIndex(tracks[Math.floor(Math.random() * tracks.length)]);
        if (randomIdx >= 0) MP.playIndex(randomIdx);
      });
    }
  }

  /* =================================================================
     Albums View
     ================================================================= */

  function renderAlbums() {
    var container = getEl("music-lib-content");
    if (!container) return;
    container.className = "music-library-content";

    var albums = getAlbums();

    // Filter by genre
    if (lib.activeGenre) {
      albums = albums.filter(function (a) {
        return a.genre && a.genre.toLowerCase().indexOf(lib.activeGenre.toLowerCase()) > -1;
      });
    }

    // Sort
    albums.sort(function (a, b) {
      var va, vb;
      switch (lib.sortKey) {
        case "title": va = a.album.toLowerCase(); vb = b.album.toLowerCase(); break;
        case "artist": va = a.artist.toLowerCase(); vb = b.artist.toLowerCase(); break;
        case "year": va = a.year || 0; vb = b.year || 0; break;
        case "duration": va = a.totalDuration; vb = b.totalDuration; break;
        default: va = a.album.toLowerCase(); vb = b.album.toLowerCase();
      }
      if (va < vb) return lib.sortAsc ? -1 : 1;
      if (va > vb) return lib.sortAsc ? 1 : -1;
      return 0;
    });

    if (albums.length === 0) {
      container.innerHTML = '<div class="music-lib-empty">没有找到专辑</div>';
      return;
    }

    // Quick filter chips (Apple Music-style)
    var genres = getGenres();
    var html = "";
    if (!lib.detailAlbumKey && genres.length > 0) {
      html += '<div class="music-lib-filter-chips">';
      html += '<button class="music-lib-filter-chip' + (!lib.activeGenre ? " active" : "") + '" data-genre="">全部</button>';
      var maxChips = Math.min(genres.length, 8);
      for (var gi = 0; gi < maxChips; gi++) {
        var isActive = lib.activeGenre === genres[gi];
        html += '<button class="music-lib-filter-chip' + (isActive ? " active" : "") + '" data-genre="' + genres[gi].replace(/"/g, "&quot;") + '">' + genres[gi] + '</button>';
      }
      html += "</div>";
    }

    html += '<div class="music-library-grid">';
    for (var i = 0; i < albums.length; i++) {
      html += renderAlbumCard(albums[i], "normal");
    }
    html += "</div>";
    container.innerHTML = html;
    bindAlbumCardClicks();
    bindFilterChips();
  }

  function bindFilterChips() {
    var container = getEl("music-lib-content");
    if (!container) return;
    container.querySelectorAll(".music-lib-filter-chip").forEach(function (chip) {
      chip.addEventListener("click", function (e) {
        e.stopPropagation();
        var genre = this.dataset.genre || "";
        lib.activeGenre = genre || null;
        // Re-render with same view
        if (lib.view === "albums") renderAlbums();
        else if (lib.view === "recentlyAdded") renderRecentlyAdded();
      });
    });
  }

  /* =================================================================
     Songs View
     ================================================================= */

  function renderSongs() {
    var container = getEl("music-lib-content");
    if (!container) return;
    container.className = "music-library-content";

    var tracks = getFilteredTracks();

    // Sort
    tracks.sort(function (a, b) {
      var va, vb;
      switch (lib.sortKey) {
        case "title": va = (a.title || "").toLowerCase(); vb = (b.title || "").toLowerCase(); break;
        case "artist": va = (a.artist || "").toLowerCase(); vb = (b.artist || "").toLowerCase(); break;
        case "album": va = (a.album || "").toLowerCase(); vb = (b.album || "").toLowerCase(); break;
        case "year": va = a.year || 0; vb = b.year || 0; break;
        case "duration": va = a.duration || 0; vb = b.duration || 0; break;
        case "plays": va = lib.playCounts[trackKey(a)] || 0; vb = lib.playCounts[trackKey(b)] || 0; break;
        default: return 0;
      }
      if (va < vb) return lib.sortAsc ? -1 : 1;
      if (va > vb) return lib.sortAsc ? 1 : -1;
      return 0;
    });

    if (tracks.length === 0) {
      container.innerHTML = '<div class="music-lib-empty">没有找到歌曲</div>';
      return;
    }

    // Column headers (WMP-style click-to-sort)
    var cols = [
      { key: null, label: "#", cls: "col-idx" },
      { key: "title", label: "曲名", cls: "col-title" },
      { key: "artist", label: "艺术家", cls: "col-artist" },
      { key: "album", label: "专辑", cls: "col-album" },
      { key: "year", label: "年份", cls: "col-year" },
      { key: "duration", label: "时长", cls: "col-duration" },
    ];
    var headerHtml = '<div class="music-lib-songs-header">';
    for (var ci = 0; ci < cols.length; ci++) {
      var col = cols[ci];
      var isActive = lib.sortKey === col.key;
      var arrow = "";
      if (isActive) arrow = lib.sortAsc ? " ▲" : " ▼";
      if (col.key) {
        headerHtml +=
          '<button class="music-lib-songs-header-cell ' + col.cls + (isActive ? " active" : "") +
          '" data-sort="' + col.key + '">' + col.label + arrow + "</button>";
      } else {
        headerHtml += '<span class="music-lib-songs-header-cell ' + col.cls + '">' + col.label + "</span>";
      }
    }
    headerHtml += "</div>";

    // Group by album for songs view when not filtered
    var currentAlbum = "";
    var html = headerHtml + '<div class="music-library-track-list">';
    for (var i = 0; i < tracks.length; i++) {
      var t = tracks[i];
      var albumName = t.album || "Unknown";

      if (!lib.activeGenre && !lib.activeArtist && !lib.activeYear && albumName !== currentAlbum) {
        currentAlbum = albumName;
        html +=
          '<div class="music-lib-track-album-header">' +
          '<div class="music-lib-track-album-cover-sm">' +
          (t.cover ? '<img src="' + t.cover + '" alt="" loading="lazy" onerror="this.style.display=\'none\'" />' : "") +
          "</div>" +
          '<div class="music-lib-track-album-info">' +
          '<div class="music-lib-track-album-name">' + escapeHTML(albumName) + "</div>" +
          '<div class="music-lib-track-album-artist">' + escapeHTML(t.albumArtist || t.artist || "") + "</div>" +
          "</div>" +
          "</div>";
      }
      html += renderTrackRow(t, (t.track && t.track.no) || (i + 1));
    }
    html += "</div>";
    container.innerHTML = html;
    bindTrackClicks();
    bindSortHeaders();
  }

  function bindSortHeaders() {
    var container = getEl("music-lib-content");
    if (!container) return;
    container.querySelectorAll(".music-lib-songs-header-cell[data-sort]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var key = this.dataset.sort;
        if (lib.sortKey === key) {
          lib.sortAsc = !lib.sortAsc;
        } else {
          lib.sortKey = key;
          lib.sortAsc = true;
        }
        renderSongs();
      });
    });
  }

  /* =================================================================
     Genres View
     ================================================================= */

  function renderGenres() {
    var container = getEl("music-lib-content");
    if (!container) return;
    container.className = "music-library-content";

    var genres = getGenres();
    if (genres.length === 0) {
      container.innerHTML = '<div class="music-lib-empty">没有找到流派信息</div>';
      return;
    }

    var html = '<div class="music-lib-genre-grid">';
    for (var i = 0; i < genres.length; i++) {
      var g = genres[i];
      // Count tracks in this genre
      var count = 0;
      var playlist = _state.playlist;
      for (var j = 0; j < playlist.length; j++) {
        if (hasGenre(playlist[j], g)) count++;
      }
      html +=
        '<div class="music-lib-genre-card" data-genre="' + g.replace(/"/g, "&quot;") + '">' +
        '<div class="music-lib-genre-card-icon">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="32" height="32"><path d="M4 20V4M12 20V10M20 20V6"/></svg>' +
        "</div>" +
        '<div class="music-lib-genre-card-name">' + g + "</div>" +
        '<div class="music-lib-genre-card-count">' + count + " 首</div>" +
        "</div>";
    }
    html += "</div>";
    container.innerHTML = html;

    container.querySelectorAll(".music-lib-genre-card").forEach(function (el) {
      el.addEventListener("click", function () {
        lib.activeGenre = this.dataset.genre;
        lib.view = "albums";
        render();
      });
    });
  }

  /* =================================================================
     Years View
     ================================================================= */

  function renderYears() {
    var container = getEl("music-lib-content");
    if (!container) return;
    container.className = "music-library-content";

    var playlist = _state.playlist;
    var yearMap = {};
    for (var i = 0; i < playlist.length; i++) {
      var y = playlist[i].year || 0;
      if (!y) continue;
      if (!yearMap[y]) yearMap[y] = { year: y, tracks: [], albums: {} };
      yearMap[y].tracks.push(playlist[i]);
      var ak = (playlist[i].album || "Unknown") + "|" + (playlist[i].albumArtist || playlist[i].artist || "Unknown");
      yearMap[y].albums[ak] = true;
    }

    var years = [];
    for (var k in yearMap) {
      if (yearMap.hasOwnProperty(k)) years.push(yearMap[k]);
    }
    years.sort(function (a, b) { return b.year - a.year; });

    if (years.length === 0) {
      container.innerHTML = '<div class="music-lib-empty">没有找到年份信息</div>';
      return;
    }

    var html = "";
    for (var i = 0; i < years.length; i++) {
      var yr = years[i];
      var albumCount = Object.keys(yr.albums).length;
      html +=
        '<div class="music-lib-year-card" data-year="' + yr.year + '">' +
        '<div class="music-lib-year-number">' + yr.year + "</div>" +
        '<div class="music-lib-year-meta">' + albumCount + " 张专辑 · " + yr.tracks.length + " 首歌曲</div>" +
        "</div>";
    }
    container.innerHTML = html;

    container.querySelectorAll(".music-lib-year-card").forEach(function (card) {
      card.addEventListener("click", function () {
        lib.activeYear = parseInt(this.dataset.year);
        lib.view = "albums";
        render();
      });
    });
  }

  /* =================================================================
     Album Detail View
     ================================================================= */

  function showAlbumDetail(albumKey) {
    lib.detailAlbumKey = albumKey;
    lib.view = "detail";
    render();
  }

  function renderDetail() {
    var container = getEl("music-lib-content");
    if (!container) return;
    container.className = "music-library-content";

    if (!lib.detailAlbumKey) {
      lib.view = "albums";
      render();
      return;
    }

    var parts = decodeURIComponent(lib.detailAlbumKey).split("|");
    var albumName = parts.slice(0, -1).join("|") || parts[0];
    var albumArtist = parts[parts.length - 1];

    var albums = getAlbums();
    var album = null;
    for (var i = 0; i < albums.length; i++) {
      if (albums[i].album === albumName && albums[i].artist === albumArtist) {
        album = albums[i];
        break;
      }
    }
    if (!album) {
      lib.view = "albums";
      lib.detailAlbumKey = null;
      render();
      return;
    }

    var tracks = album.tracks.slice();
    tracks.sort(function (a, b) {
      var na = (a.track && a.track.no) || 999;
      var nb = (b.track && b.track.no) || 999;
      return na - nb;
    });

    var html =
      '<div class="music-lib-detail">' +
      '<div class="music-lib-detail-hero">' +
      '<div class="music-lib-detail-cover">' +
      (album.cover
        ? '<img src="' + album.cover + '" alt="" />'
        : '<div class="music-lib-album-cover-placeholder" style="width:200px;height:200px;">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" width="36" height="36"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>' +
          "</div>") +
      "</div>" +
      '<div class="music-lib-detail-info">' +
      '<div class="music-lib-detail-type">专辑</div>' +
      '<div class="music-lib-detail-title">' + escapeHTML(album.album) + "</div>" +
      '<div class="music-lib-detail-artist">' + escapeHTML(album.artist) + "</div>" +
      '<div class="music-lib-detail-meta">' +
      album.tracks.length + " 首歌曲" +
      (album.year ? ' · ' + album.year : "") +
      (album.genre ? ' · ' + album.genre : "") +
      ' · ' + fmtDuration(album.totalDuration) +
      "</div>";

    // Tags
    var allTags = {};
    for (var ti = 0; ti < tracks.length; ti++) {
      var tags = tracks[ti].tags || [];
      for (var tj = 0; tj < tags.length; tj++) {
        allTags[tags[tj]] = true;
      }
    }
    var tagList = Object.keys(allTags);
    if (tagList.length > 0) {
      html += '<div class="music-lib-detail-tags">';
      for (var tk = 0; tk < tagList.length; tk++) {
        html += '<span class="music-lib-tag">' + tagList[tk] + "</span>";
      }
      html += "</div>";
    }

    html +=
      '<div class="music-lib-detail-actions">' +
      '<button class="music-lib-btn music-lib-btn-primary" id="music-lib-detail-play"><svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14" style="margin-right:3px;vertical-align:-2px"><path d="M8 5v14l11-7z"/></svg>播放</button>' +
      '<button class="music-lib-btn" id="music-lib-detail-shuffle"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="14" height="14" style="margin-right:3px;vertical-align:-2px"><path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg>随机</button>' +
      "</div>" +
      "</div>" +
      "</div>";

    // Track list
    html += '<div class="music-lib-detail-tracks">';

    var currentDisc = 0;
    for (var ti = 0; ti < tracks.length; ti++) {
      var t = tracks[ti];
      var tno = (t.track && t.track.no) || 0;
      var discNo = 1;
      if (tno > 100) discNo = Math.floor(tno / 100);

      if (discNo !== currentDisc && discNo > 1) {
        currentDisc = discNo;
        html += '<div class="music-lib-disc-separator">Disc ' + discNo + "</div>";
      }

      var isCurrent = _state.currentSong && _state.currentSong.url === t.url;
      var tkey = trackKey(t);
      var plays = lib.playCounts[tkey] || 0;
      var displayNo = tno % 100 || tno;

      var trackIndex = findTrackIndex(t);
      html +=
        '<div class="music-lib-detail-track' + (isCurrent ? " current" : "") + '" data-track-index="' + trackIndex + '">' +
        '<div class="music-lib-detail-track-no">' +
        (isCurrent ? '<span class="music-lib-playing-indicator"></span>' : displayNo) +
        "</div>" +
        '<div class="music-lib-detail-track-info">' +
        '<div class="music-lib-detail-track-title">' + escapeHTML(t.title) + "</div>" +
        '<div class="music-lib-detail-track-artist">' +
        (t.artist !== album.artist ? escapeHTML(t.artist) : "") +
        "</div>" +
        "</div>" +
        '<button class="music-lib-track-info-btn" data-track-index="' + trackIndex + '" title="属性" aria-label="属性">ⓘ</button>' +
        (t.qualityBadge
          ? '<div class="music-lib-track-row-quality" style="background:' + qualityColor(t.qualityTier) + ';color:' + (["studioMaster", "hiRes", "highLossy"].indexOf(t.qualityTier) >= 0 ? "#000" : "#fff") + '">' + t.qualityBadge + "</div>"
          : '<div class="music-lib-track-row-quality"></div>') +
        '<div class="music-lib-detail-track-plays">' + (plays > 0 ? plays : "") + "</div>" +
        '<div class="music-lib-detail-track-duration">' + fmtTime(t.duration) + "</div>" +
        "</div>";
    }

    html += "</div></div>";
    container.innerHTML = html;

    bindDetailActions(album);
    bindTrackClicks();
  }

  function bindDetailActions(album) {
    var playBtn = getEl("music-lib-detail-play");
    var shuffleBtn = getEl("music-lib-detail-shuffle");

    if (playBtn) {
      playBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        var idx = findTrackIndex(album.tracks[0]);
        if (idx >= 0) MP.playIndex(idx);
      });
    }

    if (shuffleBtn) {
      shuffleBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        if (!MP.getState().isShuffled) MP.toggleShuffle();
        var randomIdx = findTrackIndex(album.tracks[Math.floor(Math.random() * album.tracks.length)]);
        if (randomIdx >= 0) MP.playIndex(randomIdx);
      });
    }

    // Apply dynamic hero theme from album cover
    if (album.cover) {
      var detailHero = document.querySelector(".music-lib-detail-hero");
      if (detailHero) applyHeroTheme(album.cover, detailHero);
    }

    // Double-click cover to enter immersive mode
    var detailCover = document.querySelector(".music-lib-detail-cover");
    if (detailCover) {
      detailCover.addEventListener("dblclick", function() {
        window.dispatchEvent(new CustomEvent('music-player:open-immersive'));
      });
    }
  }

  function bindAlbumCardClicks() {
    var container = getEl("music-lib-content");
    if (!container) return;
    container.querySelectorAll(".music-lib-album-card").forEach(function (card) {
      card.addEventListener("click", function () {
        showAlbumDetail(this.dataset.albumKey);
      });
    });
    // Love button handlers (stop propagation to avoid opening album detail)
    container.querySelectorAll(".music-lib-album-love").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        var albumKey = decodeURIComponent(this.dataset.albumKey);
        var nowLoved = toggleFavorite(albumKey);
        // Update button visual state
        this.classList.toggle("loved", nowLoved);
        var svg = this.querySelector("svg");
        if (svg) {
          var path = svg.querySelector("path");
          if (path) {
            path.setAttribute("fill", nowLoved ? "#ef4444" : "none");
            path.setAttribute("stroke-width", nowLoved ? "0" : "1.5");
          }
        }
        this.setAttribute("aria-label", nowLoved ? "取消收藏" : "收藏");
        this.setAttribute("title", nowLoved ? "取消收藏" : "收藏");
      });
    });
  }

  function bindTrackClicks() {
    var container = getEl("music-lib-content");
    if (!container) return;
    container.querySelectorAll(".music-lib-track-row, .music-lib-detail-track").forEach(function (track) {
      track.addEventListener("click", function (e) {
        // Don't trigger play if clicking the info button
        if (e.target.closest(".music-lib-track-info-btn")) return;
        var idx = parseInt(this.dataset.trackIndex);
        if (idx >= 0) {
          MP.playIndex(idx);
        }
      });
      // Right-click context menu
      track.addEventListener("contextmenu", function (e) {
        var idx = parseInt(this.dataset.trackIndex);
        if (idx >= 0) showContextMenu(e, idx);
      });
    });
    // Info button clicks
    container.querySelectorAll(".music-lib-track-info-btn").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        var idx = parseInt(this.dataset.trackIndex);
        if (idx >= 0) showTrackProperties(idx);
      });
    });
  }

  function showTrackProperties(trackIndex) {
    var playlist = _state.playlist;
    var t = playlist[trackIndex];
    if (!t) return;

    // Remove any existing properties panel
    var existing = getEl("music-lib-properties-panel");
    if (existing) existing.remove();

    var panel = document.createElement("div");
    panel.id = "music-lib-properties-panel";
    panel.className = "music-lib-properties-panel";

    var rows = [
      ["曲名", t.title || "--"],
      ["艺术家", t.artist || "--"],
      ["专辑艺术家", t.albumArtist || "--"],
      ["专辑", t.album || "--"],
      ["年份", t.year || "--"],
      ["流派", t.genre || "--"],
      ["曲目号", t.track ? t.track.no + (t.track.of ? " / " + t.track.of : "") : "--"],
      ["作曲", t.composer || "--"],
      ["格式", (t.codecName || t.codec || "--").toUpperCase()],
      ["采样率", t.sampleRate ? (t.sampleRate / 1000).toFixed(t.sampleRate % 1000 === 0 ? 0 : 1) + " kHz" : "--"],
      ["位深", t.bitsPerSample ? t.bitsPerSample + " bit" : "--"],
      ["比特率", t.bitrate ? Math.round(t.bitrate / 1000) + " kbps" : "--"],
      ["声道数", t.channels || "--"],
      ["质量", t.qualityLabel || t.qualityTier || "--"],
    ];

    // Add replayGain if available
    if (t.replayGain) {
      if (t.replayGain.trackGain != null) rows.push(["回放增益 (曲目)", t.replayGain.trackGain.toFixed(2) + " dB"]);
      if (t.replayGain.trackPeak != null) rows.push(["峰值 (曲目)", t.replayGain.trackPeak.toFixed(6)]);
      if (t.replayGain.albumGain != null) rows.push(["回放增益 (专辑)", t.replayGain.albumGain.toFixed(2) + " dB"]);
    }

    // Featured artists
    if (t.featuredArtists && t.featuredArtists.length) {
      rows.push(["合作艺术家", t.featuredArtists.join(", ")]);
    }

    // Roon-style signal path (from decoder module)
    if (window.__musicPlayer && window.__musicPlayer._decoder) {
      var decoder = window.__musicPlayer._decoder;
      var audioInfo = decoder.getTrackAudioInfo(t);
      rows.push(["信号路径", audioInfo.signalPath]);
      if (audioInfo.isBitPerfect) {
        rows.push(["保真度", "Bit-Perfect ✓"]);
      }
      if (audioInfo.preEmphasis && audioInfo.preEmphasis.needsDeEmphasis) {
        rows.push(["预加重", "⚠ " + audioInfo.preEmphasis.description]);
      }
      if (audioInfo.needsDownsample) {
        rows.push(["降采样建议", ">96kHz → 建议降至 " + audioInfo.recommendedRate + "Hz"]);
      }
    }

    var html = '<div class="music-lib-properties-header"><span>曲目属性</span><button class="music-lib-properties-close">&times;</button></div>';
    html += '<div class="music-lib-properties-body"><table class="music-lib-properties-table">';
    for (var i = 0; i < rows.length; i++) {
      html += "<tr><th>" + rows[i][0] + "</th><td>" + escapeHTML(String(rows[i][1])) + "</td></tr>";
    }
    html += "</table></div>";

    panel.innerHTML = html;
    panel.querySelector(".music-lib-properties-close").addEventListener("click", function () {
      panel.remove();
    });

    // Position near the bottom of the content area
    var content = getEl("music-lib-content");
    if (content) {
      content.appendChild(panel);
      panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  /* =================================================================
     Context Menu (right-click on tracks)
     ================================================================= */

  function showContextMenu(e, trackIndex) {
    e.preventDefault();
    hideContextMenu();

    var playlist = _state.playlist;
    var t = playlist[trackIndex];
    if (!t) return;

    var menu = document.createElement("div");
    menu.id = "music-lib-context-menu";
    menu.className = "music-lib-context-menu";
    menu.style.left = e.clientX + "px";
    menu.style.top = e.clientY + "px";

    var items = [
      { label: "播放", action: function () { MP.playIndex(trackIndex); } },
      { label: "下一首播放", action: function () {
        MP.playNext(t);
      }},
      { label: "添加到队列末尾", action: function () {
        MP.addToQueue(t);
      }},
      { label: "-" },
      { label: "显示简介", action: function () { showTrackProperties(trackIndex); } },
      { label: "-" },
      { label: (t.artist || "未知艺术家") + " — " + (t.title || "未知"), disabled: true, small: true },
    ];

    var html = "";
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      if (item.label === "-") {
        html += '<div class="music-lib-context-separator"></div>';
      } else if (item.disabled) {
        html += '<div class="music-lib-context-item disabled">' + escapeHTML(item.label) + "</div>";
      } else {
        html +=
          '<button class="music-lib-context-item' + (item.small ? " small" : "") + '">' +
          escapeHTML(item.label) +
          "</button>";
      }
    }
    menu.innerHTML = html;

    // Bind actions
    var buttons = menu.querySelectorAll("button.music-lib-context-item");
    var actionIdx = 0;
    for (var j = 0; j < items.length; j++) {
      if (items[j].label !== "-" && !items[j].disabled) {
        (function (action) {
          buttons[actionIdx].addEventListener("click", function () {
            action();
            hideContextMenu();
          });
        })(items[j].action);
        actionIdx++;
      }
    }

    document.body.appendChild(menu);

    // Keep menu within viewport
    var rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth) menu.style.left = (e.clientX - rect.width) + "px";
    if (rect.bottom > window.innerHeight) menu.style.top = (e.clientY - rect.height) + "px";

    // Close on outside click
    setTimeout(function () {
      document.addEventListener("click", hideContextMenu, { once: true });
      document.addEventListener("contextmenu", hideContextMenu, { once: true });
    }, 0);
  }

  function hideContextMenu() {
    var menu = document.getElementById("music-lib-context-menu");
    if (menu) menu.remove();
  }

  /* =================================================================
     Keyboard shortcuts
     ================================================================= */

  function setupKeyboard() {
    document.addEventListener("keydown", function (e) {
      // Don't capture when typing in inputs
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.isContentEditable) return;
      if (!lib.isOpen) return;

      switch (e.key) {
        case " ":
          e.preventDefault();
          MP.toggle();
          break;
        case "ArrowLeft":
          if (e.altKey || e.metaKey) { e.preventDefault(); MP.prev(); }
          break;
        case "ArrowRight":
          if (e.altKey || e.metaKey) { e.preventDefault(); MP.next(); }
          break;
        case "Escape":
          // If context menu is open, close it first; otherwise close library
          if (document.getElementById("music-lib-context-menu")) {
            hideContextMenu();
          } else {
            close();
          }
          break;
      }
    });
  }

  /* =================================================================
     Main render
     ================================================================= */

  function render() {
    if (!lib.isOpen) return;
    _state = MP.getState();
    renderSidebar();
    renderTopBar();

    switch (lib.view) {
      case "browse": renderBrowse(); break;
      case "recentlyPlayed": renderRecentlyPlayed(); break;
      case "recentlyAdded": renderRecentlyAdded(); break;
      case "favorites": renderFavorites(); break;
      case "artists": renderArtists(); break;
      case "albums": renderAlbums(); break;
      case "songs": renderSongs(); break;
      case "genres": renderGenres(); break;
      case "years": renderYears(); break;
      case "detail": renderDetail(); break;
      default: renderBrowse();
    }

    renderNowPlayingBar();
  }

  function renderNowPlayingBar() {
    var bar = getEl("music-lib-nowplaying-bar");
    var s = _state;
    if (!bar || !s.currentSong || !s.currentSong.url) {
      if (bar) bar.style.display = "none";
      return;
    }
    bar.style.display = "flex";
    var coverImg = bar.querySelector(".music-lib-np-cover img");
    if (coverImg && coverImg.getAttribute("src") !== (s.currentSong.cover || "")) {
      coverImg.src = s.currentSong.cover || "";
    }
    bar.querySelector(".music-lib-np-title").textContent = s.currentSong.title || "--";
    bar.querySelector(".music-lib-np-artist").textContent = s.currentSong.artist || "--";
    bar.querySelector(".music-lib-np-time").textContent = fmtTime(s.currentTime) + " / " + fmtTime(s.duration);

    // Mini progress bar
    var progressFill = bar.querySelector(".music-lib-np-progress-fill");
    if (progressFill && s.duration > 0) {
      progressFill.style.width = (s.currentTime / s.duration * 100).toFixed(1) + "%";
    }

    // Dynamic hero theme from now-playing cover
    var hero = document.querySelector(".music-lib-hero");
    if (hero && s.currentSong.cover) {
      applyHeroTheme(s.currentSong.cover, hero);
    }
  }

  // Targeted update: current track indicator in track rows (no full rebuild)
  function updateCurrentTrackHighlights(s) {
    var currentUrl = s.currentSong && s.currentSong.url;
    var container = getEl("music-lib-content");
    if (!container) return;

    // Update track rows in songs list
    container.querySelectorAll(".music-lib-track-row").forEach(function (row) {
      var idx = parseInt(row.getAttribute("data-track-index"));
      var track = _state.playlist[idx];
      var isCurrent = currentUrl && track && track.url === currentUrl;
      row.classList.toggle("current", isCurrent);
      var idxCell = row.querySelector(".music-lib-track-row-idx");
      if (idxCell) {
        if (isCurrent) {
          if (!idxCell.hasAttribute("data-orig-num")) {
            idxCell.setAttribute("data-orig-num", idxCell.textContent);
          }
          idxCell.innerHTML = '<span class="music-lib-playing-indicator"></span>';
        } else {
          var origNum = idxCell.getAttribute("data-orig-num");
          if (origNum !== null) {
            idxCell.textContent = origNum;
            idxCell.removeAttribute("data-orig-num");
          }
        }
      }
    });

    // Update track rows in detail view
    container.querySelectorAll(".music-lib-detail-track").forEach(function (row) {
      var idx = parseInt(row.getAttribute("data-track-index"));
      var track = _state.playlist[idx];
      var isCurrent = currentUrl && track && track.url === currentUrl;
      row.classList.toggle("current", isCurrent);
      var noCell = row.querySelector(".music-lib-detail-track-no");
      if (noCell) {
        if (isCurrent) {
          if (!noCell.hasAttribute("data-orig-num")) {
            noCell.setAttribute("data-orig-num", noCell.textContent);
          }
          noCell.innerHTML = '<span class="music-lib-playing-indicator"></span>';
        } else {
          var origNum = noCell.getAttribute("data-orig-num");
          if (origNum !== null) {
            noCell.textContent = origNum;
            noCell.removeAttribute("data-orig-num");
          }
        }
      }
    });
  }

  // Targeted update: hero section text only (avoid full browse rebuild on timeupdate)
  function updateBrowseHero(s) {
    var heroTitle = document.querySelector(".music-lib-hero-title");
    var heroSubtitle = document.querySelector(".music-lib-hero-subtitle");
    var heroCover = document.querySelector(".music-lib-hero-cover img");
    var heroAlbum = document.querySelector(".music-lib-hero-album");
    if (s.currentSong && s.currentSong.url) {
      if (heroTitle) heroTitle.textContent = s.currentSong.title || "--";
      if (heroSubtitle) heroSubtitle.textContent = s.currentSong.artist || "--";
      if (heroAlbum) heroAlbum.textContent = s.currentSong.album || "";
      if (heroCover && s.currentSong.cover) heroCover.src = s.currentSong.cover;
    }
  }

  /* =================================================================
     Open / Close / Toggle
     ================================================================= */

  function open() {
    lib.isOpen = true;
    loadPlayCounts();
    loadRecent();
    loadFavorites();
    _state = MP.getState();
    var overlay = getEl("music-library-overlay");
    if (overlay) {
      overlay.style.display = '';
      overlay.classList.add("open");
      document.body.style.overflow = "hidden";
      // Re-bind static element listeners (DOM may have changed due to Astro navigation)
      setupEvents();
      render();
    }
    if (_state.isExpanded) MP.toggleExpanded();
    // Auto-refresh playlist on open to pick up new files added since last open
    if (MP.refreshLibrary) {
      MP.refreshLibrary().then(function(result) {
        if (result.success && result.added > 0) {
          _state = MP.getState();
          render();
        }
      });
    }
  }

  function close() {
    lib.isOpen = false;
    var overlay = getEl("music-library-overlay");
    if (overlay) {
      overlay.classList.remove("open");
      setTimeout(function() {
        if (!lib.isOpen && overlay) overlay.style.display = 'none';
      }, 400);
      document.body.style.overflow = "";
    }
  }

  function toggle() {
    lib.isOpen ? close() : open();
  }

  /* =================================================================
     Events
     ================================================================= */

  var _globalEventsSetup = false;
  function setupEvents() {
    // Global listeners (bind once per JS context)
    if (!_globalEventsSetup) {
      _globalEventsSetup = true;
      // ESC to close
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && lib.isOpen) {
          close();
        }
      });
      // Subscribe to state for real-time updates (targeted, not full re-render)
      var _lastPlaylistLen = (_state.playlist || []).length;
      MP.subscribe(function (s) {
        _state = s;
        if (!lib.isOpen) return;
        renderNowPlayingBar();
        updateCurrentTrackHighlights(s);
        if (lib.view === "browse") updateBrowseHero(s);
        var newLen = (s.playlist || []).length;
        if (newLen !== _lastPlaylistLen) {
          _lastPlaylistLen = newLen;
          render();
        }
      });
    }

    var _perOpenSetupDone = false;
    if (!_perOpenSetupDone) {
      _perOpenSetupDone = true;
      // Per-open element bindings (bound once — elements persist across open/close)
      // Search input
    var searchInput = getEl("music-lib-search");
    if (searchInput) {
      searchInput.addEventListener("input", function () {
        var q = this.value.trim().toLowerCase();
        if (q) {
          lib.view = "songs";
          lib._searchQuery = q;
          updateSearchFilter();
          render();
        } else {
          lib._searchQuery = "";
          resetSearchFilter();
          if (lib.view === "songs") lib.view = "browse";
          render();
        }
      });
      searchInput.addEventListener("keydown", function (e) {
        if (e.key === "Escape") {
          this.value = "";
          lib._searchQuery = "";
          resetSearchFilter();
          if (lib.view === "songs") lib.view = "browse";
          render();
          this.blur();
        }
      });
    }

    // Back button
    var backBtn = getEl("music-lib-back");
    if (backBtn) {
      backBtn.addEventListener("click", function () {
        if (lib.view === "detail") {
          lib.detailAlbumKey = null;
          lib.view = lib.activeGenre ? "albums" : "browse";
        } else if (lib.activeArtist) {
          lib.activeArtist = null;
          lib.view = "artists";
        } else if (lib.activeGenre) {
          lib.activeGenre = null;
          lib.view = "albums";
        }
        render();
      });
    }

    // View toggle buttons
    var btnGrid = getEl("music-lib-view-grid");
    var btnList = getEl("music-lib-view-list");
    if (btnGrid) {
      btnGrid.addEventListener("click", function () {
        lib.view = "albums";
        lib.detailAlbumKey = null;
        render();
      });
    }
    if (btnList) {
      btnList.addEventListener("click", function () {
        lib.view = "songs";
        lib.detailAlbumKey = null;
        render();
      });
    }

    // Sort selector
    var sortEl = getEl("music-lib-sort");
    if (sortEl) {
      sortEl.addEventListener("change", function () {
        lib.sortKey = this.value;
        lib.sortAsc = true;
        render();
      });
    }

    // Close button
    var closeBtn = getEl("music-lib-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", close);
    }

    // Overlay backdrop click to close
    var overlay = getEl("music-library-overlay");
    if (overlay) {
      overlay.addEventListener("click", function (e) {
        if (e.target === overlay) close();
      });
    }

    // Now-playing bar click → navigate to current song's album
    var npBar = getEl("music-lib-nowplaying-bar");
    if (npBar) {
      npBar.addEventListener("click", function () {
        var s = MP.getState();
        if (s.currentSong && s.currentSong.url) {
          var albumKey = encodeURIComponent((s.currentSong.album || "Unknown") + "|" + (s.currentSong.albumArtist || s.currentSong.artist || "Unknown"));
          showAlbumDetail(albumKey);
        }
      });
    }

    } // end _perOpenSetupDone

  }

  var _origGetFilteredTracks = null;

  function updateSearchFilter() {
    if (!_origGetFilteredTracks) {
      _origGetFilteredTracks = getFilteredTracks;
    }
    getFilteredTracks = function () {
      var q = lib._searchQuery;
      if (!q) return _origGetFilteredTracks();
      var playlist = _state.playlist;
      var result = [];
      for (var i = 0; i < playlist.length; i++) {
        var t = playlist[i];
        var match =
          (t.title && t.title.toLowerCase().indexOf(q) > -1) ||
          (t.artist && t.artist.toLowerCase().indexOf(q) > -1) ||
          (t.album && t.album.toLowerCase().indexOf(q) > -1) ||
          (t.composer && t.composer.toLowerCase().indexOf(q) > -1) ||
          (t.genre && t.genre.toLowerCase().indexOf(q) > -1);
        if (match) result.push(t);
      }
      return result;
    };
  }

  function resetSearchFilter() {
    if (_origGetFilteredTracks) {
      getFilteredTracks = _origGetFilteredTracks;
      _origGetFilteredTracks = null;
    }
  }

  /* =================================================================
     Boot
     ================================================================= */

  function boot() {
    loadPlayCounts();
    loadRecent();
    setupKeyboard();

    // Track play count and recent history on song change (always active, not just when library open)
    var _lastTrackUrl = null;
    MP.subscribe(function (s) {
      if (s.currentSong && s.currentSong.url && s.currentSong.url !== _lastTrackUrl) {
        _lastTrackUrl = s.currentSong.url;
        recordPlay(trackKey(s.currentSong));
        recordRecentPlay(s.currentSong);
      }
    });

    MP._lib = {
      open: open,
      close: close,
      toggle: toggle,
      render: render,
      navigateTo: navigateTo,
      getPlayCounts: function () { return lib.playCounts; },
    };

    window.addEventListener("music-player:toggle-library", toggle);
    window.addEventListener("music-player:close-library", close);

    // Reset overlay state on page navigation (DOM is fresh, but lib.isOpen is stale)
    document.addEventListener("astro:after-swap", function () {
      lib.isOpen = false;
      var overlay = getEl("music-library-overlay");
      if (overlay) {
        overlay.style.display = 'none';
        overlay.classList.remove("open");
      }
    });
  }

  boot();
};

// Self-boot
(function waitForPlayer() {
  var MP = window.__musicPlayer;
  if (MP) {
    window.__musicPlayerLibrary(MP);
  } else {
    setTimeout(waitForPlayer, 20);
  }
})();