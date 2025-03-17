import React, { useState } from "react";
import { Engine, Scene, ArcRotateCamera, HemisphericLight, Sphere } from "react-babylonjs";
import { Vector3, Color3, Animation } from "@babylonjs/core";

const PlanetScene = () => {
    const [angle, setAngle] = useState(0);

    // Animate the Moon's orbit
    React.useEffect(() => {
        const animationLoop = setInterval(() => {
            setAngle((prevAngle) => prevAngle + 0.01);
        }, 16); // ~60 FPS
        return () => clearInterval(animationLoop);
    }, []);

    return (
        <div style={{ flex: 1, height: "100vh" }}>
            <Engine antialias adaptToDeviceRatio canvasId="babylon-canvas">
                <Scene>
                    <ArcRotateCamera
                        name="camera"
                        target={Vector3.Zero()}
                        alpha={-Math.PI / 2}
                        beta={Math.PI / 4}
                        radius={10}
                        setPosition={[new Vector3(0, 5, -10)]}
                    />
                    <HemisphericLight
                        name="light"
                        intensity={0.7}
                        direction={Vector3.Up()}
                    />
                    <Sphere
                        name="earth"
                        diameter={2}
                        segments={32}
                        position={new Vector3(0, 0, 0)}
                    >
                        <standardMaterial
                            name="earthMaterial"
                            diffuseColor={Color3.FromHexString("#00FF00")} // Green Earth for now (replace with texture later)
                        />
                    </Sphere>
                    <Sphere
                        name="moon"
                        diameter={0.5}
                        segments={32}
                        position={new Vector3(3 * Math.cos(angle), 0, 3 * Math.sin(angle))}
                    >
                        <standardMaterial
                            name="moonMaterial"
                            diffuseColor={Color3.Gray()}
                        />
                    </Sphere>
                </Scene>
            </Engine>
        </div>
    );
};

export default PlanetScene; 