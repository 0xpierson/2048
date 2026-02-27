import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useWallet } from '../hooks/useWallet';

function formatAddress(addr: string): string {
    if (addr.length <= 14) {
        return addr;
    }
    return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
}

export function Header() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const { address, isConnected, openConnectModal, disconnect } = useWallet();
    const displayAddress = address ?? '';

    return (
        <header className={`header ${isMenuOpen ? 'header-menu-open' : ''}`}>
            <div className="header-left">
                <Link to="/" className="logo" onClick={() => setIsMenuOpen(false)}>
                    <span className="logo-mark">2048</span>
                    <span className="logo-text">
                        <span className="logo-title">OPNET</span>
                        <span className="logo-subtitle">Bitcoin L1 betting</span>
                    </span>
                </Link>
                <nav
                    id="primary-navigation"
                    className={`primary-nav ${isMenuOpen ? 'primary-nav-open' : ''}`}
                >
                    <NavLink
                        to="/"
                        className={({ isActive }) =>
                            `nav-link ${isActive ? 'nav-link-active' : ''}`
                        }
                        onClick={() => setIsMenuOpen(false)}
                    >
                        Play
                    </NavLink>
                    <NavLink
                        to="/about"
                        className={({ isActive }) =>
                            `nav-link ${isActive ? 'nav-link-active' : ''}`
                        }
                        onClick={() => setIsMenuOpen(false)}
                    >
                        About
                    </NavLink>
                    <NavLink
                        to="/how-it-works"
                        className={({ isActive }) =>
                            `nav-link ${isActive ? 'nav-link-active' : ''}`
                        }
                        onClick={() => setIsMenuOpen(false)}
                    >
                        How it works
                    </NavLink>
                </nav>
            </div>
            <div className="header-right">
                {isConnected && displayAddress ? (
                    <>
                        <div className="wallet-row">
                            <span className="address" title={displayAddress}>
                                {formatAddress(displayAddress)}
                            </span>
                            <button type="button" className="btn btn-ghost" onClick={disconnect}>
                                Disconnect
                            </button>
                        </div>
                        <button
                            type="button"
                            className="menu-toggle"
                            aria-label="Toggle navigation"
                            aria-expanded={isMenuOpen}
                            aria-controls="primary-navigation"
                            onClick={() => setIsMenuOpen((prev) => !prev)}
                        >
                            <span className="menu-toggle-icon">
                                <span />
                                <span />
                                <span />
                            </span>
                        </button>
                    </>
                ) : (
                    <>
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={openConnectModal}
                        >
                            Connect wallet
                        </button>
                        <button
                            type="button"
                            className="menu-toggle"
                            aria-label="Toggle navigation"
                            aria-expanded={isMenuOpen}
                            aria-controls="primary-navigation"
                            onClick={() => setIsMenuOpen((prev) => !prev)}
                        >
                            <span className="menu-toggle-icon">
                                <span />
                                <span />
                                <span />
                            </span>
                        </button>
                    </>
                )}
            </div>
        </header>
    );
}

