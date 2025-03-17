import React, { useState, useRef, useEffect } from "react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui"; // Componente UI
import { useWallet } from "@solana/wallet-adapter-react"; // Hook per lo stato del wallet
import PlanetGallery from "./PlanetGallery";
import "./LandingPage.css";

const LandingPage = ({ onDashboardClick }) => {
    const [introVideoEnded, setIntroVideoEnded] = useState(false);
    const [isMusicPlaying, setIsMusicPlaying] = useState(true);
    const [hasInteracted, setHasInteracted] = useState(false);
    const videoRef = useRef(null);
    const audioRef = useRef(null);
    const { publicKey, connected } = useWallet(); // Stato del wallet

    const handleIntroVideoEnd = () => {
        setIntroVideoEnded(true);
    };

    const handleVideoEnd = () => {
        if (videoRef.current) {
            videoRef.current.currentTime = 0;
            videoRef.current.play();
        }
    };

    const playMusic = () => {
        if (audioRef.current && !hasInteracted) {
            audioRef.current.play().then(() => {
                setHasInteracted(true);
            }).catch((error) => {
                console.log("Autoplay blocked:", error);
            });
        }
    };

    useEffect(() => {
        const handleInteraction = () => {
            if (!hasInteracted) {
                playMusic();
            }
        };

        window.addEventListener("click", handleInteraction);
        playMusic();

        return () => {
            window.removeEventListener("click", handleInteraction);
        };
    }, [hasInteracted]);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = 0.1;
        }
    }, []);

    const toggleMusic = () => {
        if (audioRef.current) {
            if (isMusicPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setIsMusicPlaying((prev) => !prev);
        }
    };

    // Stato locale per il pulsante, sincronizzato con connected
    const isWalletConnected = !!publicKey && connected;

    return (
        <div className="landing-page-container">
            <div className="landing-page">
                <div className="music-toggle">
                    <button className="music-control" onClick={toggleMusic}>
                        {isMusicPlaying ? "⏸" : "▶"}
                    </button>
                </div>
                <div className="wallet-button">
                    <WalletMultiButton />
                </div>
                <div className="logo-container">
                    <img src="/images/logo.svg" alt="Universe Solana Logo" className="logo" />
                </div>
                <div className="video-container">
                    {!introVideoEnded && (
                        <video
                            autoPlay
                            muted
                            className="background-video"
                            onEnded={handleIntroVideoEnd}
                            preload="auto"
                        >
                            <source src="/videos/intro.mp4" type="video/mp4" />
                            Your browser does not support the video tag.
                        </video>
                    )}
                    {introVideoEnded && (
                        <video
                            ref={videoRef}
                            autoPlay
                            muted
                            loop
                            className="overlay-video"
                            preload="auto"
                            onEnded={handleVideoEnd}
                        >
                            <source src="/videos/intro.mp4" type="video/mp4" />
                            Your browser does not support the video tag.
                        </video>
                    )}
                    <audio ref={audioRef} loop preload="auto">
                        <source src="/audio/universe_intro.mp3" type="audio/mp3" />
                        Your browser does not support the audio tag.
                    </audio>
                    <div className="content">
                        <h1>UNIVERSE SOLANA</h1>
                        <p>Build your own universe, directly on chain</p>
                    </div>
                    <div className="buttons">
                        <button
                            className="futuristic-button"
                            onClick={onDashboardClick}
                            disabled={!isWalletConnected}
                        >
                            DASHBOARD
                        </button>
                        <a href="/whitepaper.pdf" target="_blank" rel="noopener noreferrer">
                            <button className="futuristic-button">WHITEPAPER</button>
                        </a>
                        <a href="https://t.me/universesolana" target="_blank" rel="noopener noreferrer">
                            <button className="futuristic-button">TELEGRAM</button>
                        </a>
                        <a href="/how-to-buy.pdf" target="_blank" rel="noopener noreferrer">
                            <button className="futuristic-button">HOW TO BUY</button>
                        </a>
                    </div>
                </div>
                <PlanetGallery />
            </div>
        </div>
    );
};

export default LandingPage;