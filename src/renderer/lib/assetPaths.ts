/**
 * assetPaths.ts
 *
 * Unified asset URL resolver for all runtime resources.
 *
 * ## Path Convention (single source of truth)
 *
 * | Resource type     | Location                        | Served at (Vite dev / built) |
 * |-------------------|---------------------------------|------------------------------|
 * | Portraits (cards) | src/renderer/assets/portraits/  | /assets/portraits/figureNN.png (compiled) |
 * | Scene backdrops   | src/renderer/assets/scenes/     | import.meta.glob (compiled)  |
 * | UI assets         | src/renderer/assets/ui/         | import.meta.glob (compiled)  |
 * | Map icons         | src/renderer/public/maps/       | /maps/...  (hot-deploy OK)   |
 * | Map backdrops     | src/renderer/public/maps/       | /maps/...  (hot-deploy OK)   |
 * | Map terrain bg    | src/renderer/public/maps/       | /maps/...  (hot-deploy OK)   |
 *
 * ## Rules
 * - Runtime hot-deploy resources → src/renderer/public/  (never root public/)
 * - Compile-time bundled resources → src/renderer/assets/
 * - Root public/ is NOT used by the game runtime
 */

import uiAssetsJson from '../data/configs/ui/ui_assets.json';

// Eagerly import all compiled scene background images at module load time.
// This is the only place import.meta.glob for scenes should appear.
const _compiledSceneImages = import.meta.glob<{ default: string }>(
  '../assets/scenes/*.{png,jpg,webp}',
  { eager: true },
);

// Eagerly import all compiled UI asset images at module load time.
const _compiledUiImages = import.meta.glob<{ default: string }>(
  '../assets/ui/**/*.{png,jpg,webp}',
  { eager: true },
);

/**
 * Resolve a scene background image URL.
 *
 * - If `filename` starts with `/`, treat it as a public asset path (hot-deploy).
 * - Otherwise, look it up in the compiled scene asset bundle.
 *
 * @param filename  Value from scene.background_image (may be a bare filename like
 *                  "forest.png" or an absolute path like "/scenes/forest.png")
 * @returns  Resolved URL or null if not found.
 */
export function getSceneBackdropUrl(filename: string | undefined | null): string | null {
  if (!filename) return null;
  if (filename.startsWith('/')) return filename;
  const key = Object.keys(_compiledSceneImages).find(k => k.endsWith('/' + filename));
  return key ? _compiledSceneImages[key].default : null;
}

/**
 * Resolve a character portrait URL.
 *
 * Portraits are compiled assets served at `/assets/portraits/figureNN.png`.
 * Pass the raw value from card.image (e.g. "/assets/portraits/figure01.png").
 * If `path` is already absolute (starts with `/`), return as-is.
 */
export function getPortraitUrl(path: string | undefined | null): string | null {
  if (!path) return null;
  if (path.startsWith('/')) return path;
  return null;
}

/**
 * Resolve a map icon URL.
 *
 * Map icons are hot-deploy runtime assets stored in src/renderer/public/maps/.
 * Pass the value from location.icon_image (e.g. "/maps/beiliang/icon_01.png").
 */
export function getMapIconUrl(path: string | undefined | null): string | null {
  if (!path) return null;
  return path; // already an absolute public path
}

/**
 * Resolve a location backdrop URL.
 *
 * Location backdrops are hot-deploy runtime assets stored in src/renderer/public/maps/.
 * Pass the value from location.backdrop_image (e.g. "/maps/map_001/location_001_backdrop.png").
 */
export function getLocationBackdropUrl(path: string | undefined | null): string | null {
  if (!path) return null;
  return path; // already an absolute public path
}

/**
 * Resolve a map terrain background URL.
 *
 * Terrain backgrounds are hot-deploy runtime assets stored in src/renderer/public/maps/.
 * Pass the value from mapConfig.background_image.
 */
export function getMapTerrainUrl(path: string | undefined | null): string | null {
  if (!path) return null;
  return path; // already an absolute public path
}

/**
 * Resolve a UI asset image URL by asset_id.
 *
 * Looks up the record in ui_assets.json, then resolves its `image` field:
 * - First tries the compiled asset bundle (import.meta.glob).
 * - Falls back to returning the path as-is (for hot-deploy public assets).
 *
 * @param assetId  The asset_id string (e.g. "ui_004")
 * @returns  Resolved URL or null if not found / image field is empty.
 */
export function getUiAssetUrl(assetId: string): string | null {
  const record = (uiAssetsJson as Array<{ asset_id: string; image: string }>)
    .find(r => r.asset_id === assetId);
  if (!record || !record.image) return null;

  const imagePath = record.image;
  const filename = imagePath.split('/').pop() ?? '';
  const key = Object.keys(_compiledUiImages).find(k => k.endsWith('/' + filename));
  if (key) return _compiledUiImages[key].default;

  // Fallback: treat as a public (hot-deploy) path
  if (imagePath.startsWith('/')) return imagePath;
  return null;
}
