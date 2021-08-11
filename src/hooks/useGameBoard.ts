import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import {
  clamp,
  createIndexArray,
  nextTileIndex,
  getId,
  resetTileIndex,
  shuffle,
} from '../utils/common';
import { DIRECTION_MAP } from '../utils/constants';
import { Vector } from '../utils/types';
import { GameStatus } from './useGameState';

export interface Location {
  r: number;
  c: number;
}

export interface Tile extends Location {
  index: number; // self increment index
  id: string;
  isNew: boolean;
  isMerging: boolean;
  canMerge: boolean;
  value: number;
}

export type Cell = Tile | undefined;

export type GameBoardParams = {
  rows: number;
  cols: number;
  pause: boolean;
  gameStatus: GameStatus;
  setGameStatus: (nextStatus: GameStatus) => void;
  addScore: (score: number) => void;
};

const createRow = <T>(rows: number, cb: (r: number) => T) =>
  Array.from(Array(rows)).map((_, r) => cb(r));

const createEmptyGrid = (rows: number, cols: number) =>
  createRow(rows, () => createRow<Cell>(cols, () => undefined));

const createNewTile = (r: number, c: number): Tile => {
  const index = nextTileIndex();
  const id = getId(index);
  return {
    index,
    id,
    r,
    c,
    isNew: true,
    canMerge: false,
    isMerging: false,
    value: Math.random() > 0.99 ? 4 : 2,
  };
};

const getEmptyCellsLocation = (grid: Cell[][]) =>
  grid.flatMap((row, r) =>
    row.flatMap<Location>((cell, c) => (cell == null ? { r, c } : [])),
  );

const createRandomTiles = (emptyCells: Location[], amount: number) => {
  const tilesNumber = emptyCells.length < amount ? emptyCells.length : amount;

  if (!tilesNumber) return [];

  return shuffle(emptyCells)
    .slice(0, tilesNumber)
    .map(({ r, c }) => createNewTile(r, c));
};

const createTraversalMap = (rows: number, cols: number, dir: Vector) => {
  const rowsMap = createIndexArray(rows);
  const colsMap = createIndexArray(cols);
  return {
    rows: dir.r > 0 ? rowsMap.reverse() : rowsMap,
    cols: dir.c > 0 ? colsMap.reverse() : colsMap,
  };
};

const sortTiles = (tiles: Tile[]) =>
  tiles.sort((t1, t2) => t1.index - t2.index);

const isWin = (tiles: Tile[]) => tiles.some(({ value }) => value === 2048);

const canGameContinue = (grid: Cell[][], tiles: Tile[]) => {
  const totalRows = grid.length;
  const totalCols = grid[0].length;
  if (tiles.length < totalRows * totalCols) return true;

  const dirs = [
    DIRECTION_MAP.Left,
    DIRECTION_MAP.Right,
    DIRECTION_MAP.Up,
    DIRECTION_MAP.Down,
  ];

  for (let ind = 0; ind < tiles.length; ind++) {
    const { r, c, value } = tiles[ind];
    for (let d = 0; d < dirs.length; d++) {
      const dir = dirs[d];
      const nextRow = clamp(r + dir.r, 0, totalRows - 1);
      const nextCol = clamp(c + dir.c, 0, totalCols - 1);

      if (nextRow !== r || nextCol !== c) {
        const tile = grid[nextRow][nextCol];
        if (tile == null || tile.value === value) return true;
      }
    }
  }
  return false;
};

const mergeAndCreateNewTiles = (grid: Cell[][]) => {
  const tiles: Tile[] = [];
  let score = 0;
  const rows = grid.length;
  const cols = grid[0].length;

  const newGrid = grid.map((row) =>
    row.map((tile) => {
      if (tile != null) {
        const { canMerge, value, index, ...rest } = tile;
        const newValue = canMerge ? 2 * value : value;
        const mergedTile = {
          ...rest,
          index,
          value: newValue,
          isMerging: canMerge,
          canMerge: false,
          isNew: false,
        };

        tiles.push(mergedTile);

        if (canMerge) {
          score += newValue;
        }

        return mergedTile;
      }

      return tile;
    }),
  );

  const emptyCells = getEmptyCellsLocation(newGrid);
  const newTiles = createRandomTiles(emptyCells, rows * cols >= 24 ? 2 : 1);
  newTiles.forEach((tile) => {
    newGrid[tile.r][tile.c] = tile;
    tiles.push(tile);
  });

  return {
    grid: newGrid,
    tiles,
    score,
  };
};

const moveInDirection = (grid: Cell[][], dir: Vector) => {
  const newGrid = grid.slice(0);
  const totalRows = newGrid.length;
  const totalCols = newGrid[0].length;
  const tiles: Tile[] = [];
  const moveStack: number[] = [];

  const traversal = createTraversalMap(totalRows, totalCols, dir);
  traversal.rows.forEach((row) => {
    traversal.cols.forEach((col) => {
      const tile = newGrid[row][col];
      if (tile != null) {
        const pos = {
          currRow: row,
          currCol: col,
          nextRow: clamp(row + dir.r, 0, totalRows - 1),
          nextCol: clamp(col + dir.c, 0, totalCols - 1),
        };

        while (pos.nextRow !== pos.currRow || pos.nextCol !== pos.currCol) {
          const { nextRow, nextCol } = pos;
          const nextTile = newGrid[nextRow][nextCol];
          if (nextTile != null) {
            if (nextTile.value === tile.value && !nextTile.canMerge) {
              pos.currRow = nextRow;
              pos.currCol = nextCol;
            }
            break;
          }
          pos.currRow = nextRow;
          pos.currCol = nextCol;
          pos.nextRow = clamp(nextRow + dir.r, 0, totalRows - 1);
          pos.nextCol = clamp(nextCol + dir.c, 0, totalCols - 1);
        }

        const { currRow, currCol } = pos;
        const currentTile = newGrid[currRow][currCol];
        if (currRow !== row || currCol !== col) {
          const updatedTile = {
            ...tile,
            r: currRow,
            c: currCol,
            canMerge: tile.value === currentTile?.value,
            isNew: false,
            isMerging: false,
          };
          newGrid[currRow][currCol] = updatedTile;
          newGrid[row][col] = undefined;
          tiles.push(updatedTile);
          moveStack.push(updatedTile.index);
        } else if (currentTile != null) {
          tiles.push({ ...currentTile, isNew: false, isMerging: false });
        }
      }
    });
  });

  return {
    tiles,
    grid: newGrid,
    moveStack,
  };
};

const resetGameBoard = (rows: number, cols: number) => {
  resetTileIndex();
  const grid = createEmptyGrid(rows, cols);
  const emptyCells = getEmptyCellsLocation(grid);
  const newTiles = createRandomTiles(emptyCells, rows * cols >= 24 ? 4 : 2);

  newTiles.forEach((tile) => {
    grid[tile.r][tile.c] = tile;
  });

  return {
    grid,
    tiles: newTiles,
  };
};

const useGameBoard = ({
  rows,
  cols,
  pause,
  gameStatus,
  setGameStatus,
  addScore,
}: GameBoardParams) => {
  const gridRef = useRef(createEmptyGrid(rows, cols));
  const [tiles, setTiles] = useState<Tile[]>([]);
  const pendingStackRef = useRef<number[]>([]);
  const [moving, setMoving] = useState(false);
  const pauseRef = useRef(pause);

  const onMove = useCallback((dir: Vector) => {
    if (pendingStackRef.current.length === 0 && !pauseRef.current) {
      const {
        tiles: newTiles,
        moveStack,
        grid,
      } = moveInDirection(gridRef.current, dir);
      gridRef.current = grid;
      pendingStackRef.current = moveStack;

      if (moveStack.length > 0) {
        setMoving(true);

        setTiles(sortTiles(newTiles));
      }
    }
  }, []);

  const onMovePending = useCallback(() => {
    pendingStackRef.current.pop();
    setMoving(pendingStackRef.current.length > 0);
  }, []);

  useLayoutEffect(() => {
    if (!moving) {
      const {
        tiles: newTiles,
        score,
        grid,
      } = mergeAndCreateNewTiles(gridRef.current);
      gridRef.current = grid;

      addScore(score);
      setTiles(sortTiles(newTiles));
    }
  }, [moving, addScore]);

  useLayoutEffect(() => {
    pauseRef.current = pause;
  }, [pause]);

  useEffect(() => {
    const { grid, tiles: newTiles } = resetGameBoard(rows, cols);
    gridRef.current = grid;
    setTiles(newTiles);
    setGameStatus('running');
  }, [rows, cols, setGameStatus]);

  useEffect(() => {
    if (gameStatus === 'restart') {
      const r = gridRef.current.length;
      const c = gridRef.current[0].length;
      const { grid, tiles: newTiles } = resetGameBoard(r, c);

      gridRef.current = grid;
      setTiles(newTiles);
      setGameStatus('running');
    } else if (gameStatus === 'running' && isWin(tiles)) {
      setGameStatus('win');
    } else if (
      gameStatus !== 'lost' &&
      !canGameContinue(gridRef.current, tiles)
    ) {
      setGameStatus('lost');
    }
  }, [tiles, gameStatus, setGameStatus]);

  return { tiles, onMove, onMovePending };
};

export default useGameBoard;
