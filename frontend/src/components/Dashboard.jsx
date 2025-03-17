import React, { useEffect, useState, useRef } from "react";
import { Engine, Scene, ArcRotateCamera, HemisphericLight } from "react-babylonjs";
import { Vector3, Color3, Texture } from "@babylonjs/core";
import { useWallet } from "@solana/wallet-adapter-react";
import "./Dashboard.css";

// Icone SVG per il carousel in stile stroke
const PlanetIcon = () => (
    <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="url(#neon-gradient)" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a10 10 0 0 1 0 20" />
    </svg>
);

const MarketIcon = () => (
    <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="url(#neon-gradient)" strokeWidth="2">
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <line x1="4" y1="12" x2="20" y2="12" />
    </svg>
);

const StatsIcon = () => (
    <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="url(#neon-gradient)" strokeWidth="2">
        <line x1="4" y1="20" x2="4" y2="4" />
        <line x1="10" y1="20" x2="10" y2="8" />
        <line x1="16" y1="20" x2="16" y2="12" />
    </svg>
);

// Icone SVG per le azioni
const CreatePlanetIcon = () => (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="url(#neon-gradient)" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a10 10 0 0 1 0 20" />
        <path d="M2 12h20" />
    </svg>
);

const ClaimRewardsIcon = () => (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="url(#neon-gradient)" strokeWidth="2">
        <path d="M12 2v20" />
        <path d="M2 12h20" />
        <path d="M6 6l12 12" />
    </svg>
);

const DestroyPlanetIcon = () => (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="url(#neon-gradient)" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M6 6l12 12" />
    </svg>
);

const Dashboard = ({ onBackClick }) => {
    const { publicKey, connected } = useWallet();
    const [univBalance, setUnivBalance] = useState(0);
    const [totalPlanets, setTotalPlanets] = useState(0);
    const [selectedIcon, setSelectedIcon] = useState(0);
    const [dragStartX, setDragStartX] = useState(null);
    const [activeMenu, setActiveMenu] = useState(null);
    const [showDashboard, setShowDashboard] = useState(false);
    const carouselRef = useRef(null);

    const icons = [PlanetIcon, MarketIcon, StatsIcon];

    useEffect(() => {
        if (connected && publicKey) {
            const fetchData = async () => {
                const mockBalance = 1500;
                const mockPlanets = 0;
                setUnivBalance(mockBalance);
                setTotalPlanets(mockPlanets);
            };
            fetchData();
        } else {
            setUnivBalance(0);
            setTotalPlanets(0);
        }
    }, [connected, publicKey]);

    const handleMouseDown = (e) => {
        setDragStartX(e.clientX || e.touches?.[0].clientX);
    };

    const handleMouseMove = (e) => {
        if (dragStartX !== null) {
            const currentX = e.clientX || e.touches?.[0].clientX;
            const diff = currentX - dragStartX;
            if (Math.abs(diff) > 50) {
                setDragStartX(null);
                if (diff > 0) setSelectedIcon((prev) => (prev === 0 ? icons.length - 1 : prev - 1));
                else setSelectedIcon((prev) => (prev === icons.length - 1 ? 0 : prev + 1));
                setActiveMenu(null);
                setShowDashboard(false);
            }
        }
    };

    const handleMouseUp = () => {
        setDragStartX(null);
    };

    const handleIconClick = (index) => {
        setSelectedIcon(index);
        setActiveMenu(icons[index] === PlanetIcon ? "planets" : icons[index] === MarketIcon ? "market" : "stats");
        setShowDashboard(false);
    };

    const handleActionClick = () => {
        setShowDashboard(true);
    };

    const handleCloseDashboard = () => {
        setShowDashboard(false);
    };

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <div className="dashboard-header-left">
                    <button className="back-button" onClick={onBackClick}>
                        ← Back
                    </button>
                    <h1>UNIVERSE SOLANA DASHBOARD</h1>
                </div>
                <div className="balance-info">
                    <div className="balance">
                        $UNIV Balance: {univBalance.toLocaleString()} $UNIV
                    </div>
                    <div className="total-planets">
                        Total Planets Created: {totalPlanets}
                    </div>
                </div>
            </div>
            <div className="dashboard-content">
                <Engine antialias adaptToDeviceRatio canvasId="dashboard-scene">
                    <Scene clearColor={new Color3(0, 0, 0)}>
                        <ArcRotateCamera
                            name="camera"
                            target={Vector3.Zero()}
                            alpha={-Math.PI / 2}
                            beta={Math.PI / 3}
                            radius={15}
                            position={new Vector3(0, 0, 15)}
                            lowerRadiusLimit={10}
                            upperRadiusLimit={20}
                            wheelPrecision={0}
                            minZ={0.1}
                            maxZ={1000}
                        />
                        <HemisphericLight
                            name="light"
                            intensity={0.7}
                            direction={Vector3.Up()}
                        />
                        <box
                            name="hdrSkybox"
                            size={1000}
                            infiniteDistance={true}
                            isPickable={false}
                            ignoreCameraMaxZ={true}
                        >
                            <pbrMaterial
                                name="skybox"
                                backFaceCulling={false}
                                disableLighting={true}
                                microSurface={1.0}
                            >
                                <hdrCubeTexture
                                    url="/skybox/HDR_blue_nebulae-1.hdr"
                                    size={2048}
                                    coordinatesMode={Texture.SKYBOX_MODE}
                                    assignTo="reflectionTexture"
                                    onLoad={() => console.log("Skybox HDR caricata con successo")}
                                    onError={(message) => console.error("Errore nel caricamento della skybox HDR:", message)}
                                />
                            </pbrMaterial>
                        </box>
                    </Scene>
                </Engine>
                <div className="dashboard-overlay"></div>
                <div className="central-message">
                    <div className="dashboard-panel">
                        <h2>Welcome to Your Dashboard</h2>
                        <p>Currently Unavailable</p>
                        {totalPlanets === 0 && (
                            <button 
                                className="create-planet-cta" 
                                onClick={handleActionClick}
                            >
                                <CreatePlanetIcon />
                                Create Planet
                            </button>
                        )}
                    </div>
                </div>
            </div>
            <div className="dashboard-menu">
                <div
                    className="icon-carousel"
                    ref={carouselRef}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onTouchStart={handleMouseDown}
                    onTouchMove={handleMouseMove}
                    onTouchEnd={handleMouseUp}
                >
                    {icons.map((Icon, index) => (
                        <button
                            key={index}
                            className={`icon-button ${index === selectedIcon ? "selected" : ""}`}
                            onClick={() => handleIconClick(index)}
                        >
                            <Icon />
                            <defs>
                                <linearGradient id="neon-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" style={{ stopColor: "#00ffff" }} />
                                    <stop offset="100%" style={{ stopColor: "#ff00ff" }} />
                                </linearGradient>
                            </defs>
                        </button>
                    ))}
                </div>
                {activeMenu === "planets" && (
                    <div className="dropdown-menu">
                        {totalPlanets === 0 ? (
                            <>
                                <p className="no-planets">
                                    No planets created yet. Embark on your cosmic adventure!
                                </p>
                                <button className="action-button create-planet-pulse" onClick={handleActionClick}>
                                    <CreatePlanetIcon />
                                    <span>Create Planet</span>
                                </button>
                            </>
                        ) : (
                            <>
                                <button className="action-button" onClick={handleActionClick}>
                                    <CreatePlanetIcon />
                                    <span>Create Planet</span>
                                </button>
                                <button className="action-button" onClick={handleActionClick}>
                                    <ClaimRewardsIcon />
                                    <span>Claim Rewards</span>
                                </button>
                                <button className="action-button" onClick={handleActionClick}>
                                    <DestroyPlanetIcon />
                                    <span>Destroy Planet</span>
                                </button>
                            </>
                        )}
                    </div>
                )}
                {activeMenu === "market" && (
                    <div className="dropdown-menu">
                        <p>Market (Coming Soon)</p>
                    </div>
                )}
                {activeMenu === "stats" && (
                    <div className="dropdown-menu">
                        <p>Stats (Coming Soon)</p>
                    </div>
                )}
                {showDashboard && (
                    <div className="action-dashboard">
                        <button className="close-button" onClick={handleCloseDashboard}>
                            ↑
                        </button>
                        <h3>Planet Management</h3>
                        <p>Here you can manage your planets. More details coming soon!</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;