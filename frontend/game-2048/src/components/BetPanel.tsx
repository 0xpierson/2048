import type { ChangeEvent } from 'react';
import type { GameTokenKind, GameTokenInfo } from '../hooks/useGameTokens';

interface BetPanelProps {
    selectedToken: GameTokenKind;
    onSelectToken: (token: GameTokenKind) => void;
    stakeInput: string;
    onStakeInputChange: (value: string) => void;
    tokens: Record<GameTokenKind, GameTokenInfo>;
    isStarting: boolean;
    onStartBet: () => void;
    error: string | null;
    statusMessage?: string | null;
    hasActiveBet: boolean;
    needsApproval: boolean;
    isApproving: boolean;
    isWaitingApproval: boolean;
    onApprove: () => void;
    betTxId?: string | null;
    betTxStatus?: 'pending' | 'reverted' | 'finished' | null;
    scoreTxId?: string | null;
    scoreTxStatus?: 'pending' | 'reverted' | 'finished' | null;
    cancelTxId?: string | null;
    cancelTxStatus?: 'pending' | 'reverted' | 'finished' | null;
    savedScore?: number | null;
    canSubmitScore?: boolean;
    isSubmittingScore?: boolean;
    onSubmitScore?: (() => void | Promise<void>) | undefined;
    canCancelActiveBet?: boolean;
    isCancellingBet?: boolean;
    onCancelActiveBet?: (() => void | Promise<void>) | undefined;
}

function formatTokenBalance(balance: bigint, decimals: number, symbol: string): string {
    const scale = 10n ** BigInt(decimals);
    const integerPart = balance / scale;
    const remainder = balance % scale;

    const displayDecimals = 3n;
    const displayScale = 10n ** displayDecimals;

    const fractionalThousand = (remainder * displayScale) / scale;
    const fractionalStr = fractionalThousand.toString().padStart(Number(displayDecimals), '0');

    return `${integerPart.toString()}.${fractionalStr} ${symbol}`;
}

export function BetPanel({
    selectedToken,
    onSelectToken,
    stakeInput,
    onStakeInputChange,
    tokens,
    isStarting,
    onStartBet,
    error,
    statusMessage,
    hasActiveBet,
    needsApproval,
    isApproving,
    isWaitingApproval,
    onApprove,
    betTxId,
    betTxStatus,
    scoreTxId,
    scoreTxStatus,
    cancelTxId,
    cancelTxStatus,
    savedScore,
    canSubmitScore,
    isSubmittingScore,
    onSubmitScore,
    canCancelActiveBet,
    isCancellingBet,
    onCancelActiveBet,
}: BetPanelProps) {
    const handleStakeChange = (event: ChangeEvent<HTMLInputElement>) => {
        onStakeInputChange(event.target.value);
    };

    const tokenInfo = tokens[selectedToken];

    const betTxUrl = betTxId
        ? `https://opscan.org/transactions/${betTxId}?network=op_testnet`
        : null;
    const scoreTxUrl = scoreTxId
        ? `https://opscan.org/transactions/${scoreTxId}?network=op_testnet`
        : null;
    const cancelTxUrl = cancelTxId
        ? `https://opscan.org/transactions/${cancelTxId}?network=op_testnet`
        : null;

    return (
        <section className="bet-panel">
            <div className="bet-panel-header">
                <div>
                    <h2>Bet configuration</h2>
                    <p className="helper bet-panel-subtitle">
                        Choose your token, set a stake, then start a bet game.
                    </p>
                </div>
            </div>

            <div className="bet-token-row">
                <span className="field-label">Token</span>
                <div className="token-toggle-group">
                    {(['PILL', 'MOTO'] as GameTokenKind[]).map((token) => (
                        <button
                            key={token}
                            type="button"
                            className={`toggle ${selectedToken === token ? 'active' : ''}`}
                            onClick={() => onSelectToken(token)}
                            disabled={hasActiveBet}
                        >
                            {token}
                        </button>
                    ))}
                </div>
            </div>

            <div className="bet-amount-row">
                <label className="field-label" htmlFor="bet-amount">
                    Stake amount
                </label>
                <div className="bet-input">
                    <input
                        id="bet-amount"
                        type="number"
                        min="0"
                        step="1"
                        placeholder="0"
                        value={stakeInput}
                        onChange={handleStakeChange}
                        disabled={hasActiveBet}
                    />
                    <span className="bet-input-suffix">{tokenInfo.symbol}</span>
                </div>
                <p className="helper">
                    Balance:{' '}
                    {tokenInfo.balance !== null
                        ? formatTokenBalance(tokenInfo.balance, tokenInfo.decimals, tokenInfo.symbol)
                        : 'Connect wallet to load balance.'}
                </p>
            </div>

            {needsApproval && (
                <div className="bet-approval-panel">
                    <p className="helper">
                        Approve the Game2048 contract to use your {tokenInfo.symbol}.
                    </p>
                    {isWaitingApproval ? (
                        <p className="helper approve-waiting">
                            Approval submitted. Waiting for confirmation (usually 1–2 min).
                        </p>
                    ) : (
                        <button
                            type="button"
                            className="btn btn-approve"
                            onClick={onApprove}
                            disabled={isApproving}
                        >
                            {isApproving
                                ? `Approving ${tokenInfo.symbol}...`
                                : `Approve ${tokenInfo.symbol}`}
                        </button>
                    )}
                </div>
            )}

            {error && <p className="error">{error}</p>}

            {(statusMessage ||
                betTxStatus ||
                scoreTxStatus ||
                cancelTxStatus ||
                canCancelActiveBet ||
                (savedScore !== null && savedScore !== undefined)) && (
                <div className="bet-approval-panel tx-status-panel">
                    {statusMessage && <p className="helper tx-status-message">{statusMessage}</p>}
                    {betTxStatus && (
                        <p className="helper tx-meta-row">
                            Bet tx:{' '}
                            {betTxId ? `${betTxId.slice(0, 8)}...${betTxId.slice(-8)}` : 'unknown'}{' '}
                            ({betTxStatus})
                            {betTxUrl && (
                                <>
                                    {' '}
                                    <a href={betTxUrl} target="_blank" rel="noreferrer">
                                        View on OP_SCAN
                                    </a>
                                </>
                            )}
                        </p>
                    )}
                    {savedScore !== null && savedScore !== undefined && (
                        <p className="helper tx-saved-score">Saved score: {savedScore}</p>
                    )}
                    {scoreTxStatus && (
                        <p className="helper tx-meta-row">
                            Score tx:{' '}
                            {scoreTxId
                                ? `${scoreTxId.slice(0, 8)}...${scoreTxId.slice(-8)}`
                                : 'unknown'}{' '}
                            ({scoreTxStatus})
                            {scoreTxUrl && (
                                <>
                                    {' '}
                                    <a href={scoreTxUrl} target="_blank" rel="noreferrer">
                                        View on OP_SCAN
                                    </a>
                                </>
                            )}
                        </p>
                    )}
                    {cancelTxStatus && (
                        <p className="helper tx-meta-row">
                            Cancel tx:{' '}
                            {cancelTxId
                                ? `${cancelTxId.slice(0, 8)}...${cancelTxId.slice(-8)}`
                                : 'unknown'}{' '}
                            ({cancelTxStatus})
                            {cancelTxUrl && (
                                <>
                                    {' '}
                                    <a href={cancelTxUrl} target="_blank" rel="noreferrer">
                                        View on OP_SCAN
                                    </a>
                                </>
                            )}
                        </p>
                    )}
                    {onCancelActiveBet &&
                        canCancelActiveBet &&
                        cancelTxStatus !== 'pending' && (
                        <>
                            <p className="helper">
                                Cancel this bet first,
                                wait for confirmation, then start a new round.
                            </p>
                            <button
                                type="button"
                                className="btn btn-submit-score"
                                onClick={onCancelActiveBet}
                                disabled={isCancellingBet}
                            >
                                {isCancellingBet ? 'Cancelling bet...' : 'Cancel active bet'}
                            </button>
                        </>
                    )}
                    {onSubmitScore && canSubmitScore && (
                        <>
                            <p className="helper">
                                Submit score on-chain to finish this round. You can only start a new
                                round after this transaction is done.
                            </p>
                            <button
                                type="button"
                                className="btn btn-submit-score"
                                onClick={onSubmitScore}
                                disabled={isSubmittingScore}
                            >
                                {isSubmittingScore ? 'Submitting score...' : 'Submit score on-chain'}
                            </button>
                        </>
                    )}
                </div>
            )}

            <button
                type="button"
                className="btn btn-primary bet-start-button"
                onClick={onStartBet}
                disabled={
                    isStarting || hasActiveBet || needsApproval || isWaitingApproval || isApproving
                }
            >
                {hasActiveBet ? 'Bet in progress' : isStarting ? 'Starting bet...' : 'Start bet game'}
            </button>

        </section>
    );
}

