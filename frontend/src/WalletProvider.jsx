import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";
import { createAppKit } from "@reown/appkit/react";
import { SolanaAdapter } from "@reown/appkit-adapter-solana/react";
import { solana, solanaTestnet, solanaDevnet } from "@reown/appkit/networks";
import { clusterApiUrl } from "@solana/web3.js";
import { useMemo } from "react";

import "@solana/wallet-adapter-react-ui/styles.css";

// 1. Get projectId from Reown
const projectId = "c948f0d5cc7d7473428d339580c45a57";

// 2. Create a metadata object
const metadata = {
    name: "Universe Solana",
    description: "A Solana-based planetary DApp",
    url: "http://localhost:5173", // Usa localhost durante lo sviluppo
    icons: ["https://your-dapp-url.com/icon.png"], // Sostituisci con l’URL del tuo logo
};

// 3. Set up Solana Adapter
const solanaWeb3JsAdapter = new SolanaAdapter({
    wallets: [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
});

// 4. Create AppKit modal (run this once on app initialization)
const appKitInstance = createAppKit({
    adapters: [solanaWeb3JsAdapter],
    networks: [solana, solanaTestnet, solanaDevnet],
    metadata: metadata,
    projectId,
    features: {
        analytics: true, // Optional - defaults to your Cloud configuration
    },
});

// 5. Export the WalletProvider with AppKit integration
export function WalletProviderComponent({ children }) {
    const network = WalletAdapterNetwork.Devnet;
    const endpoint = useMemo(() => clusterApiUrl(network), [network]);

    const wallets = useMemo(() => {
        return [new PhantomWalletAdapter(), new SolflareWalletAdapter()];
    }, []);

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>{children}</WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
}