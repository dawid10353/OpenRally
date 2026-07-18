/**
 * Track Configuration
 * Definiuje kształt trasy jako krzywą Catmull-Rom (Spline).
 * Współrzędne (X, Z) odnoszą się do mapy, gdzie 0,0 to środek.
 */

export const TRACK_WIDTH = 25; // Podstawowa szerokość trasy
export const TRACK_FALLOFF = 40; // Gładkie przejście trasy w teren
export const TRACK_TARGET_HEIGHT = -0.5; // Docelowa głębokość wypłaszczania trasy

export const TRACK_POINTS = [
  // Start / Spawn w okolicach środka mapy (0,0)
  { x: 0, z: 0 },
  
  // Dalsza część trasy, tworząca zakręty dookoła
  { x: 100, z: -50 },
  { x: 180, z: -100 }, // Poszerzony zakręt
  { x: 220, z: 0 },
  { x: 150, z: 120 },
  { x: 0, z: 200 },
  { x: -150, z: 100 },
  { x: -200, z: 0 },
  { x: -100, z: -150 },
  { x: -50, z: -50 },
];
