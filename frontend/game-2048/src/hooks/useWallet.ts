import { useCallback, useState } from 'react';
import { useWalletConnect } from '@btc-vision/walletconnect';

export function useWallet() {
    const walletConnect = useWalletConnect();
    const [error, setError] = useState<Error | null>(null);

    const openConnectModal = useCallback(() => {
        setError(null);
        try {
            walletConnect.openConnectModal();
        } catch (err) {
            const connectError = err instanceof Error ? err : new Error(String(err));
            setError(connectError);
        }
    }, [walletConnect]);

    const disconnect = useCallback(() => {
        setError(null);
        try {
            walletConnect.disconnect();
        } catch (err) {
            const disconnectError = err instanceof Error ? err : new Error(String(err));
            setError(disconnectError);
        }
    }, [walletConnect]);

    const isConnected = walletConnect.address !== null;

    return {
        address: walletConnect.walletAddress,
        addressObject: walletConnect.address,
        publicKey: walletConnect.publicKey,
        hashedMLDSAKey: walletConnect.hashedMLDSAKey,
        mldsaPublicKey: walletConnect.mldsaPublicKey,
        isConnected,
        isConnecting: walletConnect.connecting,
        error,
        walletType: walletConnect.walletType,
        provider: walletConnect.provider,
        openConnectModal,
        disconnect,
    };
}

