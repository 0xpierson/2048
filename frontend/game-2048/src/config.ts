import { networks, type Network } from '@btc-vision/bitcoin';

export const OPNET_RPC_URL: string =
    import.meta.env.VITE_OPNET_RPC_URL ?? 'https://testnet.opnet.org';

export const OPNET_NETWORK: Network =
    'opnetTestnet' in networks &&
    typeof (networks as { opnetTestnet?: Network }).opnetTestnet !== 'undefined'
        ? (networks as { opnetTestnet: Network }).opnetTestnet
        : {
              messagePrefix: '\x18Bitcoin Signed Message:\n',
              bech32: 'opt',
              bech32Opnet: 'opt',
              bip32: { public: 0x043587cf, private: 0x04358394 },
              pubKeyHash: 0x6f,
              scriptHash: 0xc4,
              wif: 0xef,
          };

/**
 * Contract address of the deployed Game2048Contract on OPNet testnet.
 *
 * TODO: Replace the placeholder with the real P2OP contract address, e.g. set:
 * VITE_GAME2048_CONTRACT_ADDRESS=opt1...
 * in a local .env file (do NOT commit secrets).
 */
export const GAME_2048_CONTRACT_ADDRESS: string | null =
    (import.meta.env.VITE_GAME2048_CONTRACT_ADDRESS as string | undefined)?.trim() || null;

