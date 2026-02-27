import type { Game2048ContractStats } from '../hooks/useGame2048Contract';

interface ScoreBoardProps {
    stats: Game2048ContractStats;
    loading: boolean;
    onRefresh: () => void;
    motoPoolDecimals?: number;
    pillPoolDecimals?: number;
}

function withThousandsSeparators(value: bigint): string {
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function formatBigint(value: bigint | null): string {
    if (value === null) {
        return '-';
    }
    return withThousandsSeparators(value);
}

function formatTokenAmount(value: bigint | null, decimals: number): string {
    if (value === null) {
        return '-';
    }

    const safeDecimals = Math.max(0, decimals);
    const scale = 10n ** BigInt(safeDecimals);
    const integerPart = value / scale;
    const remainder = value % scale;
    const displayDecimals = 3n;
    const displayScale = 10n ** displayDecimals;
    const fractional = ((remainder * displayScale) / scale)
        .toString()
        .padStart(Number(displayDecimals), '0')
        .replace(/0+$/, '');

    if (fractional.length === 0) {
        return withThousandsSeparators(integerPart);
    }

    return `${withThousandsSeparators(integerPart)}.${fractional}`;
}

export function ScoreBoard({
    stats,
    loading,
    onRefresh,
    motoPoolDecimals = 8,
    pillPoolDecimals = 8,
}: ScoreBoardProps) {
    return (
        <section className="score-panel">
            <div className="score-panel-header">
                <h2>Your on-chain stats</h2>
                <button
                    type="button"
                    className="btn btn-ghost score-refresh"
                    onClick={onRefresh}
                    disabled={loading}
                >
                    {loading ? 'Refreshing...' : 'Refresh'}
                </button>
            </div>
            <div className="stats">
                <div className="stat-row">
                    <span>My best score</span>
                    <span>{formatBigint(stats.myBestScore)}</span>
                </div>
                <div className="stat-row">
                    <span>My games played</span>
                    <span>{formatBigint(stats.myGamesPlayed)}</span>
                </div>
                <div className="stat-row">
                    <span>Global best score</span>
                    <span>{formatBigint(stats.globalBestScore)}</span>
                </div>
                <div className="stat-row">
                    <span>House MOTO pool</span>
                    <span>{formatTokenAmount(stats.motoPoolBalance, motoPoolDecimals)}</span>
                </div>
                <div className="stat-row">
                    <span>House PILL pool</span>
                    <span>{formatTokenAmount(stats.pillPoolBalance, pillPoolDecimals)}</span>
                </div>
            </div>
        </section>
    );
}

