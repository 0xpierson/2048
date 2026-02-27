# Game 2048 Contract (OPNet)

This AssemblyScript contract is a lightweight on-chain companion for the classic 2048 game. It does **not** run the game logic on-chain; instead, it records scores submitted by players and exposes simple read methods for the frontend.

## Features

- Tracks **per-player best score**
- Tracks **per-player number of games played**
- Tracks **global best score** across all players

The actual board, moves, and merges all run in the browser. When a user finishes a run, the frontend calls `submitScore(score)` on this contract.

## Storage Layout

- `totalGames` (`StoredU256`) — total number of submitted games
- `globalHighScore` (`StoredU256`) — best score seen across all players
- `playerHighScores` (`AddressMemoryMap`) — `Address -> u256` best score
- `playerGamesPlayed` (`AddressMemoryMap`) — `Address -> u256` number of submitted games

Pointers are allocated via `Blockchain.nextPointer` to guarantee uniqueness.

## Public Methods

- `submitScore(score: u256): void`  
  Records a finished game for `msg.sender`. Rejects zero scores, updates personal and global high scores and increments counters.

- `getMyBestScore(): u256`  
  Returns the caller's best score.

- `getMyGamesPlayed(): u256`  
  Returns how many games the caller has submitted.

- `getGlobalBestScore(): u256`  
  Returns the global best score across all players.

## Build

From this folder:

```bash
npm install
npm run build
```

This will produce `build/game-2048.wasm` ready to deploy with the OPNet toolchain.

