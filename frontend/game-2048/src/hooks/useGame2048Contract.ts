import { useCallback, useEffect, useMemo, useState } from 'react';
import { getContract } from 'opnet';
import { GAME_2048_ABI, type IGame2048Contract } from '../abi/game2048Abi';
import { useOPNet } from '../providers/OPNetProvider';
import { useWallet } from './useWallet';
import { GAME_2048_CONTRACT_ADDRESS } from '../config';

export interface Game2048ContractStats {
    myBestScore: bigint | null;
    myGamesPlayed: bigint | null;
    globalBestScore: bigint | null;
    motoPoolBalance: bigint | null;
    pillPoolBalance: bigint | null;
}

interface UseGame2048ContractResult {
    contract: IGame2048Contract | null;
    contractAddress: string | null;
    loading: boolean;
    error: Error | null;
    stats: Game2048ContractStats;
    refreshStats: () => Promise<void>;
}

export function useGame2048Contract(): UseGame2048ContractResult {
    const { provider, network, isConnected: isRpcConnected, error: rpcError } = useOPNet();
    const { addressObject } = useWallet();

    const [contract, setContract] = useState<IGame2048Contract | null>(null);
    const [error, setError] = useState<Error | null>(null);
    const [statsLoading, setStatsLoading] = useState(false);
    const [stats, setStats] = useState<Game2048ContractStats>({
        myBestScore: null,
        myGamesPlayed: null,
        globalBestScore: null,
        motoPoolBalance: null,
        pillPoolBalance: null,
    });

    const contractAddress = useMemo(
        () => (GAME_2048_CONTRACT_ADDRESS?.trim() || null) as string | null,
        [],
    );

    useEffect(() => {
        if (!provider || !isRpcConnected || !contractAddress) {
            setContract(null);
            return;
        }

        try {
            const sender = addressObject ?? undefined;
            const instance = getContract<IGame2048Contract>(
                contractAddress,
                GAME_2048_ABI,
                provider,
                network,
                sender,
            );
            if (addressObject) {
                instance.setSender(addressObject);
            }
            setContract(instance);
            setError(null);
        } catch (err) {
            const contractError = err instanceof Error ? err : new Error(String(err));
            setContract(null);
            setError(contractError);
        }
    }, [addressObject, contractAddress, isRpcConnected, network, provider]);

    const refreshStats = useCallback(async () => {
        if (!contract) {
            setStats({
                myBestScore: null,
                myGamesPlayed: null,
                globalBestScore: null,
                motoPoolBalance: null,
                pillPoolBalance: null,
            });
            setStatsLoading(false);
            return;
        }

        setStatsLoading(true);
        try {
            const [best, played, global, motoPool, pillPool] = await Promise.all([
                contract.getMyBestScore(),
                contract.getMyGamesPlayed(),
                contract.getGlobalBestScore(),
                contract.getMotoPoolBalance(),
                contract.getPillPoolBalance(),
            ]);
            setStats({
                myBestScore: best.properties.score,
                myGamesPlayed: played.properties.gamesPlayed,
                globalBestScore: global.properties.score,
                motoPoolBalance: motoPool.properties.poolBalance,
                pillPoolBalance: pillPool.properties.poolBalance,
            });
        } catch (err) {
            const statsError = err instanceof Error ? err : new Error(String(err));
            setError(statsError);
        } finally {
            setStatsLoading(false);
        }
    }, [contract]);

    useEffect(() => {
        void refreshStats();
    }, [refreshStats]);

    return {
        contract,
        contractAddress,
        loading: statsLoading || (!rpcError && (!provider || !isRpcConnected)),
        error: error ?? rpcError ?? null,
        stats,
        refreshStats,
    };
}

