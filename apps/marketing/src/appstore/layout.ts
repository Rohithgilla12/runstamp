// App Store screenshot geometry — locked to Apple's 6.9" iPhone slot
// (1320×2868). Apple auto-scales this single set down to every smaller
// iPhone, so it's the only size we need to ship. Phone + inner-screen
// dimensions live here so AppStoreShot and the designed screens agree.

export const SHOT_W = 1320;
export const SHOT_H = 2868;

// Device sits below the headline block; contained (no bleed) so no UI clips.
export const PHONE_W = 1000;
export const PHONE_H = 2120;

// Mirror PhoneFrame's own maths so the screens know their canvas exactly.
const BEZEL = Math.max(8, Math.min(PHONE_W, PHONE_H) * 0.018);
export const SCREEN_W = PHONE_W - BEZEL * 2;
export const SCREEN_H = PHONE_H - BEZEL * 2;

export interface ScreenProps {
  w: number;
  h: number;
}
