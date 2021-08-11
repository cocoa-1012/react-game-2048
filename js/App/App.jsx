import React, { useCallback, useEffect } from 'react';
import { ThemeProvider } from 'styled-components';
import Box from '../components/Box';
import Control from '../components/Control/Control';
import GameBoard from '../components/GameBoard';
import ScoreBoard from '../components/ScoreBoard';
import Switch from '../components/Switch';
import Text from '../components/Text';
import useGameBoard from '../hooks/useGameBoard';
import useGameScore from '../hooks/useGameScore';
import useGameState from '../hooks/useGameState';
import useScaleControl from '../hooks/useScaleControl';
import { GRID_SIZE, MIN_SCALE, SPACING } from '../utils/constants';
import useLocalStorage from '../hooks/useLocalStorage';
import useTheme from '../hooks/useTheme';
const APP_NAME = 'react-2048';
const App = () => {
  const [{ status: gameStatus, pause }, setGameStatus] = useGameState({
    status: 'running',
    pause: false,
  });
  const [config, setConfig] = useLocalStorage(APP_NAME, {
    theme: 'default',
    bestScore: 0,
    rows: MIN_SCALE,
    cols: MIN_SCALE,
  });
  const [{ name: themeName, value: themeValue }, setTheme] = useTheme(
    config.theme,
  );
  const [rows, setRows] = useScaleControl(config.rows);
  const [cols, setCols] = useScaleControl(config.cols);
  const { total, best, addScore, setTotal } = useGameScore(config.bestScore);
  const { tiles, onMove, onMovePending } = useGameBoard({
    rows,
    cols,
    pause,
    gameStatus,
    setGameStatus,
    addScore,
  });
  console.log(MIN_SCALE, 'MIN_SCALEMIN_SCALE');
  const onResetGame = useCallback(() => {
    setGameStatus('restart');
  }, [setGameStatus]);
  const onCloseNotification = useCallback(
    (currentStatus) => {
      setGameStatus(currentStatus === 'win' ? 'continue' : 'restart');
    },
    [setGameStatus],
  );
  useEffect(() => {
    if (gameStatus === 'restart') setTotal(0);
  }, [gameStatus, setTotal]);
  useEffect(() => {
    setConfig({ rows, cols, bestScore: best, theme: themeName });
  }, [rows, cols, best, themeName, setConfig]);
  return (
    <ThemeProvider theme={themeValue}>
      <Box
        justifyContent="center"
        inlineSize="100%"
        blockSize="100%"
        alignItems="start"
        borderRadius={0}
      >
        <Box
          justifyContent="center"
          flexDirection="column"
          inlineSize={`${GRID_SIZE}px`}
        >
          <Box inlineSize="100%" justifyContent="space-between">
            <Box>
              <Text fontSize={22} fontWeight="medium" color="secondary">
                2048
              </Text>
            </Box>
            <Box justifyContent="center">
              <ScoreBoard total={total} title="score" />
              <ScoreBoard total={best} title="best" />
            </Box>
          </Box>
          <Box marginBlockStart="s3" marginBlockEnd="s6" inlineSize="100%">
            <Control
              rows={rows}
              cols={cols}
              onReset={onResetGame}
              onChangeRow={setRows}
              onChangeCol={setCols}
            />
          </Box>
          <GameBoard
            tiles={tiles}
            boardSize={GRID_SIZE}
            rows={rows}
            cols={cols}
            spacing={SPACING}
            gameStatus={gameStatus}
            onMove={onMove}
            onMovePending={onMovePending}
            onCloseNotification={onCloseNotification}
          />
          <Box marginBlock="s4" justifyContent="center" flexDirection="column">
            <Text fontSize={16} as="p" color="primary">
              ✨ Join tiles with the same value to get 2048
            </Text>
            <Text fontSize={16} as="p" color="primary">
              🕹️ Play with arrow keys or swipe
            </Text>
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
};
export default App;
