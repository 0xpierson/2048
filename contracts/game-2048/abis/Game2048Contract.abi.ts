import { ABIDataTypes, BitcoinAbiTypes, OP_NET_ABI } from 'opnet';

export const Game2048ContractEvents = [];

export const Game2048ContractAbi = [
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
        name: 'submitScore',
        inputs: [{ name: 'score', type: ABIDataTypes.UINT256 }],
        outputs: [],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getMyBestScore',
        inputs: [],
        outputs: [{ name: 'score', type: ABIDataTypes.UINT256 }],
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
        name: 'getMyGamesPlayed',
        inputs: [],
        outputs: [{ name: 'gamesPlayed', type: ABIDataTypes.UINT256 }],
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
    ...Game2048ContractEvents,
    ...OP_NET_ABI,
];

export default Game2048ContractAbi;
