/** Isometric coordinate helpers – 2:1 diamond projection (RCT style) */

export const TILE_W = 48;
export const TILE_H = 24;
export const HALF_W = TILE_W / 2;
export const HALF_H = TILE_H / 2;
export const GRID_COLS = 10;
export const GRID_ROWS = 16;

// Origin: top vertex of the isometric diamond
// Adjusted for the rotated 10×16 grid, centered in viewport
export const ORIGIN_X = 540;
export const ORIGIN_Y = 130;

/** Convert grid (col, row) to SVG screen (x, y) */
export function gridToScreen(col: number, row: number) {
  return {
    x: ORIGIN_X + (col - row) * HALF_W,
    y: ORIGIN_Y + (col + row) * HALF_H,
  };
}

/** Convert old world coordinates (0-560, 0-420) to isometric screen coords.
 *  Maps the "playable area" (x:45-515, y:70-340) onto the iso grid. */
export function worldToIso(wx: number, wy: number) {
  // Map world space to grid space
  const gx = ((wx - 45) / 470) * GRID_COLS;
  const gy = ((wy - 70) / 270) * GRID_ROWS;
  return gridToScreen(
    Math.max(0, Math.min(GRID_COLS, gx)),
    Math.max(0, Math.min(GRID_ROWS, gy))
  );
}

/** Diamond tile vertices at grid (col, row) */
export function tileDiamond(col: number, row: number) {
  const c = gridToScreen(col, row);
  return `${c.x},${c.y - HALF_H} ${c.x + HALF_W},${c.y} ${c.x},${c.y + HALF_H} ${c.x - HALF_W},${c.y}`;
}

/** Isometric building polygon points.
 *  gx,gy = grid position of top-left corner
 *  gw,gd = grid width and depth (in tiles)
 *  h = pixel height of the building
 */
export function isoBuildingPolys(
  gx: number, gy: number, gw: number, gd: number, h: number
) {
  const top = gridToScreen(gx, gy);
  const right = gridToScreen(gx + gw, gy);
  const bottom = gridToScreen(gx + gw, gy + gd);
  const left = gridToScreen(gx, gy + gd);

  // Roof = base shifted up by h
  const rTop = { x: top.x, y: top.y - h };
  const rRight = { x: right.x, y: right.y - h };
  const rBottom = { x: bottom.x, y: bottom.y - h };
  const rLeft = { x: left.x, y: left.y - h };

  return {
    leftWall: `${left.x},${left.y} ${bottom.x},${bottom.y} ${rBottom.x},${rBottom.y} ${rLeft.x},${rLeft.y}`,
    rightWall: `${bottom.x},${bottom.y} ${right.x},${right.y} ${rRight.x},${rRight.y} ${rBottom.x},${rBottom.y}`,
    roof: `${rTop.x},${rTop.y} ${rRight.x},${rRight.y} ${rBottom.x},${rBottom.y} ${rLeft.x},${rLeft.y}`,
    // Useful positions
    center: { x: (rTop.x + rBottom.x) / 2, y: (rTop.y + rBottom.y) / 2 },
    roofCenter: { x: (rTop.x + rBottom.x) / 2, y: (rTop.y + rBottom.y) / 2 },
    baseBottom: bottom,
    // Wall corner positions for decorations
    topCorner: top,
    rightCorner: right,
    bottomCorner: bottom,
    leftCorner: left,
    rTopCorner: rTop,
    rRightCorner: rRight,
    rBottomCorner: rBottom,
    rLeftCorner: rLeft,
  };
}

/** Get a point on the left wall at normalized position (u, v) */
export function leftWallPoint(
  gx: number, gy: number, gw: number, gd: number, h: number,
  u: number, v: number
) {
  const left = gridToScreen(gx, gy + gd);
  const bottom = gridToScreen(gx + gw, gy + gd);
  return {
    x: left.x + u * (bottom.x - left.x),
    y: left.y + u * (bottom.y - left.y) - v * h,
  };
}

/** Get a point on the right wall at normalized position (u, v) */
export function rightWallPoint(
  gx: number, gy: number, gw: number, gd: number, h: number,
  u: number, v: number
) {
  const bottom = gridToScreen(gx + gw, gy + gd);
  const right = gridToScreen(gx + gw, gy);
  return {
    x: bottom.x + u * (right.x - bottom.x),
    y: bottom.y + u * (right.y - bottom.y) - v * h,
  };
}
