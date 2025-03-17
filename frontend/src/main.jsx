import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { WalletProviderComponent } from "./WalletProvider.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
        <WalletProviderComponent>
            <App />
        </WalletProviderComponent>
    </React.StrictMode>
);