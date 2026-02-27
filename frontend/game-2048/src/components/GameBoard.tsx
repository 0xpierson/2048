import { useCallback, useEffect, useState } from 'react';
import type { Direction, GameState } from '../game/types';
import { createInitialGameState, move } from '../game/logic';

interface GameBoardProps {
    size?: number;
    onGameOver?: (finalScore: number) => void;
    canPlay: boolean;
}

function keyToDirection(key: string): Direction | null {
    switch (key) {
        case 'ArrowUp':
            return 'up';
        case 'ArrowRight':
            return 'right';
        case 'ArrowDown':
            return 'down';
        case 'ArrowLeft':
            return 'left';
        default:
            return null;
    }
}

export function GameBoard({ size = 4, onGameOver, canPlay }: GameBoardProps) {
    const [state, setState] = useState<GameState>(() => createInitialGameState(size));

    const handleMove = useCallback(
        (direction: Direction) => {
            setState((current) => {
                const next = move(current, direction);
                if (!current.over && next.over && onGameOver) {
                    onGameOver(next.score);
                }
                return next;
            });
        },
        [onGameOver],
    );

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (!canPlay) {
                return;
            }
            const direction = keyToDirection(event.key);
            if (!direction) return;
            event.preventDefault();
            handleMove(direction);
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [canPlay, handleMove]);

    const handleRestart = () => {
        setState(createInitialGameState(size));
    };

    return (
        <section className="game-layout">
            <div className="game-header-row">
                <div>
                    <h2>2048</h2>
                    <p className="game-subtitle">Use your arrow keys to move the tiles. Combine them to reach 2048 and beyond.</p>
                </div>
                <div className="game-score-panel">
                    <div className="score-card">
                        <span className="label">Score</span>
                        <span className="value">{state.score}</span>
                    </div>
                    <button type="button" className="btn btn-ghost" onClick={handleRestart}>
                        Restart
                    </button>
                </div>
            </div>

            <div className="board">
                {Array.from({ length: state.size }, (_, y) => (
                    <div key={y} className="board-row">
                        {Array.from({ length: state.size }, (_, x) => {
                            const column = state.grid[x] ?? [];
                            const value = column[y] ?? 0;
                            const key = `${x}-${y}`;
                            const isEmpty = value === 0;
                            const tileClass = `tile tile-${value}`;
                            return (
                                <div key={key} className="board-cell">
                                    <div className={tileClass}>{!isEmpty ? value : ''}</div>
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>

            {!canPlay && (
                <div className="game-overlay">
                    <div className="game-overlay-card">
                        <h3>Start a bet game to play</h3>
                    </div>
                </div>
            )}

            {state.over && (
                <div className="game-overlay">
                    <div className="game-overlay-card">
                        <h3>{state.won ? 'You reached 2048!' : 'Game over'}</h3>
                        <p>Your final score: {state.score}</p>
                        <button type="button" className="btn btn-primary" onClick={handleRestart}>
                            Play again
                        </button>
                    </div>
                </div>
            )}
        </section>
    );
}

