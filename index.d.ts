export * from "./components/index";
export * from "./systems/index";
export * from "./three/ParticleEmitter";
export * from "./three/ParticleMesh";
export * from "./Keyframes";
export * from "./Math";
export * from "./Util";
import { World } from "ecsy";
export declare function initializeParticleSystem(world: World, options?: {
    mouse: boolean;
    keyboard: boolean;
    touchscreen: boolean;
    gamepad: boolean;
    debug: boolean;
}): void;
