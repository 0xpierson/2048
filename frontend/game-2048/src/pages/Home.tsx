import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getContract } from 'opnet';
import { Address } from '@btc-vision/transaction';
import { GameBoard } from '../components/GameBoard';
import { BetPanel } from '../components/BetPanel';
import { ScoreBoard } from '../components/ScoreBoard';
import { useWallet } from '../hooks/useWallet';
import { useGame2048Contract } from '../hooks/useGame2048Contract';
import { useGameTokens, type GameTokenKind } from '../hooks/useGameTokens';
import { useOPNet } from '../providers/OPNetProvider';
import { OP20_ABI, type IOP20 } from '../abi/op20Abi';

const MAX_ALLOWANCE = 2n ** 256n - 1n;
const BET_SESSION_STORAGE_KEY_PREFIX = 'game2048-bet-session-v1';
const APPROVE_SESSION_STORAGE_KEY_PREFIX = 'game2048-approve-session-v1';

type TxLifecycleStatus = 'pending' | 'reverted' | 'finished';

interface TrackedTx {
    txId: string | null;
    status: TxLifecycleStatus;
}

interface BetRoundState {
    token: GameTokenKind;
    stake: string;
    createdAt: number;
    finalScore: number | null;
    betTx: TrackedTx;
    scoreTx: TrackedTx | null;
}

interface ApproveSessionState {
    token: GameTokenKind;
    amount: string;
    tokenAddress: string;
    createdAt: number;
    tx: TrackedTx;
}

function getBetSessionStorageKey(address: string, contractAddress: string): string {
    return `${BET_SESSION_STORAGE_KEY_PREFIX}:${address}:${contractAddress}`;
}

function getApproveSessionStorageKey(address: string, contractAddress: string): string {
    return `${APPROVE_SESSION_STORAGE_KEY_PREFIX}:${address}:${contractAddress}`;
}

export function Home() {
    const { address, addressObject, isConnected } = useWallet();
    const { provider, network } = useOPNet();
    const { contract, contractAddress, stats, refreshStats, loading: statsLoading } =
        useGame2048Contract();
    const { tokens, loading: tokensLoading, error: tokensError, refresh: refreshTokens } =
        useGameTokens();

    const [selectedToken, setSelectedToken] = useState<GameTokenKind>('PILL');
    const [stakeInput, setStakeInput] = useState<string>('1');
    const [betError, setBetError] = useState<string | null>(null);
    const [betStatus, setBetStatus] = useState<string | null>(null);
    const [betRound, setBetRound] = useState<BetRoundState | null>(null);
    const [cancelTx, setCancelTx] = useState<TrackedTx | null>(null);
    const [isCancellingBet, setIsCancellingBet] = useState(false);
    const [isStartingBet, setIsStartingBet] = useState(false);
    const [activeBet, setActiveBet] = useState<{ token: GameTokenKind; stake: bigint } | null>(
        null,
    );
    const [gameRunId, setGameRunId] = useState(0);
    const [isOwner, setIsOwner] = useState<boolean | null>(null);
    const [ownerActionError, setOwnerActionError] = useState<string | null>(null);
    const [motoDepositInput, setMotoDepositInput] = useState<string>('');
    const [pillDepositInput, setPillDepositInput] = useState<string>('');
    const [isDepositingMoto, setIsDepositingMoto] = useState(false);
    const [isDepositingPill, setIsDepositingPill] = useState(false);
    const [allowance, setAllowance] = useState<Record<GameTokenKind, bigint | null>>({
        PILL: null,
        MOTO: null,
    });
    const [isApproving, setIsApproving] = useState(false);
    const [approveSession, setApproveSession] = useState<ApproveSessionState | null>(null);
    const approvePollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (!address || !contractAddress) {
            setApproveSession(null);
            return;
        }
        if (typeof window === 'undefined') {
            return;
        }

        const storageKey = getApproveSessionStorageKey(address, contractAddress);
        const raw = window.localStorage.getItem(storageKey);
        if (!raw) {
            setApproveSession(null);
            return;
        }
        try {
            const parsed = JSON.parse(raw) as Partial<ApproveSessionState>;
            if (
                parsed &&
                (parsed.token === 'PILL' || parsed.token === 'MOTO') &&
                typeof parsed.amount === 'string' &&
                typeof parsed.tokenAddress === 'string' &&
                typeof parsed.createdAt === 'number' &&
                parsed.tx &&
                (parsed.tx.status === 'pending' ||
                    parsed.tx.status === 'reverted' ||
                    parsed.tx.status === 'finished')
            ) {
                setApproveSession({
                    token: parsed.token,
                    amount: parsed.amount,
                    tokenAddress: parsed.tokenAddress,
                    createdAt: parsed.createdAt,
                    tx: {
                        txId: typeof parsed.tx.txId === 'string' ? parsed.tx.txId : null,
                        status: parsed.tx.status,
                    },
                });
            } else {
                setApproveSession(null);
            }
        } catch {
            setApproveSession(null);
        }
    }, [address, contractAddress]);

    useEffect(() => {
        if (!address || !contractAddress || typeof window === 'undefined') {
            return;
        }
        const storageKey = getApproveSessionStorageKey(address, contractAddress);
        if (approveSession) {
            window.localStorage.setItem(storageKey, JSON.stringify(approveSession));
        } else {
            window.localStorage.removeItem(storageKey);
        }
    }, [address, approveSession, contractAddress]);

    useEffect(() => {
        const hydrateRoundState = async () => {
            if (!address || !contractAddress) {
                setActiveBet(null);
                setBetStatus(null);
                setBetRound(null);
                setCancelTx(null);
                return;
            }

            const storageKey = getBetSessionStorageKey(address, contractAddress);
            let localRound: BetRoundState | null = null;

            if (typeof window !== 'undefined') {
                const raw = window.localStorage.getItem(storageKey);
                if (raw) {
                    try {
                        const parsed = JSON.parse(raw) as Partial<BetRoundState>;
                        if (
                            parsed &&
                            (parsed.token === 'PILL' || parsed.token === 'MOTO') &&
                            typeof parsed.stake === 'string' &&
                            typeof parsed.createdAt === 'number' &&
                            parsed.betTx &&
                            (parsed.betTx.status === 'pending' ||
                                parsed.betTx.status === 'reverted' ||
                                parsed.betTx.status === 'finished')
                        ) {
                            localRound = {
                                token: parsed.token,
                                stake: parsed.stake,
                                createdAt: parsed.createdAt,
                                finalScore:
                                    typeof parsed.finalScore === 'number' ? parsed.finalScore : null,
                                betTx: {
                                    txId:
                                        typeof parsed.betTx.txId === 'string'
                                            ? parsed.betTx.txId
                                            : null,
                                    status: parsed.betTx.status,
                                },
                                scoreTx:
                                    parsed.scoreTx &&
                                    (parsed.scoreTx.status === 'pending' ||
                                        parsed.scoreTx.status === 'reverted' ||
                                        parsed.scoreTx.status === 'finished')
                                        ? {
                                              txId:
                                                  typeof parsed.scoreTx.txId === 'string'
                                                      ? parsed.scoreTx.txId
                                                      : null,
                                              status: parsed.scoreTx.status,
                                          }
                                        : null,
                            };
                            setBetRound(localRound);
                            setActiveBet({
                                token: parsed.token,
                                stake: BigInt(parsed.stake),
                            });
                            if (localRound.betTx.status === 'pending') {
                                setBetStatus(
                                    'Bet tx is pending on Bitcoin. Please wait for confirmation.',
                                );
                            } else if (localRound.scoreTx?.status === 'pending') {
                                setBetStatus(
                                    'Score tx submitted. Waiting for confirmation. You can start the next round after this tx is confirmed.',
                                );
                            } else if (localRound.scoreTx?.status === 'reverted') {
                                setBetStatus(
                                    'Score tx reverted. Please submit your score on-chain again.',
                                );
                            } else if (
                                localRound.finalScore !== null &&
                                (!localRound.scoreTx || localRound.scoreTx.status !== 'finished')
                            ) {
                                setBetStatus(
                                    'Bet confirmed. Submit your saved score on-chain to finish this round.',
                                );
                            }
                        }
                    } catch {
                        // ignore malformed storage
                    }
                }
            }

            if (!contract || !isConnected) {
                return;
            }

            try {
                // Fallback: if no local state but chain has an active bet, reflect it in UI.
                const result = await contract.getMyActiveBet();
                const { tokenType, stakeAmount } = result.properties;
                const hasOnChainActive = stakeAmount > 0n;

                if (hasOnChainActive && !localRound) {
                    const token =
                        tokenType === 1n ? 'MOTO' : tokenType === 2n ? 'PILL' : null;
                    if (token) {
                        setActiveBet({ token, stake: stakeAmount });
                        setBetStatus(
                            'Active bet found on-chain from a previous session. Cancel this bet first, then start a new game.',
                        );
                    }
                } else if (!hasOnChainActive && !localRound) {
                    setActiveBet(null);
                    setBetRound(null);
                    setBetStatus(null);
                    setCancelTx(null);
                }
            } catch {
                // ignore sync errors
            }
        };

        void hydrateRoundState();
    }, [address, contract, contractAddress, isConnected]);

    useEffect(() => {
        const checkOwner = async () => {
            if (!contract || !isConnected || !address) {
                setIsOwner(null);
                return;
            }
            try {
                const result = await contract.isOwner();
                setIsOwner(result.properties.isOwner);
            } catch {
                setIsOwner(null);
            }
        };

        void checkOwner();
    }, [address, contract, isConnected]);

    const stakeBaseUnits = useMemo(() => {
        const tokenInfo = tokens[selectedToken];
        const asNumber = Number(stakeInput);
        if (!tokenInfo.address) {
            return null;
        }
        if (!Number.isFinite(asNumber) || asNumber <= 0) {
            return null;
        }
        const units = BigInt(Math.round(asNumber * 10 ** tokenInfo.decimals));
        if (units <= 0n) {
            return null;
        }
        return units;
    }, [stakeInput, selectedToken, tokens]);

    const motoDepositBaseUnits = useMemo(() => {
        const tokenInfo = tokens.MOTO;
        const asNumber = Number(motoDepositInput);
        if (!tokenInfo.address) {
            return null;
        }
        if (!Number.isFinite(asNumber) || asNumber <= 0) {
            return null;
        }
        const units = BigInt(Math.round(asNumber * 10 ** tokenInfo.decimals));
        if (units <= 0n) {
            return null;
        }
        return units;
    }, [motoDepositInput, tokens]);

    const pillDepositBaseUnits = useMemo(() => {
        const tokenInfo = tokens.PILL;
        const asNumber = Number(pillDepositInput);
        if (!tokenInfo.address) {
            return null;
        }
        if (!Number.isFinite(asNumber) || asNumber <= 0) {
            return null;
        }
        const units = BigInt(Math.round(asNumber * 10 ** tokenInfo.decimals));
        if (units <= 0n) {
            return null;
        }
        return units;
    }, [pillDepositInput, tokens]);

    const needsStakeApproval = useMemo(() => {
        if (!stakeBaseUnits || stakeBaseUnits <= 0n) {
            return false;
        }
        const current =
            selectedToken === 'PILL' ? allowance.PILL : allowance.MOTO;
        return current !== null && current < stakeBaseUnits;
    }, [allowance.MOTO, allowance.PILL, selectedToken, stakeBaseUnits]);

    const needsMotoDepositApproval = useMemo(() => {
        if (!motoDepositBaseUnits || motoDepositBaseUnits <= 0n) {
            return false;
        }
        const current = allowance.MOTO;
        return current !== null && current < motoDepositBaseUnits;
    }, [allowance.MOTO, motoDepositBaseUnits]);

    const needsPillDepositApproval = useMemo(() => {
        if (!pillDepositBaseUnits || pillDepositBaseUnits <= 0n) {
            return false;
        }
        const current = allowance.PILL;
        return current !== null && current < pillDepositBaseUnits;
    }, [allowance.PILL, pillDepositBaseUnits]);

    const isWaitingApproveConfirmForSelectedToken =
        approveSession !== null &&
        approveSession.tx.status === 'pending' &&
        approveSession.token === selectedToken;

    const isWaitingApproveConfirmForMoto =
        approveSession !== null &&
        approveSession.tx.status === 'pending' &&
        approveSession.token === 'MOTO';

    const isWaitingApproveConfirmForPill =
        approveSession !== null &&
        approveSession.tx.status === 'pending' &&
        approveSession.token === 'PILL';

    const refreshAllowance = useCallback(async () => {
        if (!provider || !addressObject || !contractAddress) {
            return;
        }
        const pillAddr = tokens.PILL.address;
        const motoAddr = tokens.MOTO.address;
        if (!pillAddr || !motoAddr) {
            return;
        }
        try {
            const spender = Address.fromString(contractAddress);
            const pillContract = getContract<IOP20>(
                pillAddr,
                OP20_ABI,
                provider,
                network,
                addressObject,
            );
            const motoContract = getContract<IOP20>(
                motoAddr,
                OP20_ABI,
                provider,
                network,
                addressObject,
            );
            const [pillAll, motoAll] = await Promise.all([
                pillContract.allowance(addressObject, spender),
                motoContract.allowance(addressObject, spender),
            ]);
            setAllowance({
                PILL: pillAll.properties.remaining,
                MOTO: motoAll.properties.remaining,
            });
        } catch {
            setAllowance({
                PILL: null,
                MOTO: null,
            });
        }
    }, [addressObject, contractAddress, network, provider, tokens]);

    useEffect(() => {
        if (!addressObject || !provider || !contractAddress) {
            return;
        }
        void refreshAllowance();
    }, [addressObject, contractAddress, provider, refreshAllowance]);

    const persistRound = useCallback(
        (nextRound: BetRoundState | null) => {
            setBetRound(nextRound);
            if (!address || !contractAddress || typeof window === 'undefined') {
                return;
            }
            const storageKey = getBetSessionStorageKey(address, contractAddress);
            if (nextRound) {
                window.localStorage.setItem(storageKey, JSON.stringify(nextRound));
            } else {
                window.localStorage.removeItem(storageKey);
            }
        },
        [address, contractAddress],
    );

    const handleStartBet = async () => {
        if (!contract) {
            setBetError('Contract not ready yet. Check RPC and contract address configuration.');
            return;
        }
        if (!isConnected || !address) {
            setBetError('Please connect your wallet before starting a bet.');
            return;
        }
        if (betRound) {
            setBetError('You already have a round in progress. Wait for tx confirmation or submit score.');
            return;
        }

        const tokenInfo = tokens[selectedToken];
        if (!tokenInfo.address) {
            setBetError('Token address is not configured on the contract.');
            return;
        }
        if (!stakeBaseUnits || stakeBaseUnits <= 0n) {
            setBetError('Stake is too small.');
            return;
        }
        if (tokenInfo.balance !== null && stakeBaseUnits > tokenInfo.balance) {
            setBetError('Stake exceeds your token balance.');
            return;
        }

        setIsStartingBet(true);
        setBetError(null);
        setBetStatus(null);
        try {
            const tokenType = selectedToken === 'MOTO' ? 1n : 2n;
            const simulation = await contract.startBetGame(tokenType, stakeBaseUnits);
            if (simulation.revert) {
                throw new Error(simulation.revert);
            }
            const receipt = await simulation.sendTransaction({
                network,
                refundTo: address,
                signer: null,
                mldsaSigner: null,
                maximumAllowedSatToSpend: 100000n,
            });
            const txId =
                receipt && typeof receipt === 'object' && 'transactionId' in receipt
                    ? ((receipt as { transactionId?: string }).transactionId ?? null)
                    : null;
            setActiveBet({ token: selectedToken, stake: stakeBaseUnits });
            persistRound({
                token: selectedToken,
                stake: stakeBaseUnits.toString(),
                createdAt: Date.now(),
                finalScore: null,
                betTx: {
                    txId,
                    status: txId ? 'pending' : 'finished',
                },
                scoreTx: null,
            });
            setBetStatus(
                txId
                    ? 'Bet tx submitted. Waiting for blockchain confirmation.'
                    : 'Bet tx sent. Waiting for chain sync.',
            );
            setGameRunId((prev) => prev + 1);
            setStakeInput('1');
            await Promise.all([refreshTokens(), refreshStats()]);
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            if (message.includes('Active bet game already in progress')) {
                setBetError(
                    'You already have an active bet on-chain. Finish that game or cancel your bet.',
                );
                if (contract) {
                    try {
                        const result = await contract.getMyActiveBet();
                        const { tokenType, stakeAmount } = result.properties;
                        if (stakeAmount > 0n) {
                            const token =
                                tokenType === 1n ? 'MOTO' : tokenType === 2n ? 'PILL' : null;
                            if (token) {
                                setActiveBet({ token, stake: stakeAmount });
                                persistRound({
                                    token,
                                    stake: stakeAmount.toString(),
                                    createdAt: Date.now(),
                                    finalScore: null,
                                    betTx: {
                                        txId: null,
                                        status: 'finished',
                                    },
                                    scoreTx: null,
                                });
                                setBetStatus(
                                    'Active bet already exists on-chain. Finish your game then submit score.',
                                );
                            }
                        }
                    } catch {
                        // ignore resync errors
                    }
                }
            } else {
                setBetError(message);
            }
        } finally {
            setIsStartingBet(false);
        }
    };

    const submitScore = async (round: BetRoundState, autoTriggered: boolean) => {
        if (!contract || !address || !isConnected) {
            setBetError('Connect wallet before submitting score.');
            return;
        }
        if (round.finalScore === null) {
            setBetError('No saved score to submit.');
            return;
        }
        if (round.betTx.status !== 'finished') {
            setBetError('Bet tx is not confirmed yet. Please wait.');
            return;
        }
        if (round.scoreTx?.status === 'pending') {
            return;
        }

        setBetError(null);
        try {
            const simulation = await contract.submitBetScore(BigInt(round.finalScore));
            if (simulation.revert) {
                const revertMessage =
                    typeof simulation.revert === 'string'
                        ? simulation.revert
                        : JSON.stringify(simulation.revert);
                throw new Error(revertMessage);
            }
            const receipt = await simulation.sendTransaction({
                network,
                refundTo: address,
                signer: null,
                mldsaSigner: null,
                maximumAllowedSatToSpend: 100000n,
            });
            const txId =
                receipt && typeof receipt === 'object' && 'transactionId' in receipt
                    ? ((receipt as { transactionId?: string }).transactionId ?? null)
                    : null;
            const updatedRound: BetRoundState = {
                ...round,
                scoreTx: {
                    txId,
                    status: txId ? 'pending' : 'finished',
                },
            };
            persistRound(updatedRound);
            if (!txId) {
                persistRound(null);
                setActiveBet(null);
                setBetStatus(null);
                await Promise.all([refreshTokens(), refreshStats()]);
                return;
            }
            setBetStatus(
                'Score tx submitted. Waiting for confirmation. You can start the next round after this tx is confirmed.',
            );
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            setBetError(`Failed to submit score on-chain: ${message}`);
            if (autoTriggered) {
                setBetStatus(
                    'Game finished but auto-submit failed. Please click "Submit score on-chain" to try again.',
                );
            }
            persistRound({
                ...round,
                scoreTx: {
                    txId: null,
                    status: 'reverted',
                },
            });
        }
    };

    const handleGameOver = async (finalScore: number) => {
        if (finalScore <= 0 || !activeBet) {
            return;
        }

        if (!betRound) {
            setBetError('No tracked round found. Please wait for sync before submitting score.');
            return;
        }

        const nextRound: BetRoundState = {
            ...betRound,
            finalScore,
        };
        persistRound(nextRound);

        if (betRound.betTx.status === 'pending') {
            setBetStatus(
                'Game finished. Bet tx is still pending on Bitcoin. Wait for confirmation before submitting score.',
            );
            return;
        }

        setBetStatus('Game finished. Bet confirmed. Opening wallet to submit score...');
        await submitScore(nextRound, true);
    };

    const handleCancelActiveBet = async () => {
        if (!contract || !address || !isConnected) {
            setBetError('Connect wallet before cancelling bet.');
            return;
        }
        if (!activeBet || betRound !== null) {
            return;
        }
        if (cancelTx?.status === 'pending') {
            return;
        }

        setIsCancellingBet(true);
        setBetError(null);
        try {
            const simulation = await contract.cancelBetGame();
            if (simulation.revert) {
                const revertMessage =
                    typeof simulation.revert === 'string'
                        ? simulation.revert
                        : JSON.stringify(simulation.revert);
                throw new Error(revertMessage);
            }
            const receipt = await simulation.sendTransaction({
                network,
                refundTo: address,
                signer: null,
                mldsaSigner: null,
                maximumAllowedSatToSpend: 100000n,
            });
            const txId =
                receipt && typeof receipt === 'object' && 'transactionId' in receipt
                    ? ((receipt as { transactionId?: string }).transactionId ?? null)
                    : null;
            if (!txId) {
                setCancelTx(null);
                setActiveBet(null);
                setBetStatus(null);
                await Promise.all([refreshTokens(), refreshStats()]);
                return;
            }
            setCancelTx({
                txId,
                status: 'pending',
            });
            setBetStatus(
                'Cancel tx submitted. Waiting for confirmation. You can start a new round after this tx is confirmed.',
            );
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            setCancelTx({
                txId: null,
                status: 'reverted',
            });
            setBetError(`Failed to cancel active bet: ${message}`);
        } finally {
            setIsCancellingBet(false);
        }
    };

    const handleSubmitScore = async () => {
        if (!betRound) {
            setBetError('No saved score to submit.');
            return;
        }
        await submitScore(betRound, false);
    };

    const handleOwnerDeposit = async (kind: GameTokenKind) => {
        if (!contract) {
            setOwnerActionError('Contract not ready yet. Check RPC and contract address configuration.');
            return;
        }
        if (!isConnected || !address) {
            setOwnerActionError('Please connect your wallet as the contract owner.');
            return;
        }
        if (!isOwner) {
            setOwnerActionError('Only the contract owner can deposit tokens into the pool.');
            return;
        }

        const tokenInfo = tokens[kind];
        if (!tokenInfo.address) {
            setOwnerActionError('Token address is not configured on the contract.');
            return;
        }

        const baseUnits = kind === 'MOTO' ? motoDepositBaseUnits : pillDepositBaseUnits;
        if (!baseUnits || baseUnits <= 0n) {
            setOwnerActionError('Deposit amount is too small.');
            return;
        }

        if (kind === 'MOTO') {
            setIsDepositingMoto(true);
        } else {
            setIsDepositingPill(true);
        }
        setOwnerActionError(null);

        try {
            const simulation =
                kind === 'MOTO'
                    ? await contract.depositMoto(baseUnits)
                    : await contract.depositPill(baseUnits);

            if (simulation.revert) {
                throw new Error(simulation.revert);
            }

            await simulation.sendTransaction({
                network,
                refundTo: address,
                signer: null,
                mldsaSigner: null,
                maximumAllowedSatToSpend: 100000n,
            });

            if (kind === 'MOTO') {
                setMotoDepositInput('');
            } else {
                setPillDepositInput('');
            }

            await Promise.all([refreshTokens(), refreshStats()]);
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            setOwnerActionError(message);
        } finally {
            if (kind === 'MOTO') {
                setIsDepositingMoto(false);
            } else {
                setIsDepositingPill(false);
            }
        }
    };
    const handleApprove = async (kind: GameTokenKind) => {
        if (!provider || !addressObject || !contractAddress) {
            return;
        }
        const tokenAddr = kind === 'PILL' ? tokens.PILL.address : tokens.MOTO.address;
        if (!tokenAddr) {
            return;
        }
        const currentRemaining =
            kind === 'PILL' ? allowance.PILL ?? 0n : allowance.MOTO ?? 0n;
        const targetAllowance = MAX_ALLOWANCE;
        const amountToApprove =
            targetAllowance > currentRemaining ? targetAllowance - currentRemaining : 0n;
        if (amountToApprove <= 0n) {
            return;
        }
        setIsApproving(true);
        setOwnerActionError(null);
        try {
            const tokenContract = getContract<IOP20>(
                tokenAddr,
                OP20_ABI,
                provider,
                network,
                addressObject,
            );
            const sim = await tokenContract.increaseAllowance(
                Address.fromString(contractAddress),
                amountToApprove,
            );
            if (sim.revert) {
                throw new Error(sim.revert);
            }
            const receipt = await sim.sendTransaction({
                network,
                refundTo: address ?? '',
                signer: null,
                mldsaSigner: null,
                maximumAllowedSatToSpend: 100000n,
            });
            const txId =
                receipt && typeof receipt === 'object' && 'transactionId' in receipt
                    ? ((receipt as { transactionId?: string }).transactionId ?? null)
                    : null;
            setApproveSession({
                token: kind,
                amount: amountToApprove.toString(),
                tokenAddress: tokenAddr.toString(),
                createdAt: Date.now(),
                tx: {
                    txId,
                    status: txId ? 'pending' : 'finished',
                },
            });
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            setApproveSession({
                token: kind,
                amount: amountToApprove.toString(),
                tokenAddress: tokenAddr.toString(),
                createdAt: Date.now(),
                tx: {
                    txId: null,
                    status: 'reverted',
                },
            });
            setOwnerActionError(message);
        } finally {
            setIsApproving(false);
        }
    };

    useEffect(() => {
        if (!provider || !betRound || !betRound.betTx.txId || betRound.betTx.status !== 'pending') {
            return;
        }
        let cancelled = false;
        const poll = async () => {
            try {
                const receipt = await provider.getTransactionReceipt(betRound.betTx.txId as string);
                if (!receipt || cancelled) {
                    return;
                }
                const updatedRound: BetRoundState = {
                    ...betRound,
                    betTx: {
                        ...betRound.betTx,
                        status: 'finished',
                    },
                };
                persistRound(updatedRound);
                if (updatedRound.finalScore !== null && updatedRound.scoreTx === null) {
                    setBetStatus('Bet confirmed. You can now submit your score on-chain.');
                } else {
                    setBetStatus(null);
                }
            } catch {
                // keep polling while pending
            }
        };
        void poll();
        const intervalId = window.setInterval(() => {
            void poll();
        }, 15000);
        return () => {
            cancelled = true;
            window.clearInterval(intervalId);
        };
    }, [betRound, persistRound, provider]);

    useEffect(() => {
        if (!provider || !betRound?.scoreTx?.txId || betRound.scoreTx.status !== 'pending') {
            return;
        }
        let cancelled = false;
        const poll = async () => {
            try {
                const receipt = await provider.getTransactionReceipt(betRound.scoreTx?.txId as string);
                if (!receipt || cancelled) {
                    return;
                }
                persistRound(null);
                setActiveBet(null);
                setBetStatus(null);
                await Promise.all([refreshTokens(), refreshStats()]);
            } catch {
                // keep polling while pending
            }
        };
        void poll();
        const intervalId = window.setInterval(() => {
            void poll();
        }, 15000);
        return () => {
            cancelled = true;
            window.clearInterval(intervalId);
        };
    }, [betRound, persistRound, provider, refreshStats, refreshTokens]);

    useEffect(() => {
        if (!provider || !cancelTx?.txId || cancelTx.status !== 'pending') {
            return;
        }
        let cancelled = false;
        const poll = async () => {
            try {
                const receipt = await provider.getTransactionReceipt(cancelTx.txId as string);
                if (!receipt || cancelled) {
                    return;
                }
                setCancelTx(null);
                setActiveBet(null);
                setBetStatus(null);
                await Promise.all([refreshTokens(), refreshStats()]);
            } catch {
                // keep polling while pending
            }
        };
        void poll();
        const intervalId = window.setInterval(() => {
            void poll();
        }, 15000);
        return () => {
            cancelled = true;
            window.clearInterval(intervalId);
        };
    }, [cancelTx, provider, refreshStats, refreshTokens]);

    useEffect(() => {
        const pending = approveSession;
        if (
            !pending ||
            pending.tx.status !== 'pending' ||
            !provider ||
            !addressObject ||
            !contractAddress
        ) {
            return;
        }

        const spender = Address.fromString(contractAddress);
        const tokenContract = getContract<IOP20>(
            Address.fromString(pending.tokenAddress),
            OP20_ABI,
            provider,
            network,
            addressObject,
        );
        const POLL_INTERVAL_MS = 5000;
        const MAX_POLL_MS = 5 * 60 * 1000;
        const startedAt = Date.now();

        const poll = async () => {
            if (Date.now() - startedAt > MAX_POLL_MS) {
                if (approvePollRef.current) {
                    clearInterval(approvePollRef.current);
                    approvePollRef.current = null;
                }
                setApproveSession((prev) => {
                    if (!prev || prev.tx.status !== 'pending') {
                        return prev;
                    }
                    return {
                        ...prev,
                        tx: {
                            ...prev.tx,
                            status: 'reverted',
                        },
                    };
                });
                return;
            }
            try {
                const res = await tokenContract.allowance(addressObject, spender);
                const remaining = res.properties.remaining;
                const targetAmount = BigInt(pending.amount);
                if (remaining >= targetAmount) {
                    if (approvePollRef.current) {
                        clearInterval(approvePollRef.current);
                        approvePollRef.current = null;
                    }
                    setApproveSession((prev) => {
                        if (!prev) {
                            return prev;
                        }
                        return {
                            ...prev,
                            tx: {
                                ...prev.tx,
                                status: 'finished',
                            },
                        };
                    });
                    setAllowance((prev) => ({
                        ...prev,
                        [pending.token]: remaining,
                    }));
                }
            } catch {
                // ignore single poll errors
            }
        };

        void poll();
        approvePollRef.current = setInterval(poll, POLL_INTERVAL_MS);
        return () => {
            if (approvePollRef.current) {
                clearInterval(approvePollRef.current);
                approvePollRef.current = null;
            }
        };
    }, [approveSession, provider, addressObject, contractAddress, network]);

    const hasOrphanActiveBet = activeBet !== null && betRound === null;

    const canPlayGame =
        activeBet !== null &&
        !hasOrphanActiveBet &&
        (betRound?.finalScore ?? null) === null &&
        (betRound?.scoreTx?.status ?? null) !== 'pending' &&
        (cancelTx?.status ?? null) !== 'pending';

    const canSubmitScore =
        betRound !== null &&
        betRound.finalScore !== null &&
        betRound.betTx.status === 'finished' &&
        (betRound.scoreTx === null || betRound.scoreTx.status === 'reverted');

    const isSubmittingScore = betRound?.scoreTx?.status === 'pending';

    return (
        <main className="app-content">
            <div className="home-grid">
                <section className="game-section">
                    <GameBoard
                        key={gameRunId}
                        size={4}
                        canPlay={canPlayGame}
                        onGameOver={handleGameOver}
                    />
                </section>
                <section className="intro-section">
                    <h1>2048 Betting Game</h1>
                    <p>
                        Pick PILL or MOTO, place your bet, play 2048, and your final score will be settled
                        on-chain by the Game2048Contract.
                    </p>
                    <p>
                        The 4x4 board on the left runs fully on the client; only your final score and bet
                        state are written to OPNet.
                    </p>
                    <BetPanel
                        selectedToken={selectedToken}
                        onSelectToken={setSelectedToken}
                        stakeInput={stakeInput}
                        onStakeInputChange={setStakeInput}
                        tokens={tokens}
                        isStarting={isStartingBet || tokensLoading}
                        onStartBet={handleStartBet}
                        error={betError ?? (tokensError ? tokensError.message : null)}
                        statusMessage={betStatus}
                        hasActiveBet={activeBet !== null}
                        needsApproval={needsStakeApproval}
                        isApproving={isApproving}
                        isWaitingApproval={isWaitingApproveConfirmForSelectedToken}
                        onApprove={() => handleApprove(selectedToken)}
                        approveTxId={
                            approveSession?.token === selectedToken ? approveSession.tx.txId : null
                        }
                        approveTxStatus={
                            approveSession?.token === selectedToken
                                ? approveSession.tx.status
                                : null
                        }
                        betTxId={betRound?.betTx.txId ?? null}
                        betTxStatus={betRound?.betTx.status ?? null}
                        scoreTxId={betRound?.scoreTx?.txId ?? null}
                        scoreTxStatus={betRound?.scoreTx?.status ?? null}
                        cancelTxId={cancelTx?.txId ?? null}
                        cancelTxStatus={cancelTx?.status ?? null}
                        savedScore={betRound?.finalScore ?? null}
                        canSubmitScore={canSubmitScore}
                        isSubmittingScore={isSubmittingScore}
                        onSubmitScore={canSubmitScore ? handleSubmitScore : undefined}
                        canCancelActiveBet={hasOrphanActiveBet}
                        isCancellingBet={isCancellingBet || cancelTx?.status === 'pending'}
                        onCancelActiveBet={hasOrphanActiveBet ? handleCancelActiveBet : undefined}
                    />
                    {isOwner && (
                        <section className="owner-panel">
                            <h2>Owner pool management</h2>
                            <p className="helper">
                                Deposit additional MOTO or PILL into the contract reward pool. Make
                                sure you have granted allowance from the token contract to this
                                Game2048Contract.
                            </p>
                            <div className="owner-deposit-grid">
                                <div className="owner-deposit-card">
                                    <h3>Deposit MOTO</h3>
                                    <input
                                        type="number"
                                        min="0"
                                        step="1"
                                        placeholder="0"
                                        value={motoDepositInput}
                                        onChange={(event) => setMotoDepositInput(event.target.value)}
                                    />
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => handleOwnerDeposit('MOTO')}
                                        disabled={
                                            isDepositingMoto ||
                                            needsMotoDepositApproval ||
                                            isWaitingApproveConfirmForMoto
                                        }
                                    >
                                        {isDepositingMoto ? 'Depositing...' : 'Deposit MOTO'}
                                    </button>
                                    {needsMotoDepositApproval &&
                                        (isWaitingApproveConfirmForMoto ? (
                                            <p className="helper approve-waiting">
                                                Approval submitted. Waiting for confirmation (usually
                                                1–2 min). Deposit will enable automatically.
                                            </p>
                                        ) : (
                                            <button
                                                type="button"
                                                className="btn btn-approve"
                                                onClick={() => handleApprove('MOTO')}
                                                disabled={isApproving}
                                            >
                                                {isApproving
                                                    ? 'Approving...'
                                                    : 'Approve MOTO for deposit'}
                                            </button>
                                        ))}
                                </div>
                                <div className="owner-deposit-card">
                                    <h3>Deposit PILL</h3>
                                    <input
                                        type="number"
                                        min="0"
                                        step="1"
                                        placeholder="0"
                                        value={pillDepositInput}
                                        onChange={(event) => setPillDepositInput(event.target.value)}
                                    />
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => handleOwnerDeposit('PILL')}
                                        disabled={
                                            isDepositingPill ||
                                            needsPillDepositApproval ||
                                            isWaitingApproveConfirmForPill
                                        }
                                    >
                                        {isDepositingPill ? 'Depositing...' : 'Deposit PILL'}
                                    </button>
                                    {needsPillDepositApproval &&
                                        (isWaitingApproveConfirmForPill ? (
                                            <p className="helper approve-waiting">
                                                Approval submitted. Waiting for confirmation (usually
                                                1–2 min). Deposit will enable automatically.
                                            </p>
                                        ) : (
                                            <button
                                                type="button"
                                                className="btn btn-approve"
                                                onClick={() => handleApprove('PILL')}
                                                disabled={isApproving}
                                            >
                                                {isApproving
                                                    ? 'Approving...'
                                                    : 'Approve PILL for deposit'}
                                            </button>
                                        ))}
                                </div>
                            </div>
                            {ownerActionError && <p className="error">{ownerActionError}</p>}
                        </section>
                    )}
                    <ScoreBoard
                        stats={stats}
                        loading={statsLoading}
                        onRefresh={refreshStats}
                        motoPoolDecimals={tokens.MOTO.decimals}
                        pillPoolDecimals={tokens.PILL.decimals}
                    />
                </section>
            </div>
        </main>
    );
}



