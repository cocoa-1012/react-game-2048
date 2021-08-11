import { Color } from '../themes/types';

let _tileIndex = 0;

export const nextTileIndex = () => _tileIndex++;

export const resetTileIndex = () => {
  _tileIndex = 0;
};

export const shuffle = <T>(arr: T[]) => {
  const shuffled = arr.slice(0);
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
};

export const getId = (ind: number) => `${ind}_${Date.now()}`;

export const clamp = (d: number, min: number, max: number) =>
  Math.max(Math.min(max, d), min);

export const getTileFontSize = (w: number, h: number, v: number) => {
  const factor = v >= 1024 ? 2.8 : 2;
  return Math.min(w, h) / factor;
};

export const getTileColor = (v: number) => `tile${clamp(v, 2, 2048)}` as Color;

export const calcSegmentSize = (
  length: number,
  segmentNum: number,
  spacing: number,
) => (length - (segmentNum + 1) * spacing) / segmentNum;

export const calcTileSize = (
  gridSize: number,
  rows: number,
  cols: number,
  spacing: number,
) => ({
  width: calcSegmentSize(gridSize, cols, spacing),
  height: calcSegmentSize(gridSize, rows, spacing),
});

export const calcLocation = (l: number, c: number, spacing: number) =>
  (spacing + l) * c + spacing;

export const createIndexArray = (len: number) => Array.from(Array(len).keys());
