import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { WalletConnectProvider } from '@btc-vision/walletconnect';
import { OPNetProvider } from './providers/OPNetProvider';
import { App } from './App';
import './styles/global.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
    throw new Error('Root element #root not found');
}

const root = ReactDOM.createRoot(rootElement);

root.render(
    <React.StrictMode>
        <OPNetProvider defaultNetwork="opnetTestnet">
            <WalletConnectProvider theme="dark">
                <BrowserRouter>
                    <App />
                </BrowserRouter>
            </WalletConnectProvider>
        </OPNetProvider>
    </React.StrictMode>,
);

