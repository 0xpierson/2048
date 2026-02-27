export type Direction = 'up' | 'right' | 'down' | 'left';

export interface CellPosition {
    x: number;
    y: number;
}

export interface GameState {
    size: number;
    grid: number[][];
    score: number;
    over: boolean;
    won: boolean;
}

