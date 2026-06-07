import type { MusicPlayerConfig, MusicTrack } from "../types/config";
import { generatedPlaylist } from "./musicPlaylist.generated";

const manualPlaylist: MusicTrack[] = [];

export const musicPlayerConfig: MusicPlayerConfig = {
  enable: true,
  showFloatingPlayer: true,
  autoplay: false,
  playlist: [
    ...manualPlaylist,
    ...generatedPlaylist,
  ],
};
