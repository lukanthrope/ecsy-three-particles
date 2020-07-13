import {Component, SystemStateComponent, Types} from "ecsy"

interface ParticleEmitterStateInterface {
  emitter3D: any
  useEntityRotation: boolean
  syncTransform: boolean
}

export class ParticleEmitterState extends SystemStateComponent<ParticleEmitterStateInterface> {
  emitter3D: any
  useEntityRotation: boolean
  syncTransform: boolean
}

ParticleEmitterState.schema = {
  ... ParticleEmitterState.schema,
  emitter3D: { type: Types.Ref },
  useEntityRotation: { type: Types.Boolean, default: true },
  syncTransform: { type: Types.Boolean, default: false }
};

interface ParticleEmitterInterface {
  particleMesh: any
  enabled: boolean
  count: number
  atlas: string
  textureFrame: any
  frames: any[]
  lifeTime: number
  repeatTime: number
  spawnVariance: number
  burst: number
  syncTransform: boolean
  useEntityRotation: boolean
  worldUp: boolean
  colors: { r: number; g: number; b: number }[]
  orientations: number[]
  scales: number[]
  opacities: number[]
  frameStyle: string
  offset: { x: number; y: number; z: number }
  velocity: { x: number; y: number; z: number }
  acceleration: { x: number; y: number; z: number }
  radialVelocity: number
  radialAcceleration: number
  angularVelocity: { x: number; y: number; z: number }
  angularAcceleration: { x: number; y: number; z: number }
  orbitalVelocity: number
  orbitalAcceleration: number
  worldAcceleration: { x: number; y: number; z: number }
  brownianSpeed: number
  brownianScale: number
}

export class ParticleEmitter extends Component<ParticleEmitterInterface> {
  particleMesh: any
  enabled: boolean
  count: number
  atlas: string
  textureFrame: any
  frames: any[]
  lifeTime: number
  repeatTime: number
  spawnVariance: number
  burst: number
  syncTransform: boolean
  useEntityRotation: boolean
  worldUp: boolean
  colors: { r: number; g: number; b: number }[]
  orientations: number[]
  scales: number[]
  opacities: number[]
  frameStyle: string
  offset: { x: number; y: number; z: number }
  velocity: { x: number; y: number; z: number }
  acceleration: { x: number; y: number; z: number }
  radialVelocity: number
  radialAcceleration: number
  angularVelocity: { x: number; y: number; z: number }
  angularAcceleration: { x: number; y: number; z: number }
  orbitalVelocity: number
  orbitalAcceleration: number
  worldAcceleration: { x: number; y: number; z: number }
  brownianSpeed: number
  brownianScale: number
  // constructor() {
  //   super()
  //   // this.reset()
  // }

  // reset(): void {
  //   this.particleMesh = null
  //   this.enabled = true
  //   this.count = -1
  //   this.atlas = ""
  //   this.textureFrame = undefined
  //   this.frames = []
  //   this.lifeTime = 1
  //   this.repeatTime = 0
  //   this.spawnVariance = 0
  //   this.burst = 0
  //   this.syncTransform = false
  //   this.useEntityRotation = true
  //   this.worldUp = false
  //   // randomizable values
  //   this.colors = [{ r: 1, g: 1, b: 1 }]
  //   this.orientations = [0]
  //   this.scales = [1]
  //   this.opacities = [1]
  //   this.frameStyle = "sequence"
  //   this.offset = { x: 0, y: 0, z: 0 }
  //   this.velocity = { x: 0, y: 0, z: 0 }
  //   this.acceleration = { x: 0, y: 0, z: 0 }
  //   this.radialVelocity = 0
  //   this.radialAcceleration = 0
  //   this.angularVelocity = { x: 0, y: 0, z: 0 }
  //   this.angularAcceleration = { x: 0, y: 0, z: 0 }
  //   this.orbitalVelocity = 0
  //   this.orbitalAcceleration = 0
  //   this.worldAcceleration = { x: 0, y: 0, z: 0 }
  //   this.brownianSpeed = 0
  //   this.brownianScale = 0
  // }

  // copy(src): any {
  //   Object.defineProperties(this, Object.getOwnPropertyDescriptors(src)) // preserves getters
  // }
}

ParticleEmitter.schema = {
  ... ParticleEmitter.schema,
  particleMesh: { type: Types.Ref, default: null },
  enabled: { type: Types.Boolean, default: true },
  count: { type: Types.Number, default: -1 },
  atlas: { type: Types.String, default: "" }
};
