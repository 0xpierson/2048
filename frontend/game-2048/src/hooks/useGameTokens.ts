import { useCallback, useEffect, useState } from 'react';
import { getContract } from 'opnet';
import type { Address } from '@btc-vision/transaction';
import { useOPNet } from '../providers/OPNetProvider';
import { useWallet } from './useWallet';
import { useGame2048Contract } from './useGame2048Contract';
import { OP20_ABI, type IOP20 } from '../abi/op20Abi';

export type GameTokenKind = 'PILL' | 'MOTO';

export interface GameTokenInfo {
    address: Address | null;
    symbol: string;
    decimals: number;
    balance: bigint | null;
}

interface UseGameTokensResult {
    tokens: Record<GameTokenKind, GameTokenInfo>;
    loading: boolean;
    error: Error | null;
    refresh: () => Promise<void>;
}

const DEFAULT_TOKEN_STATE: Record<GameTokenKind, GameTokenInfo> = {
    PILL: {
        address: null,
        symbol: 'PILL',
        decimals: 8,
        balance: null,
    },
    MOTO: {
        address: null,
        symbol: 'MOTO',
        decimals: 8,
        balance: null,
    },
};

export function useGameTokens(): UseGameTokensResult {
    const { provider, network } = useOPNet();
    const { addressObject } = useWallet();
    const { contract } = useGame2048Contract();

    const [tokens, setTokens] = useState<Record<GameTokenKind, GameTokenInfo>>(DEFAULT_TOKEN_STATE);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const refresh = useCallback(async () => {
        if (!contract || !provider) {
            setTokens(DEFAULT_TOKEN_STATE);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const [motoTokenRes, pillTokenRes] = await Promise.all([
                contract.getMotoToken(),
                contract.getPillToken(),
            ]);

            const motoToken = motoTokenRes.properties.token;
            const pillToken = pillTokenRes.properties.token;

            const sender = addressObject ?? undefined;
            const motoContract: IOP20 = getContract<IOP20>(
                motoToken,
                OP20_ABI,
                provider,
                network,
                sender,
            );
            const pillContract: IOP20 = getContract<IOP20>(
                pillToken,
                OP20_ABI,
                provider,
                network,
                sender,
            );

            const [motoMetadata, pillMetadata, motoBalance, pillBalance] = await Promise.all([
                motoContract.metadata(),
                pillContract.metadata(),
                addressObject ? motoContract.balanceOf(addressObject) : Promise.resolve(null),
                addressObject ? pillContract.balanceOf(addressObject) : Promise.resolve(null),
            ]);

            setTokens({
                PILL: {
                    address: pillToken,
                    symbol: pillMetadata.properties.symbol,
                    decimals: pillMetadata.properties.decimals,
                    balance: pillBalance?.properties.balance ?? null,
                },
                MOTO: {
                    address: motoToken,
                    symbol: motoMetadata.properties.symbol,
                    decimals: motoMetadata.properties.decimals,
                    balance: motoBalance?.properties.balance ?? null,
                },
            });
        } catch (err) {
            const refreshError = err instanceof Error ? err : new Error(String(err));
            setTokens(DEFAULT_TOKEN_STATE);
            setError(refreshError);
        } finally {
            setLoading(false);
        }
    }, [addressObject, contract, network, provider]);

    useEffect(() => {
        if (!contract || !provider) {
            setTokens(DEFAULT_TOKEN_STATE);
            return;
        }

        void refresh();
    }, [addressObject, contract, provider, refresh]);

    return {
        tokens,
        loading,
        error,
        refresh,
    };
}

