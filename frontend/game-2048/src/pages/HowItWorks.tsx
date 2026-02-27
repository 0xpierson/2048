export function HowItWorks() {
    return (
        <main className="app-content">
            <section className="info-page">
                <header className="info-page-header">
                    <p className="info-eyebrow">Guide</p>
                    <h1>How it works</h1>
                    <p className="helper">
                        A quick overview of how to connect, place a bet, play 2048, and settle your
                        result on-chain.
                    </p>
                </header>

                <ol className="info-steps">
                    <li className="step-card">
                        <div className="step-number">1</div>
                        <div className="step-content">
                            <h2>Connect and choose a token</h2>
                            <p className="helper">
                                Connect your OP_WALLET, then choose whether you want to bet with PILL
                                or MOTO tokens. Your available balances are read directly from the
                                OP20 contracts on OPNet.
                            </p>
                        </div>
                    </li>
                    <li className="step-card">
                        <div className="step-number">2</div>
                        <div className="step-content">
                            <h2>Configure your stake</h2>
                            <p className="helper">
                                Enter the amount you want to stake and start a bet game. Your stake
                                is locked in the Game2048Contract pool, and the board unlocks so you
                                can play.
                            </p>
                        </div>
                    </li>
                    <li className="step-card">
                        <div className="step-number">3</div>
                        <div className="step-content">
                            <h2>Play 2048</h2>
                            <p className="helper">
                                Use your keyboard arrow keys to slide tiles. Matching tiles merge and
                                increase in value. Reach 2048 or higher in a single run to improve
                                your payout multiplier.
                            </p>
                        </div>
                    </li>
                    <li className="step-card">
                        <div className="step-number">4</div>
                        <div className="step-content">
                            <h2>Settle on-chain</h2>
                            <p className="helper">
                                When the game ends, your final score is submitted to the contract. If
                                you do not reach the minimum threshold, your stake is lost. Higher
                                score bands pay back multiples of your original stake in the same
                                token you used to bet.
                            </p>
                        </div>
                    </li>
                </ol>
            </section>
        </main>
    );
}

