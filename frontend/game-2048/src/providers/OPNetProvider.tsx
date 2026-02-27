import {
    createContext,
    useContext,
    useEffect,
    useRef,
    useState,
    type ReactNode,
} from 'react';
import { JSONRpcProvider } from 'opnet';
import type { Network } from '@btc-vision/bitcoin';
import { OPNET_NETWORK, OPNET_RPC_URL } from '../config';

const OPNetNetworks = {
    opnetTestnet: {
        url: OPNET_RPC_URL,
        network: OPNET_NETWORK,
    },
} as const;

type OPNetNetworkId = keyof typeof OPNetNetworks;

interface OPNetContextType {
    provider: JSONRpcProvider | null;
    network: Network;
    networkId: OPNetNetworkId;
    isConnected: boolean;
    error: Error | null;
}

interface OPNetProviderProps {
    children: ReactNode;
    defaultNetwork?: OPNetNetworkId;
}

const OPNetContext = createContext<OPNetContextType | undefined>(undefined);

export function OPNetProvider({ children, defaultNetwork = 'opnetTestnet' }: OPNetProviderProps) {
    const [networkId] = useState<OPNetNetworkId>(defaultNetwork);
    const [provider, setProvider] = useState<JSONRpcProvider | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const providerRef = useRef<JSONRpcProvider | null>(null);

    const config = OPNetNetworks[networkId];
    const network = config.network;

    useEffect(() => {
        const initProvider = async () => {
            setError(null);
            try {
                const rpcProvider = new JSONRpcProvider({
                    url: config.url,
                    network: config.network,
                });
                providerRef.current = rpcProvider;
                setProvider(rpcProvider);
                await rpcProvider.getBlockNumber();
                setIsConnected(true);
            } catch (err) {
                const initError = err instanceof Error ? err : new Error(String(err));
                setError(initError);
                setIsConnected(false);
            }
        };

        void initProvider();

        return () => {
            providerRef.current?.close();
        };
    }, [config.url, config.network]);

    const value: OPNetContextType = {
        provider,
        network,
        networkId,
        isConnected,
        error,
    };

    return <OPNetContext.Provider value={value}>{children}</OPNetContext.Provider>;
}

const defaultContextValue: OPNetContextType = {
    provider: null,
    network: OPNET_NETWORK,
    networkId: 'opnetTestnet',
    isConnected: false,
    error: null,
};

export function useOPNet(): OPNetContextType {
    const ctx = useContext(OPNetContext);
    if (!ctx) {
        if (import.meta.env.DEV) {
            console.warn(
                'useOPNet was called outside OPNetProvider. Wrap your app with <OPNetProvider> in main.tsx. Using default (disconnected) value.',
            );
        }
        return defaultContextValue;
    }
    return ctx;
}

