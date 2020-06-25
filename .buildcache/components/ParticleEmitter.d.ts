import { Component, SystemStateComponent } from "ecsy";
export declare class ParticleEmitterState extends SystemStateComponent {
    emitter3D: any;
    useEntityRotation: boolean;
    syncTransform: boolean;
    constructor();
    reset(): void;
}
export declare class ParticleEmitter extends Component {
    particleMesh: any;
    enabled: boolean;
    count: number;
    atlas: string;
    textureFrame: any;
    frames: any[];
    lifeTime: number;
    repeatTime: number;
    spawnVariance: number;
    burst: number;
    syncTransform: boolean;
    useEntityRotation: boolean;
    worldUp: boolean;
    colors: {
        r: number;
        g: number;
        b: number;
    }[];
    orientations: number[];
    scales: number[];
    opacities: number[];
    frameStyle: string;
    offset: {
        x: number;
        y: number;
        z: number;
    };
    velocity: {
        x: number;
        y: number;
        z: number;
    };
    acceleration: {
        x: number;
        y: number;
        z: number;
    };
    radialVelocity: number;
    radialAcceleration: number;
    angularVelocity: {
        x: number;
        y: number;
        z: number;
    };
    angularAcceleration: {
        x: number;
        y: number;
        z: number;
    };
    orbitalVelocity: number;
    orbitalAcceleration: number;
    worldAcceleration: {
        x: number;
        y: number;
        z: number;
    };
    brownianSpeed: number;
    brownianScale: number;
    constructor();
    reset(): void;
    copy(src: any): any;
}
