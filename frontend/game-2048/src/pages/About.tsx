export function About() {
    return (
        <main className="app-content">
            <section className="info-page">
                <header className="info-page-header">
                    <p className="info-eyebrow">About</p>
                    <h1>About 2048 Betting Game</h1>
                    <p className="helper">
                        This dApp brings the classic 2048 puzzle to OPNet with a betting twist. The
                        4x4 board runs fully client-side in your browser, while your final score and
                        bet outcomes are settled on-chain by the Game2048Contract.
                    </p>
                </header>

                <div className="info-grid">
                    <article className="info-card">
                        <h2>On-chain betting pools</h2>
                        <p className="helper">
                            When you start a bet game, your chosen token stake (PILL or MOTO) is
                            locked into the contract pool. The pool grows with every game, powering
                            bigger payouts for high-scoring runs.
                        </p>
                    </article>

                    <article className="info-card">
                        <h2>Score-based payouts</h2>
                        <p className="helper">
                            Reach higher score bands to unlock better multipliers. If you fail to hit
                            the minimum threshold, your stake is lost to the house pool; if you do,
                            the contract pays out multiples of your original stake.
                        </p>
                    </article>

                    <article className="info-card">
                        <h2>Transparent smart contract logic</h2>
                        <p className="helper">
                            OPNet enforces all bet rules and payouts on-chain. Your gameplay happens
                            in the browser, but the Game2048Contract guarantees that wins and losses
                            are applied exactly as defined, with no hidden rules.
                        </p>
                    </article>
                </div>
            </section>
        </main>
    );
}

