import React, { useState } from "react";
import LandingPage from "./components/LandingPage";
import Dashboard from "./components/Dashboard";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";
import { clusterApiUrl } from "@solana/web3.js";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";

function App() {
    const [showDashboard, setShowDashboard] = useState(false);
    const network = WalletAdapterNetwork.Mainnet;
    const endpoint = clusterApiUrl(network);
    const wallets = [new PhantomWalletAdapter()];

    const handleBackClick = () => {
        setShowDashboard(false);
    };

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>
                    {!showDashboard ? (
                        <LandingPage onDashboardClick={() => setShowDashboard(true)} />
                    ) : (
                        <Dashboard onBackClick={handleBackClick} />
                    )}
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
}

export default App;