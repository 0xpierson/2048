import {
  Address,
  Blockchain,
  OP_NET,
  StoredU256,
  AddressMemoryMap,
  EMPTY_POINTER,
  SafeMath,
  Revert,
  Calldata,
  BytesWriter,
  U256_BYTE_LENGTH,
  StoredAddress,
  TransferHelper,
  ADDRESS_BYTE_LENGTH,
} from '@btc-vision/btc-runtime/runtime';
import { u256 } from '@btc-vision/as-bignum/assembly';

/**
 * Game2048Contract
 *
 * Simple on-chain companion for the 2048 game:
 * - Tracks per-player best score
 * - Tracks per-player number of games played
 * - Tracks global best score across all players
 *
 * The actual board logic stays client-side; the contract only verifies
 * and records scores that players choose to submit.
 *
 * This version additionally supports betting with external OP20 tokens
 * (e.g. MOTO, PILL):
 * - Players start a bet session by locking a stake in either MOTO or PILL
 * - Exactly one active bet session is allowed per address
 * - When the player submits a score for the active session:
 *   - If score < 2048 → stake is lost
 *   - If score >= 2048 / 4096 / 8192 / 16384 → payout is 2x / 3x / 4x / 5x stake
 *   - Payout is sent from the contract back to the player in the same token
 *
 * Token addresses are provided once at deployment via calldata.
 */
export class Game2048Contract extends OP_NET {
  // Storage pointers (allocated via Blockchain.nextPointer for uniqueness)
  private readonly totalGamesPointer: u16 = Blockchain.nextPointer;
  private readonly globalHighScorePointer: u16 = Blockchain.nextPointer;
  private readonly playerHighScoresPointer: u16 = Blockchain.nextPointer;
  private readonly playerGamesPlayedPointer: u16 = Blockchain.nextPointer;

  private readonly ownerPointer: u16 = Blockchain.nextPointer;

  // OP20 token configuration
  private readonly motoTokenPointer: u16 = Blockchain.nextPointer;
  private readonly pillTokenPointer: u16 = Blockchain.nextPointer;

  // Tracked token pool balances for house risk management
  private readonly motoPoolBalancePointer: u16 = Blockchain.nextPointer;
  private readonly pillPoolBalancePointer: u16 = Blockchain.nextPointer;

  // Per-player active bet session state
  private readonly playerActiveStakePointer: u16 = Blockchain.nextPointer;
  private readonly playerTokenChoicePointer: u16 = Blockchain.nextPointer;

  // Storage instances
  private readonly totalGames: StoredU256 = new StoredU256(
    this.totalGamesPointer,
    EMPTY_POINTER,
  );

  private readonly globalHighScore: StoredU256 = new StoredU256(
    this.globalHighScorePointer,
    EMPTY_POINTER,
  );

  private readonly playerHighScores: AddressMemoryMap = new AddressMemoryMap(
    this.playerHighScoresPointer,
  );

  private readonly playerGamesPlayed: AddressMemoryMap = new AddressMemoryMap(
    this.playerGamesPlayedPointer,
  );

  // Configured OP20 token addresses (set in onDeployment)
  private readonly motoToken: StoredAddress = new StoredAddress(
    this.motoTokenPointer,
  );

  private readonly pillToken: StoredAddress = new StoredAddress(
    this.pillTokenPointer,
  );

  // House pool balances for each token. These mirror the contract's OP20 balances
  // under the assumption that tokens only move via this contract's methods.
  private readonly motoPoolBalance: StoredU256 = new StoredU256(
    this.motoPoolBalancePointer,
    EMPTY_POINTER,
  );

  private readonly pillPoolBalance: StoredU256 = new StoredU256(
    this.pillPoolBalancePointer,
    EMPTY_POINTER,
  );

  private readonly owner: StoredAddress = new StoredAddress(this.ownerPointer);

  // Active bet session mappings (non-zero stake means an active session)
  private readonly playerActiveStake: AddressMemoryMap =
    new AddressMemoryMap(this.playerActiveStakePointer);

  /**
   * tokenChoice encoding:
   * - 0: no active session
   * - 1: MOTO
   * - 2: PILL
   */
  private readonly playerTokenChoice: AddressMemoryMap =
    new AddressMemoryMap(this.playerTokenChoicePointer);

  // Score thresholds and corresponding multipliers for betting payouts
  private readonly threshold2048: u256 = u256.fromU64(2048);
  private readonly threshold4096: u256 = u256.fromU64(4096);
  private readonly threshold8192: u256 = u256.fromU64(8192);
  private readonly threshold16384: u256 = u256.fromU64(16384);

  public constructor() {
    super();
  }

  /**
   * onDeployment is called exactly once, during contract deployment.
   * We rely on default zero-initialization for all StoredU256/AddressMemoryMap,
   * so no explicit initialization is required here.
   */
  public override onDeployment(calldata: Calldata): void {
    const motoTokenAddress: Address = calldata.readAddress();
    const pillTokenAddress: Address = calldata.readAddress();

    this.motoToken.value = motoTokenAddress;
    this.pillToken.value = pillTokenAddress;
    this.owner.value = Blockchain.tx.sender;
  }

  /**
   * Starts a new bet session for the caller by locking stake in either MOTO or PILL.
   *
   * Requirements:
   * - Caller must not have an active bet session
   * - Stake must be greater than zero
   * - tokenType:
   *   - 1 → MOTO
   *   - 2 → PILL
   * - The chosen token must have been configured at deployment
   * - The OP20 token must have sufficient allowance for this contract to pull stake
   *
   * The stake is immediately transferred from the player to this contract.
   */
  @method(
    { name: 'tokenType', type: ABIDataTypes.UINT256 },
    { name: 'stakeAmount', type: ABIDataTypes.UINT256 },
  )
  public startBetGame(calldata: Calldata): BytesWriter {
    const tokenTypeRaw: u256 = calldata.readU256();
    const stakeAmount: u256 = calldata.readU256();

    if (stakeAmount.isZero()) {
      throw new Revert('Stake must be greater than zero');
    }

    const sender: Address = Blockchain.tx.sender;
    const existingStake: u256 = this.playerActiveStake.get(sender);

    if (!existingStake.isZero()) {
      throw new Revert('Active bet game already in progress');
    }

    const tokenTypeValue: u32 = tokenTypeRaw.toU32();
    let token: Address;

    if (tokenTypeValue === 1) {
      token = this.motoToken.value;
    } else if (tokenTypeValue === 2) {
      token = this.pillToken.value;
    } else {
      throw new Revert('Invalid token type');
    }

    if (token.isZero()) {
      throw new Revert('Token address not configured');
    }

    // Ensure the house pool (including this new stake) can safely cover
    // the maximum possible multiplier payout for this bet.
    const maximumMultiplier: u32 = 5;
    const maximumMultiplierU256: u256 = u256.fromU64(maximumMultiplier);
    const requiredPayout: u256 = SafeMath.mul(stakeAmount, maximumMultiplierU256);

    if (tokenTypeValue === 1) {
      const currentPool: u256 = this.motoPoolBalance.value;
      const poolAfter: u256 = SafeMath.add(currentPool, stakeAmount);
      if (poolAfter < requiredPayout) {
        throw new Revert('MOTO pool too small for max multiplier');
      }
      this.motoPoolBalance.set(poolAfter);
    } else {
      const currentPool: u256 = this.pillPoolBalance.value;
      const poolAfter: u256 = SafeMath.add(currentPool, stakeAmount);
      if (poolAfter < requiredPayout) {
        throw new Revert('PILL pool too small for max multiplier');
      }
      this.pillPoolBalance.set(poolAfter);
    }

    // Pull stake from player into this contract using OP20 transferFrom
    TransferHelper.transferFrom(token, sender, this.address, stakeAmount);

    this.playerActiveStake.set(sender, stakeAmount);
    this.playerTokenChoice.set(sender, tokenTypeRaw);

    return new BytesWriter(0);
  }

  /**
   * Submits the final score for the caller's active bet session and
   * settles the payout according to score thresholds.
   *
   * - If score < 2048 → no payout, stake is lost and kept by the contract
   * - If score >= 2048 / 4096 / 8192 / 16384 → payout is 2x / 3x / 4x / 5x stake
   * - Session is automatically closed after settlement (win or loss)
   *
   * This method also updates the global and per-player score statistics.
   */
  @method({ name: 'score', type: ABIDataTypes.UINT256 })
  public submitBetScore(calldata: Calldata): BytesWriter {
    const score: u256 = calldata.readU256();

    if (score.isZero()) {
      throw new Revert('Score must be greater than zero');
    }

    const sender: Address = Blockchain.tx.sender;
    const stake: u256 = this.playerActiveStake.get(sender);

    if (stake.isZero()) {
      throw new Revert('No active bet game for sender');
    }

    const tokenTypeRaw: u256 = this.playerTokenChoice.get(sender);
    const tokenTypeValue: u32 = tokenTypeRaw.toU32();
    let token: Address;

    if (tokenTypeValue === 1) {
      token = this.motoToken.value;
    } else if (tokenTypeValue === 2) {
      token = this.pillToken.value;
    } else {
      throw new Revert('Invalid stored token type');
    }

    if (token.isZero()) {
      throw new Revert('Token address not configured');
    }

    const multiplier: u32 = this.getMultiplierForScore(score);

    if (multiplier > 0) {
      const multiplierU256: u256 = u256.fromU64(multiplier);
      const payout: u256 = SafeMath.mul(stake, multiplierU256);

      // Ensure the tracked pool balance is sufficient before attempting payout.
      if (tokenTypeValue === 1) {
        const currentPool: u256 = this.motoPoolBalance.value;
        if (currentPool < payout) {
          throw new Revert('MOTO pool insufficient for payout');
        }
        const updatedPool: u256 = SafeMath.sub(currentPool, payout);
        this.motoPoolBalance.set(updatedPool);
      } else {
        const currentPool: u256 = this.pillPoolBalance.value;
        if (currentPool < payout) {
          throw new Revert('PILL pool insufficient for payout');
        }
        const updatedPool: u256 = SafeMath.sub(currentPool, payout);
        this.pillPoolBalance.set(updatedPool);
      }

      // Payout is sent from the contract back to the player
      TransferHelper.transfer(token, sender, payout);
    }

    // Close the bet session regardless of win or loss
    this.playerActiveStake.delete(sender);
    this.playerTokenChoice.delete(sender);

    this.updateScoreStats(sender, score);

    return new BytesWriter(0);
  }

  /**
   * Cancels the caller's active bet session.
   *
   * This is intended as a safety valve for UX cases where a user reloads the
   * page or loses track of their game state. The stake is treated as a loss
   * and remains in the house pool; only the session state is cleared.
   */
  @method()
  public cancelBetGame(_calldata: Calldata): BytesWriter {
    const sender: Address = Blockchain.tx.sender;
    const stake: u256 = this.playerActiveStake.get(sender);

    if (stake.isZero()) {
      throw new Revert('No active bet game for sender');
    }

    this.playerActiveStake.delete(sender);
    this.playerTokenChoice.delete(sender);

    return new BytesWriter(0);
  }

  /**
   * Deposits additional MOTO tokens into the contract balance.
   * Restricted to the contract owner.
   */
  @method({ name: 'amount', type: ABIDataTypes.UINT256 })
  public depositMoto(calldata: Calldata): BytesWriter {
    this.onlyOwner();

    const amount: u256 = calldata.readU256();

    if (amount.isZero()) {
      throw new Revert('Amount must be greater than zero');
    }

    const token: Address = this.motoToken.value;

    if (token.isZero()) {
      throw new Revert('MOTO token not configured');
    }

    // Increase tracked pool balance first; transferFrom must succeed or the
    // entire transaction will revert and state will roll back.
    const currentPool: u256 = this.motoPoolBalance.value;
    const updatedPool: u256 = SafeMath.add(currentPool, amount);
    this.motoPoolBalance.set(updatedPool);

    TransferHelper.transferFrom(
      token,
      Blockchain.tx.sender,
      this.address,
      amount,
    );

    return new BytesWriter(0);
  }

  /**
   * Deposits additional PILL tokens into the contract balance.
   * Restricted to the contract owner.
   */
  @method({ name: 'amount', type: ABIDataTypes.UINT256 })
  public depositPill(calldata: Calldata): BytesWriter {
    this.onlyOwner();

    const amount: u256 = calldata.readU256();

    if (amount.isZero()) {
      throw new Revert('Amount must be greater than zero');
    }

    const token: Address = this.pillToken.value;

    if (token.isZero()) {
      throw new Revert('PILL token not configured');
    }

    // Increase tracked pool balance first; transferFrom must succeed or the
    // entire transaction will revert and state will roll back.
    const currentPool: u256 = this.pillPoolBalance.value;
    const updatedPool: u256 = SafeMath.add(currentPool, amount);
    this.pillPoolBalance.set(updatedPool);

    TransferHelper.transferFrom(
      token,
      Blockchain.tx.sender,
      this.address,
      amount,
    );

    return new BytesWriter(0);
  }

  /**
   * Submit a finished 2048 game score for the caller.
   *
   * - Rejects zero scores
   * - Updates the caller's personal best if this score is higher
   * - Increments the caller's games played counter
   * - Increments the global totalGames counter
   * - Updates the globalHighScore if this score beats the global best
   */
  @method({ name: 'score', type: ABIDataTypes.UINT256 })
  public submitScore(calldata: Calldata): BytesWriter {
    const score: u256 = calldata.readU256();

    const sender: Address = Blockchain.tx.sender;

    this.updateScoreStats(sender, score);

    return new BytesWriter(0);
  }

  /**
   * Returns the caller's best score so far.
   */
  @returns({ name: 'score', type: ABIDataTypes.UINT256 })
  public getMyBestScore(_calldata: Calldata): BytesWriter {
    const sender: Address = Blockchain.tx.sender;
    const best: u256 = this.playerHighScores.get(sender);

    const writer = new BytesWriter(U256_BYTE_LENGTH);
    writer.writeU256(best);
    return writer;
  }

  /**
   * Returns the caller's active bet session state, if any.
   *
   * - tokenType:
   *   - 0 → no active session
   *   - 1 → MOTO
   *   - 2 → PILL
   * - stakeAmount:
   *   - 0 → no active session
   *   - >0 → locked stake amount
   */
  @returns(
    { name: 'tokenType', type: ABIDataTypes.UINT256 },
    { name: 'stakeAmount', type: ABIDataTypes.UINT256 },
  )
  public getMyActiveBet(_calldata: Calldata): BytesWriter {
    const sender: Address = Blockchain.tx.sender;
    const stake: u256 = this.playerActiveStake.get(sender);
    const tokenType: u256 = this.playerTokenChoice.get(sender);

    const writer = new BytesWriter(U256_BYTE_LENGTH * 2);
    writer.writeU256(tokenType);
    writer.writeU256(stake);
    return writer;
  }

  /**
   * Returns the caller's total number of submitted games.
   */
  @returns({ name: 'gamesPlayed', type: ABIDataTypes.UINT256 })
  public getMyGamesPlayed(_calldata: Calldata): BytesWriter {
    const sender: Address = Blockchain.tx.sender;
    const games: u256 = this.playerGamesPlayed.get(sender);

    const writer = new BytesWriter(U256_BYTE_LENGTH);
    writer.writeU256(games);
    return writer;
  }

  /**
   * Returns true if the caller is the contract owner.
   */
  @returns({ name: 'isOwner', type: ABIDataTypes.BOOL })
  public isOwner(_calldata: Calldata): BytesWriter {
    const sender: Address = Blockchain.tx.sender;
    const isOwnerValue: bool = sender.equals(this.owner.value);

    const writer = new BytesWriter(1);
    writer.writeBoolean(isOwnerValue);
    return writer;
  }

  /**
   * Returns the configured contract owner address.
   */
  @returns({ name: 'owner', type: ABIDataTypes.ADDRESS })
  public getOwner(_calldata: Calldata): BytesWriter {
    const writer = new BytesWriter(ADDRESS_BYTE_LENGTH);
    writer.writeAddress(this.owner.value);
    return writer;
  }

  /**
   * Returns the global best score across all players.
   */
  @returns({ name: 'score', type: ABIDataTypes.UINT256 })
  public getGlobalBestScore(_calldata: Calldata): BytesWriter {
    const globalBest: u256 = this.globalHighScore.value;

    const writer = new BytesWriter(U256_BYTE_LENGTH);
    writer.writeU256(globalBest);
    return writer;
  }

  /**
   * Returns the configured MOTO token address.
   */
  @returns({ name: 'token', type: ABIDataTypes.ADDRESS })
  public getMotoToken(_calldata: Calldata): BytesWriter {
    const writer = new BytesWriter(ADDRESS_BYTE_LENGTH);
    writer.writeAddress(this.motoToken.value);
    return writer;
  }

  /**
   * Returns the configured PILL token address.
   */
  @returns({ name: 'token', type: ABIDataTypes.ADDRESS })
  public getPillToken(_calldata: Calldata): BytesWriter {
    const writer = new BytesWriter(ADDRESS_BYTE_LENGTH);
    writer.writeAddress(this.pillToken.value);
    return writer;
  }

  /**
   * Returns the tracked MOTO pool balance held by this contract.
   */
  @returns({ name: 'poolBalance', type: ABIDataTypes.UINT256 })
  public getMotoPoolBalance(_calldata: Calldata): BytesWriter {
    const balance: u256 = this.motoPoolBalance.value;
    const writer = new BytesWriter(U256_BYTE_LENGTH);
    writer.writeU256(balance);
    return writer;
  }

  /**
   * Returns the tracked PILL pool balance held by this contract.
   */
  @returns({ name: 'poolBalance', type: ABIDataTypes.UINT256 })
  public getPillPoolBalance(_calldata: Calldata): BytesWriter {
    const balance: u256 = this.pillPoolBalance.value;
    const writer = new BytesWriter(U256_BYTE_LENGTH);
    writer.writeU256(balance);
    return writer;
  }

  /**
   * Internal helper to update score statistics for a given player.
   */
  private updateScoreStats(sender: Address, score: u256): void {
    if (score.isZero()) {
      throw new Revert('Score must be greater than zero');
    }

    const previousHigh: u256 = this.playerHighScores.get(sender);
    if (score > previousHigh) {
      this.playerHighScores.set(sender, score);
    }

    const previousGames: u256 = this.playerGamesPlayed.get(sender);
    const newGames: u256 = SafeMath.add(previousGames, u256.fromU64(1));
    this.playerGamesPlayed.set(sender, newGames);

    const currentTotalGames: u256 = this.totalGames.value;
    const updatedTotalGames: u256 = SafeMath.add(
      currentTotalGames,
      u256.fromU64(1),
    );
    this.totalGames.set(updatedTotalGames);

    const currentGlobalHigh: u256 = this.globalHighScore.value;
    if (score > currentGlobalHigh) {
      this.globalHighScore.set(score);
    }
  }

  /**
   * Returns the payout multiplier for a given score.
   *
   * - 0 if score < 2048
   * - 2 if 2048 <= score < 4096
   * - 3 if 4096 <= score < 8192
   * - 4 if 8192 <= score < 16384
   * - 5 if score >= 16384
   */
  private getMultiplierForScore(score: u256): u32 {
    if (score >= this.threshold16384) {
      return 5;
    }

    if (score >= this.threshold8192) {
      return 4;
    }

    if (score >= this.threshold4096) {
      return 3;
    }

    if (score >= this.threshold2048) {
      return 2;
    }

    return 0;
  }

  /**
   * Internal access-control helper to restrict calls to the contract owner.
   */
  private onlyOwner(): void {
    if (!Blockchain.tx.sender.equals(this.owner.value)) {
      throw new Revert('Caller is not owner');
    }
  }
}

