import React, { useState, useEffect } from "react";
import { Engine, Scene, ArcRotateCamera, HemisphericLight } from "react-babylonjs";
import { Vector3, Color3, SceneLoader, Animation, MeshBuilder, PBRMaterial, HDRCubeTexture, Texture } from "@babylonjs/core";
import "@babylonjs/loaders";
import "./PlanetGallery.css";

const planets = [
    { name: "Earth", dailyRewards: "4%", compoundsRequired: 0, diameter: 1, model: "/models/earth/", scaleFactor: 0.3 },
    { name: "Moon", dailyRewards: "5%", compoundsRequired: 1, diameter: 0.3, model: "/models/moon/", scaleFactor: 3 },
    { name: "Mercury", dailyRewards: "6%", compoundsRequired: 2, diameter: 5, model: "/models/mercury/", scaleFactor: 10 },
    { name: "Venus", dailyRewards: "7%", compoundsRequired: 3, diameter: 4, model: "/models/venus/", scaleFactor: 4 },
    { name: "Mars", dailyRewards: "8%", compoundsRequired: 4, diameter: 0.5, model: "/models/mars/", scaleFactor: 0.5 },
    { name: "Jupiter", dailyRewards: "9%", compoundsRequired: 5, diameter: 1.2, model: "/models/jupiter/", scaleFactor: 2 },
    { name: "Saturn", dailyRewards: "10%", compoundsRequired: 6, diameter: 0.1, model: "/models/saturn/", scaleFactor: 1.5 },
    { name: "Uranus", dailyRewards: "11%", compoundsRequired: 7, diameter: 1.2, model: "/models/uranus/", scaleFactor: 0.65 },
    { name: "Neptune", dailyRewards: "12%", compoundsRequired: 8, diameter: 1.1, model: "/models/neptune/", scaleFactor: 0.7 },
    { name: "Sun", dailyRewards: "14%", compoundsRequired: 10, diameter: 1.5, model: "/models/sun/", scaleFactor: 0.3 },
];

const PlanetGallery = () => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [currentModel, setCurrentModel] = useState(null);
    const [scene, setScene] = useState(null);
    const [engine, setEngine] = useState(null);

    const handlePrev = () => {
        setCurrentIndex((prev) => (prev === 0 ? planets.length - 1 : prev - 1));
    };

    const handleNext = () => {
        setCurrentIndex((prev) => (prev === planets.length - 1 ? 0 : prev + 1));
    };

    const currentPlanet = planets[currentIndex];
    const cameraRadius = 15;

    const loadModel = (scene) => {
        // Cleanup existing meshes except for the skybox, light, and camera
        scene.meshes.forEach((mesh) => {
            if (!mesh._isLight && !mesh._isCamera && mesh.name !== "hdrSkybox") {
                scene.removeMesh(mesh);
                mesh.dispose();
            }
        });

        scene.rootNodes.forEach((node) => {
            if (!node._isLight && !node._isCamera && node.name !== "hdrSkybox") {
                scene.removeMesh(node);
                node.dispose();
            }
        });

        SceneLoader.ImportMesh(
            "",
            currentPlanet.model,
            "scene.gltf",
            scene,
            (meshes) => {
                if (meshes.length > 0) {
                    const model = meshes[0];
                    model.scaling.set(1, 1, 1);
                    model.scaling.scaleInPlace(currentPlanet.scaleFactor);
                    model.position = new Vector3(0, 0, 0);

                    if (currentPlanet.name === "Saturn" || currentPlanet.name === "Uranus") {
                        model.rotation = new Vector3(-0.466, Math.PI, 0);
                    } else {
                        model.rotation = new Vector3(0, Math.PI, 0);
                    }

                    const rotationAnimation = new Animation(
                        "rotate",
                        "rotation.y",
                        5,
                        Animation.ANIMATIONTYPE_FLOAT,
                        Animation.ANIMATIONLOOPMODE_CYCLE
                    );
                    const keys = [
                        { frame: 0, value: Math.PI },
                        { frame: 200, value: Math.PI + Math.PI * 2 },
                    ];
                    rotationAnimation.setKeys(keys);
                    model.animations = [rotationAnimation];
                    scene.beginAnimation(model, 0, 200, true);

                    setCurrentModel(model);
                    scene.render();
                } else {
                    console.error(`Nessun mesh caricato per ${currentPlanet.name}`);
                }
            },
            null,
            (scene, message, exception) => {
                console.error(`Errore nel caricamento del modello ${currentPlanet.name}: ${message}`, exception);
            }
        );
    };

    const onSceneMount = ({ scene, engine }) => {
        setScene(scene);
        setEngine(engine);

        if (!engine) {
            console.warn("Engine non inizializzato correttamente. Proseguo senza gestione del contesto.");
            return;
        }

        scene.autoClear = true;
        scene.renderOnDemand = true;

        engine.onContextLostObservable.add(() => {
            console.warn("Contesto WebGL perso, tentativo di ricreare la scena...");
            scene.dispose();
            engine.recreateScene(() => {
                console.log("Scena ricreata con successo");
                loadModel(scene);
            });
        });

        loadModel(scene);
    };

    useEffect(() => {
        if (scene) {
            loadModel(scene);
            scene.render();
        }
    }, [currentIndex, scene]);

    useEffect(() => {
        return () => {
            if (scene) {
                scene.meshes.forEach((mesh) => {
                    if (!mesh._isLight && !mesh._isCamera) {
                        scene.removeMesh(mesh);
                        mesh.dispose();
                    }
                });
                scene.rootNodes.forEach((node) => {
                    if (!node._isLight && !node._isCamera) {
                        scene.removeMesh(node);
                        node.dispose();
                    }
                });
                setCurrentModel(null);
                if (!scene.isDisposed) {
                    scene.dispose();
                }
            }
            if (engine) {
                engine.onContextLostObservable?.clear();
            }
        };
    }, [scene, engine]);

    return (
        <div className="planet-gallery">
            <h2 className="section-title">DISCOVER THE CELESTIAL BODIES</h2>
            <div className="carousel-container">
                <div className="carousel-3d">
                    <Engine antialias adaptToDeviceRatio canvasId="planet-carousel">
                        <Scene clearColor={new Color3(0, 0, 0)} onSceneMount={onSceneMount}>
                            <ArcRotateCamera
                                name="camera"
                                target={Vector3.Zero()}
                                alpha={-Math.PI / 2}
                                beta={Math.PI / 3}
                                radius={cameraRadius}
                                position={new Vector3(0, currentPlanet.diameter * 1.5, cameraRadius * 0.5)}
                                lowerRadiusLimit={cameraRadius}
                                upperRadiusLimit={cameraRadius}
                                wheelPrecision={0}
                                minZ={0.1}
                                maxZ={2000}
                            />
                            <HemisphericLight
                                name="light"
                                intensity={0.7}
                                direction={Vector3.Up()}
                            />
                            {/* Skybox con PBRMaterial e HDR */}
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
                                        size={2048} // Reduced size for mobile compatibility
                                        coordinatesMode={Texture.SKYBOX_MODE}
                                        assignTo="reflectionTexture"
                                        onLoad={() => console.log("Skybox HDR caricata con successo in PlanetGallery")}
                                        onError={(message) => console.error("Errore nel caricamento della skybox HDR in PlanetGallery:", message)}
                                    />
                                </pbrMaterial>
                            </box>
                        </Scene>
                    </Engine>
                </div>
                <div className="carousel-description">
                    <h3 className="planet-name">{currentPlanet.name}</h3>
                    <p className="planet-rewards">Daily Rewards: {currentPlanet.dailyRewards}</p>
                    <p className="planet-compounds">Compounds Required: {currentPlanet.compoundsRequired}</p>
                </div>
                <div className="carousel-controls">
                    <button className="carousel-button prev" onClick={handlePrev}>
                        ←
                    </button>
                    <button className="carousel-button next" onClick={handleNext}>
                        →
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PlanetGallery;