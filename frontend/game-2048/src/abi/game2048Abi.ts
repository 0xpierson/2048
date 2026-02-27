import {
    ABIDataTypes,
    BitcoinAbiTypes,
    type BitcoinInterfaceAbi,
    type CallResult,
    type OPNetEvent,
    type BaseContractProperties,
    OP_NET_ABI,
} from 'opnet';
import type { Address } from '@btc-vision/transaction';

export const GAME_2048_ABI: BitcoinInterfaceAbi = [
    {
        name: 'startBetGame',
        inputs: [
            { name: 'tokenType', type: ABIDataTypes.UINT256 },
            { name: 'stakeAmount', type: ABIDataTypes.UINT256 },
        ],
        outputs: [],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'submitBetScore',
        inputs: [{ name: 'score', type: ABIDataTypes.UINT256 }],
        outputs: [],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'submitScore',
        inputs: [{ name: 'score', type: ABIDataTypes.UINT256 }],
        outputs: [],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'cancelBetGame',
        inputs: [],
        outputs: [],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'depositMoto',
        inputs: [{ name: 'amount', type: ABIDataTypes.UINT256 }],
        outputs: [],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'depositPill',
        inputs: [{ name: 'amount', type: ABIDataTypes.UINT256 }],
        outputs: [],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'isOwner',
        inputs: [],
        outputs: [{ name: 'isOwner', type: ABIDataTypes.BOOL }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getOwner',
        inputs: [],
        outputs: [{ name: 'owner', type: ABIDataTypes.ADDRESS }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getMyBestScore',
        inputs: [],
        outputs: [{ name: 'score', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getMyGamesPlayed',
        inputs: [],
        outputs: [{ name: 'gamesPlayed', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getMyActiveBet',
        inputs: [],
        outputs: [
            { name: 'tokenType', type: ABIDataTypes.UINT256 },
            { name: 'stakeAmount', type: ABIDataTypes.UINT256 },
        ],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getGlobalBestScore',
        inputs: [],
        outputs: [{ name: 'score', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getMotoToken',
        inputs: [],
        outputs: [{ name: 'token', type: ABIDataTypes.ADDRESS }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getPillToken',
        inputs: [],
        outputs: [{ name: 'token', type: ABIDataTypes.ADDRESS }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getMotoPoolBalance',
        inputs: [],
        outputs: [{ name: 'poolBalance', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getPillPoolBalance',
        inputs: [],
        outputs: [{ name: 'poolBalance', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    ...OP_NET_ABI,
];

export interface Game2048StatsValues {
    myBestScore: bigint;
    myGamesPlayed: bigint;
    globalBestScore: bigint;
    [key: string]: bigint;
}

export interface Game2048TokensValues {
    motoToken: Address;
    pillToken: Address;
    [key: string]: Address;
}

export type Game2048BestScoreResult = CallResult<{ score: bigint }, OPNetEvent<never>[]>;
export type Game2048GamesPlayedResult = CallResult<{ gamesPlayed: bigint }, OPNetEvent<never>[]>;
export type Game2048GlobalBestScoreResult = CallResult<{ score: bigint }, OPNetEvent<never>[]>;
export type Game2048MotoTokenResult = CallResult<{ token: Address }, OPNetEvent<never>[]>;
export type Game2048PillTokenResult = CallResult<{ token: Address }, OPNetEvent<never>[]>;
export type Game2048MotoPoolBalanceResult = CallResult<{ poolBalance: bigint }, OPNetEvent<never>[]>;
export type Game2048PillPoolBalanceResult = CallResult<{ poolBalance: bigint }, OPNetEvent<never>[]>;
export type Game2048ActiveBetResult = CallResult<
    { tokenType: bigint; stakeAmount: bigint },
    OPNetEvent<never>[]
>;

export interface IGame2048Contract extends BaseContractProperties {
    startBetGame(tokenType: bigint, stakeAmount: bigint): Promise<CallResult<{}, []>>;
    submitBetScore(score: bigint): Promise<CallResult<{}, []>>;
    submitScore(score: bigint): Promise<CallResult<{}, []>>;
    cancelBetGame(): Promise<CallResult<{}, []>>;
    depositMoto(amount: bigint): Promise<CallResult<{}, []>>;
    depositPill(amount: bigint): Promise<CallResult<{}, []>>;
    isOwner(): Promise<CallResult<{ isOwner: boolean }, OPNetEvent<never>[]>>;
    getOwner(): Promise<CallResult<{ owner: Address }, OPNetEvent<never>[]>>;
    getMyBestScore(): Promise<Game2048BestScoreResult>;
    getMyGamesPlayed(): Promise<Game2048GamesPlayedResult>;
    getGlobalBestScore(): Promise<Game2048GlobalBestScoreResult>;
    getMotoToken(): Promise<Game2048MotoTokenResult>;
    getPillToken(): Promise<Game2048PillTokenResult>;
    getMotoPoolBalance(): Promise<Game2048MotoPoolBalanceResult>;
    getPillPoolBalance(): Promise<Game2048PillPoolBalanceResult>;
    getMyActiveBet(): Promise<Game2048ActiveBetResult>;
}

