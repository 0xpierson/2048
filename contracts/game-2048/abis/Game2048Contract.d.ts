import { Address, AddressMap, ExtendedAddressMap, SchnorrSignature } from '@btc-vision/transaction';
import { CallResult, OPNetEvent, IOP_NETContract } from 'opnet';

// ------------------------------------------------------------------
// Event Definitions
// ------------------------------------------------------------------

// ------------------------------------------------------------------
// Call Results
// ------------------------------------------------------------------

/**
 * @description Represents the result of the startBetGame function call.
 */
export type StartBetGame = CallResult<{}, OPNetEvent<never>[]>;

/**
 * @description Represents the result of the submitBetScore function call.
 */
export type SubmitBetScore = CallResult<{}, OPNetEvent<never>[]>;

/**
 * @description Represents the result of the cancelBetGame function call.
 */
export type CancelBetGame = CallResult<{}, OPNetEvent<never>[]>;

/**
 * @description Represents the result of the depositMoto function call.
 */
export type DepositMoto = CallResult<{}, OPNetEvent<never>[]>;

/**
 * @description Represents the result of the depositPill function call.
 */
export type DepositPill = CallResult<{}, OPNetEvent<never>[]>;

/**
 * @description Represents the result of the submitScore function call.
 */
export type SubmitScore = CallResult<{}, OPNetEvent<never>[]>;

/**
 * @description Represents the result of the getMyBestScore function call.
 */
export type GetMyBestScore = CallResult<
    {
        score: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the getMyActiveBet function call.
 */
export type GetMyActiveBet = CallResult<
    {
        tokenType: bigint;
        stakeAmount: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the getMyGamesPlayed function call.
 */
export type GetMyGamesPlayed = CallResult<
    {
        gamesPlayed: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the isOwner function call.
 */
export type IsOwner = CallResult<
    {
        isOwner: boolean;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the getOwner function call.
 */
export type GetOwner = CallResult<
    {
        owner: Address;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the getGlobalBestScore function call.
 */
export type GetGlobalBestScore = CallResult<
    {
        score: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the getMotoToken function call.
 */
export type GetMotoToken = CallResult<
    {
        token: Address;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the getPillToken function call.
 */
export type GetPillToken = CallResult<
    {
        token: Address;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the getMotoPoolBalance function call.
 */
export type GetMotoPoolBalance = CallResult<
    {
        poolBalance: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the getPillPoolBalance function call.
 */
export type GetPillPoolBalance = CallResult<
    {
        poolBalance: bigint;
    },
    OPNetEvent<never>[]
>;

// ------------------------------------------------------------------
// IGame2048Contract
// ------------------------------------------------------------------
export interface IGame2048Contract extends IOP_NETContract {
    startBetGame(tokenType: bigint, stakeAmount: bigint): Promise<StartBetGame>;
    submitBetScore(score: bigint): Promise<SubmitBetScore>;
    cancelBetGame(): Promise<CancelBetGame>;
    depositMoto(amount: bigint): Promise<DepositMoto>;
    depositPill(amount: bigint): Promise<DepositPill>;
    submitScore(score: bigint): Promise<SubmitScore>;
    getMyBestScore(): Promise<GetMyBestScore>;
    getMyActiveBet(): Promise<GetMyActiveBet>;
    getMyGamesPlayed(): Promise<GetMyGamesPlayed>;
    isOwner(): Promise<IsOwner>;
    getOwner(): Promise<GetOwner>;
    getGlobalBestScore(): Promise<GetGlobalBestScore>;
    getMotoToken(): Promise<GetMotoToken>;
    getPillToken(): Promise<GetPillToken>;
    getMotoPoolBalance(): Promise<GetMotoPoolBalance>;
    getPillPoolBalance(): Promise<GetPillPoolBalance>;
}
