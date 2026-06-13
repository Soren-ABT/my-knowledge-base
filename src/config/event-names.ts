export const EVENTS = {
  MUSIC_PLAYER_INIT: "music-player:init",
  MUSIC_PLAYER_STATE: "music-player:state",
  MUSIC_PLAYER_TOGGLE_LIBRARY: "music-player:toggle-library",
  MUSIC_PLAYER_CLOSE_LIBRARY: "music-player:close-library",
  MUSIC_PLAYER_OPEN_IMMERSIVE: "music-player:open-immersive",
  MUSIC_PLAYER_CLOSE_IMMERSIVE: "music-player:close-immersive",
  MUSIC_PLAYER_TOGGLE_IMMERSIVE: "music-player:toggle-immersive",
  MUSIC_PLAYER_TOGGLE_LYRICS: "music-player:toggle-lyrics",
  MUSIC_PLAYER_CLOSE_LYRICS: "music-player:close-lyrics",
  MUSIC_PLAYER_TOGGLE_EQ_PRESET: "music-player:toggle-eq-preset",
  MUSIC_PLAYER_CLOSE_EQ_PRESET: "music-player:close-eq-preset",
  THEME_CHANGE: "theme-change",
  WALLPAPER_MODE_CHANGE: "wallpaper-mode-change",
  SAKURA_TOGGLE: "sakura-toggle",
} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS];
