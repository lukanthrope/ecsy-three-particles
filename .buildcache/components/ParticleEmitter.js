import { Component, SystemStateComponent } from "ecsy";
export class ParticleEmitterState extends SystemStateComponent {
    constructor() {
        super();
        this.reset();
    }
    reset() {
        this.emitter3D = undefined;
        this.useEntityRotation = true;
        this.syncTransform = false;
    }
}
export class ParticleEmitter extends Component {
    constructor() {
        super();
        this.reset();
    }
    reset() {
        this.particleMesh = null;
        this.enabled = true;
        this.count = -1;
        this.atlas = "";
        this.textureFrame = undefined;
        this.frames = [];
        this.lifeTime = 1;
        this.repeatTime = 0;
        this.spawnVariance = 0;
        this.burst = 0;
        this.syncTransform = false;
        this.useEntityRotation = true;
        this.worldUp = false;
        // randomizable values
        this.colors = [{ r: 1, g: 1, b: 1 }];
        this.orientations = [0];
        this.scales = [1];
        this.opacities = [1];
        this.frameStyle = "sequence";
        this.offset = { x: 0, y: 0, z: 0 };
        this.velocity = { x: 0, y: 0, z: 0 };
        this.acceleration = { x: 0, y: 0, z: 0 };
        this.radialVelocity = 0;
        this.radialAcceleration = 0;
        this.angularVelocity = { x: 0, y: 0, z: 0 };
        this.angularAcceleration = { x: 0, y: 0, z: 0 };
        this.orbitalVelocity = 0;
        this.orbitalAcceleration = 0;
        this.worldAcceleration = { x: 0, y: 0, z: 0 };
        this.brownianSpeed = 0;
        this.brownianScale = 0;
    }
    copy(src) {
        Object.defineProperties(this, Object.getOwnPropertyDescriptors(src)); // preserves getters
    }
}
