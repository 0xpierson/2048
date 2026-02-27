import type { CellPosition, Direction, GameState } from './types';

function emptyGrid(size: number): number[][] {
    return Array.from({ length: size }, () => Array.from({ length: size }, () => 0));
}

function cloneGrid(grid: number[][]): number[][] {
    return grid.map((row) => row.slice());
}

function randomAvailableCell(grid: number[][]): CellPosition | null {
    const cells: CellPosition[] = [];
    for (let x = 0; x < grid.length; x += 1) {
        for (let y = 0; y < grid[x].length; y += 1) {
            if (grid[x][y] === 0) {
                cells.push({ x, y });
            }
        }
    }
    if (!cells.length) {
        return null;
    }
    const index = Math.floor(Math.random() * cells.length);
    return cells[index] ?? null;
}

function addRandomTile(grid: number[][]): void {
    const cell = randomAvailableCell(grid);
    if (!cell) {
        return;
    }
    const value = Math.random() < 0.9 ? 2 : 4;
    grid[cell.x][cell.y] = value;
}

export function createInitialGameState(size = 4): GameState {
    const grid = emptyGrid(size);
    addRandomTile(grid);
    addRandomTile(grid);
    return {
        size,
        grid,
        score: 0,
        over: false,
        won: false,
    };
}

function buildTraversals(size: number, vector: CellPosition): { x: number[]; y: number[] } {
    const traversals = {
        x: [] as number[],
        y: [] as number[],
    };

    for (let pos = 0; pos < size; pos += 1) {
        traversals.x.push(pos);
        traversals.y.push(pos);
    }

    if (vector.x === 1) traversals.x.reverse();
    if (vector.y === 1) traversals.y.reverse();

    return traversals;
}

function getVector(direction: Direction): CellPosition {
    switch (direction) {
        case 'up':
            return { x: 0, y: -1 };
        case 'right':
            return { x: 1, y: 0 };
        case 'down':
            return { x: 0, y: 1 };
        case 'left':
            return { x: -1, y: 0 };
        default:
            return { x: 0, y: 0 };
    }
}

function withinBounds(size: number, position: CellPosition): boolean {
    return position.x >= 0 && position.x < size && position.y >= 0 && position.y < size;
}

function movesAvailable(grid: number[][]): boolean {
    const size = grid.length;

    // Any empty cell
    for (let x = 0; x < size; x += 1) {
        for (let y = 0; y < size; y += 1) {
            if (grid[x][y] === 0) {
                return true;
            }
        }
    }

    // Any mergeable neighbours
    const directions: Direction[] = ['up', 'right', 'down', 'left'];
    for (let x = 0; x < size; x += 1) {
        for (let y = 0; y < size; y += 1) {
            const value = grid[x][y];
            if (value === 0) continue;

            for (const direction of directions) {
                const vector = getVector(direction);
                const cell = { x: x + vector.x, y: y + vector.y };
                if (!withinBounds(size, cell)) continue;
                if (grid[cell.x][cell.y] === value) {
                    return true;
                }
            }
        }
    }

    return false;
}

export function move(state: GameState, direction: Direction): GameState {
    if (state.over) {
        return state;
    }

    const size = state.size;
    const grid = cloneGrid(state.grid);
    const vector = getVector(direction);
    const traversals = buildTraversals(size, vector);

    let moved = false;
    let score = state.score;
    let won = state.won;

    const mergedTracker: boolean[][] = Array.from({ length: size }, () =>
        Array.from({ length: size }, () => false),
    );

    for (const x of traversals.x) {
        for (const y of traversals.y) {
            const value = grid[x][y];
            if (value === 0) continue;

            let currentX = x;
            let currentY = y;

            // Find farthest position
            while (true) {
                const nextX = currentX + vector.x;
                const nextY = currentY + vector.y;
                if (!withinBounds(size, { x: nextX, y: nextY })) break;
                if (grid[nextX][nextY] !== 0) break;
                currentX = nextX;
                currentY = nextY;
            }

            // Try merge
            const targetX = currentX + vector.x;
            const targetY = currentY + vector.y;
            if (
                withinBounds(size, { x: targetX, y: targetY }) &&
                grid[targetX][targetY] === value &&
                !mergedTracker[targetX][targetY]
            ) {
                const newValue = value * 2;
                grid[x][y] = 0;
                grid[targetX][targetY] = newValue;
                mergedTracker[targetX][targetY] = true;
                score += newValue;
                moved = true;
                if (newValue === 2048) {
                    won = true;
                }
            } else {
                if (currentX !== x || currentY !== y) {
                    grid[currentX][currentY] = value;
                    grid[x][y] = 0;
                    moved = true;
                }
            }
        }
    }

    if (moved) {
        addRandomTile(grid);
    }

    const over = !movesAvailable(grid);

    return {
        ...state,
        grid,
        score,
        won,
        over,
    };
}

