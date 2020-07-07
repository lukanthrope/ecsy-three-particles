import { Component, SystemStateComponent, System, createType } from 'https://unpkg.com/ecsy@0.3.1/build/ecsy.module.js';
import { Object3DComponent, Transform, Parent } from './vendor/ecsy-three.module-unpkg.js';
import { DataTexture, RGBFormat, TextureLoader, InstancedBufferGeometry, BufferGeometry, ShaderLib, UniformsUtils, ShaderMaterial, Mesh, Points, Float32BufferAttribute, Matrix4, Texture, NormalBlending, InstancedBufferAttribute, MathUtils, Vector3, Quaternion, Euler } from 'https://unpkg.com/three@0.118.3/build/three.module.js';

class Keyframe extends Component {
  constructor() {
    super();
    this.reset();
  }

  reset() {
    this.attributes = [];
    this.duration = 1;
    this.direction = "ping-pong";
  }

}

class ParticleEmitterState extends SystemStateComponent {
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
class ParticleEmitter extends Component {
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
    this.worldUp = false; // randomizable values

    this.colors = [{
      r: 1,
      g: 1,
      b: 1
    }];
    this.orientations = [0];
    this.scales = [1];
    this.opacities = [1];
    this.frameStyle = "sequence";
    this.offset = {
      x: 0,
      y: 0,
      z: 0
    };
    this.velocity = {
      x: 0,
      y: 0,
      z: 0
    };
    this.acceleration = {
      x: 0,
      y: 0,
      z: 0
    };
    this.radialVelocity = 0;
    this.radialAcceleration = 0;
    this.angularVelocity = {
      x: 0,
      y: 0,
      z: 0
    };
    this.angularAcceleration = {
      x: 0,
      y: 0,
      z: 0
    };
    this.orbitalVelocity = 0;
    this.orbitalAcceleration = 0;
    this.worldAcceleration = {
      x: 0,
      y: 0,
      z: 0
    };
    this.brownianSpeed = 0;
    this.brownianScale = 0;
  }

  copy(src) {
    Object.defineProperties(this, Object.getOwnPropertyDescriptors(src)); // preserves getters
  }

}

const WHITE_TEXTURE = new DataTexture(new Uint8Array(3).fill(255), 1, 1, RGBFormat);
WHITE_TEXTURE.needsUpdate = true;
const textureLoader = new TextureLoader(); // from threejs

const shaderIDs = {
  MeshDepthMaterial: "depth",
  MeshDistanceMaterial: "distanceRGBA",
  MeshNormalMaterial: "normal",
  MeshBasicMaterial: "basic",
  MeshLambertMaterial: "lambert",
  MeshPhongMaterial: "phong",
  MeshToonMaterial: "toon",
  MeshStandardMaterial: "physical",
  MeshPhysicalMaterial: "physical",
  MeshMatcapMaterial: "matcap",
  LineBasicMaterial: "basic",
  LineDashedMaterial: "dashed",
  PointsMaterial: "points",
  ShadowMaterial: "shadow",
  SpriteMaterial: "sprite"
};
function createParticleMesh(options) {
  const config = {
    particleCount: 1000,
    texture: "",
    textureFrame: {
      cols: 1,
      rows: 1
    },
    style: "particle",
    mesh: null,
    particleSize: 10,
    transparent: false,
    alphaTest: 0,
    depthWrite: true,
    depthTest: true,
    blending: NormalBlending,
    fog: false,
    usePerspective: true,
    useLinearMotion: true,
    useOrbitalMotion: true,
    useAngularMotion: true,
    useRadialMotion: true,
    useWorldMotion: true,
    useBrownianMotion: false,
    useVelocityScale: false,
    useFramesOrOrientation: true
  };
  Object.defineProperties(config, Object.getOwnPropertyDescriptors(options)); // preserves getters

  const isMesh = config.style === "mesh";
  const geometry = isMesh ? new InstancedBufferGeometry().copy(config.mesh.geometry) : new BufferGeometry();
  updateGeometry(geometry, config);
  let shaderID = "points";

  if (isMesh) {
    shaderID = shaderIDs[config.mesh.material.type] || "physical";
  }

  const shader = ShaderLib[shaderID];
  const uniforms = UniformsUtils.merge([shader.uniforms, {
    time: {
      value: 0
    },
    textureAtlas: {
      value: new Float32Array(2)
    }
  }]); // custom uniforms can only be used on ShaderMaterial and RawShaderMaterial

  const material = new ShaderMaterial({
    uniforms,
    vertexShader: shader.vertexShader,
    fragmentShader: shader.fragmentShader,
    defines: {},
    extensions: {
      derivatives: shaderID === "physical" // I don't know who should set this!!

    },
    lights: isMesh // lights are automatically setup for various materials, but must be manually setup for ShaderMaterial

  });
  injectParticleShaderCode(material);
  updateMaterial(material, config);
  let particleMesh;

  if (isMesh) {
    particleMesh = new Mesh(geometry, material);
    material["originalMaterial"] = config.mesh.material;
  } else {
    particleMesh = new Points(geometry, material);
  }

  particleMesh.frustumCulled = false;
  particleMesh.userData = {
    nextIndex: 0,
    meshConfig: config
  };
  return particleMesh;
}
function updateGeometry(geometry, config) {
  const particleCount = config.particleCount;
  const NUM_KEYFRAMES = 3;
  const offsets = new Float32Array(particleCount * 3);
  const row1s = new Float32Array(particleCount * 4);
  const row2s = new Float32Array(particleCount * 4);
  const row3s = new Float32Array(particleCount * 4);
  const scales = new Float32Array(particleCount * NUM_KEYFRAMES); // scales over time (0 scale implies hidden)

  const orientations = new Float32Array(particleCount * (NUM_KEYFRAMES + 1)); // orientation over time + screen up

  const colors = new Float32Array(particleCount * (NUM_KEYFRAMES + 1)); // colors over time (rgb is packed into a single float) + frameInfo part 1

  const opacities = new Float32Array(particleCount * (NUM_KEYFRAMES + 1)).fill(1); // opacities over time + frameInfo part 2

  const timings = new Float32Array(particleCount * 4);
  const isInstancedBufferGeometry = geometry instanceof InstancedBufferGeometry;
  const bufferFn = isInstancedBufferGeometry ? InstancedBufferAttribute : Float32BufferAttribute;

  if (!isInstancedBufferGeometry) {
    // this.renderBufferDirect() in threejs assumes an attribute called *position* exists and uses the attribute's *count* to
    // determine the number of particles to draw!
    geometry.setAttribute("position", new Float32BufferAttribute(new Float32Array(particleCount * 3), 3));
  }

  geometry.setAttribute("row1", new bufferFn(row1s, row1s.length / particleCount));
  geometry.setAttribute("row2", new bufferFn(row2s, row2s.length / particleCount));
  geometry.setAttribute("row3", new bufferFn(row3s, row3s.length / particleCount));
  geometry.setAttribute("offset", new bufferFn(offsets, offsets.length / particleCount));
  geometry.setAttribute("scales", new bufferFn(scales, scales.length / particleCount));
  geometry.setAttribute("orientations", new bufferFn(orientations, orientations.length / particleCount));
  geometry.setAttribute("colors", new bufferFn(colors, colors.length / particleCount));
  geometry.setAttribute("opacities", new bufferFn(opacities, opacities.length / particleCount));
  geometry.setAttribute("timings", new bufferFn(timings, timings.length / particleCount));

  if (config.useLinearMotion || config.useRadialMotion) {
    const velocities = new Float32Array(particleCount * 4); // linearVelocity (xyz) + radialVelocity (w)

    const accelerations = new Float32Array(particleCount * 4); // linearAcceleration (xyz) + radialAcceleration (w)

    geometry.setAttribute("velocity", new bufferFn(velocities, velocities.length / particleCount));
    geometry.setAttribute("acceleration", new bufferFn(accelerations, accelerations.length / particleCount));
  }

  if (config.useAngularMotion || config.useOrbitalMotion) {
    const angularVelocities = new Float32Array(particleCount * 4); // angularVelocity (xyz) + orbitalVelocity (w)

    const angularAccelerations = new Float32Array(particleCount * 4); // angularAcceleration (xyz) + orbitalAcceleration (w)

    geometry.setAttribute("angularvelocity", new bufferFn(angularVelocities, angularVelocities.length / particleCount));
    geometry.setAttribute("angularacceleration", new bufferFn(angularAccelerations, angularAccelerations.length / particleCount));
  }

  if (config.useWorldMotion || config.useBrownianMotion) {
    const worldAccelerations = new Float32Array(particleCount * 4); // worldAcceleration (xyz) + brownian (w)

    geometry.setAttribute("worldacceleration", new bufferFn(worldAccelerations, worldAccelerations.length / particleCount));
  }

  if (config.useVelocityScale) {
    const velocityScales = new Float32Array(particleCount * 3); // velocityScale (x), velocityScaleMin (y), velocityScaleMax (z)

    geometry.setAttribute("velocityscale", new bufferFn(velocityScales, velocityScales.length / particleCount));
  }

  if ("maxInstancedCount" in geometry) {
    geometry.maxInstancedCount = particleCount;
  }

  const identity = new Matrix4();

  for (let i = 0; i < particleCount; i++) {
    setMatrixAt(geometry, i, identity);
  }
}
function updateMaterial(material, config) {
  updateOriginalMaterialUniforms(material);
  material.uniforms.textureAtlas.value[0] = 0; // 0,0 unpacked uvs

  material.uniforms.textureAtlas.value[1] = 0.50012207031; // 1.,1. unpacked uvs

  material.transparent = config.transparent;
  material.blending = config.blending;
  material.fog = config.fog;
  material.depthWrite = config.depthWrite;
  material.depthTest = config.depthTest;
  const style = config.style.toLowerCase();
  const defines = material.defines;
  if (config.useAngularMotion) defines.USE_ANGULAR_MOTION = true;
  if (config.useRadialMotion) defines.USE_RADIAL_MOTION = true;
  if (config.useOrbitalMotion) defines.USE_ORBITAL_MOTION = true;
  if (config.useLinearMotion) defines.USE_LINEAR_MOTION = true;
  if (config.useWorldMotion) defines.USE_WORLD_MOTION = true;
  if (config.useBrownianMotion) defines.USE_BROWNIAN_MOTION = true;
  if (config.fog) defines.USE_FOG = true;
  if (config.alphaTest) defines.ALPHATEST = config.alphaTest;
  if (style === "ribbon") defines.USE_RIBBON = true;
  if (style === "mesh") defines.USE_MESH = true;
  defines.ATLAS_SIZE = 1;

  if (style !== "mesh") {
    if (config.useVelocityScale) defines.USE_VELOCITY_SCALE = true;
    if (config.useFramesOrOrientation) defines.USE_FRAMES_OR_ORIENTATION = true;
    if (config.usePerspective) defines.USE_SIZEATTENUATION = true;
    material.uniforms.size.value = config.particleSize;
    material.uniforms.map.value = WHITE_TEXTURE;
    material.map = WHITE_TEXTURE; // WARNING textures don't appear unless this is set to something

    if (config.texture) {
      if (config.texture instanceof Texture) {
        material.uniforms.map.value = config.texture;
      } else {
        textureLoader.load(config.texture, texture => {
          material.uniforms.map.value = texture;
        }, undefined, err => console.error(err));
      }
    }
  }

  Object.assign(material.defines, defines);
  material.needsUpdate = true;
}
function updateOriginalMaterialUniforms(material) {
  if (material.originalMaterial) {
    for (const k in material.uniforms) {
      if (k in material) {
        material.uniforms[k].value = material.originalMaterial[k];
      }
    }
  }
}
function setMaterialTime(material, time) {
  material.uniforms.time.value = time;
}
function loadTexturePackerJSON(mesh, config, startIndex, endIndex) {
  const jsonFilename = mesh.userData.meshConfig.texture.replace(/\.[^\.]+$/, ".json");
  fetch(jsonFilename).then(response => {
    return response.json();
  }).then(atlasJSON => {
    setTextureAtlas(mesh.material, atlasJSON);

    if (typeof config.atlas === "string") {
      const atlasIndex = Array.isArray(atlasJSON.frames) ? atlasJSON.frames.findIndex(frame => frame.filename === config.atlas) : Object.keys(atlasJSON.frames).findIndex(filename => filename === config.atlas);

      if (atlasIndex < 0) {
        console.error(`unable to find atlas entry '${config.atlas}'`);
      }

      for (let i = startIndex; i < endIndex; i++) {
        setAtlasIndexAt(mesh.geometry, i, atlasIndex);
      }

      needsUpdate(mesh.geometry, ["colors", "opacities"]);
    }
  });
}

function packUVs(u, v) {
  // bring u,v into the range (0,0.5) then pack into 12 bits each
  // uvs have a maximum resolution of 1/2048
  // return value must be in the range (0,1]
  return ~~(u * 2048) / 4096 + ~~(v * 2048) / 16777216; // 2x12 bits = 24 bits
}

function setTextureAtlas(material, atlasJSON) {
  if (!atlasJSON) {
    return;
  }

  const parts = Array.isArray(atlasJSON.frames) ? atlasJSON.frames : Object.values(atlasJSON.frames);
  const imageSize = atlasJSON.meta.size;
  const PARTS_PER_TEXTURE = 2;
  const packedTextureAtlas = new Float32Array(PARTS_PER_TEXTURE * parts.length);

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const j = i * PARTS_PER_TEXTURE;
    const frame = part.frame;
    packedTextureAtlas[j] = packUVs(frame.x / imageSize.w, frame.y / imageSize.h);
    packedTextureAtlas[j + 1] = packUVs(frame.w / imageSize.w, frame.h / imageSize.h);
  }

  material.uniforms.textureAtlas.value = packedTextureAtlas;
  material.defines.ATLAS_SIZE = parts.length;
  material.needsUpdate = true;
}
function setMatrixAt(geometry, i, mat4) {
  const m = mat4.elements;
  const row1 = geometry.getAttribute("row1");
  const row2 = geometry.getAttribute("row2");
  const row3 = geometry.getAttribute("row3");
  row1.setXYZW(i, m[0], m[4], m[8], m[12]);
  row2.setXYZW(i, m[1], m[5], m[9], m[13]);
  row3.setXYZW(i, m[2], m[6], m[10], m[14]);
}
function setOffsetAt(geometry, i, x, y, z) {
  const offset = geometry.getAttribute("offset");

  if (Array.isArray(x)) {
    z = x[2];
    y = x[1];
    x = x[0];
  } else if (typeof x === "object") {
    z = x.z;
    y = x.y;
    x = x.x;
  }

  offset.setXYZ(i, x, y, z);
}

function packRGB(r, g, b) {
  return ~~(r * 255) / 256 + ~~(g * 255) / 65536 + ~~(b * 255) / 16777216; // 3x8 bits = 24 bits
}

function setColorsAt(geometry, i, colorArray) {
  const colors = geometry.getAttribute("colors");
  const color0 = colorArray[0];
  const color1 = colorArray[1];
  const color2 = colorArray[2];
  let packedR, packedG, packedB;

  switch (colorArray.length) {
    case 0:
      packedR = packedG = packedB = packRGB(1, 1, 1); // white

      break;

    case 1:
      packedR = packRGB(color0.r, color0.r, color0.r);
      packedG = packRGB(color0.g, color0.g, color0.g);
      packedB = packRGB(color0.b, color0.b, color0.b);
      break;

    case 2:
      packedR = packRGB(color0.r, 0.5 * (color0.r + color1.r), color1.r);
      packedG = packRGB(color0.g, 0.5 * (color0.g + color1.g), color1.g);
      packedB = packRGB(color0.b, 0.5 * (color0.b + color1.b), color1.b);
      break;

    default:
      packedR = packRGB(color0.r, color1.r, color2.r);
      packedG = packRGB(color0.g, color1.g, color2.g);
      packedB = packRGB(color0.b, color1.b, color2.b);
      break;
  }

  colors.setXYZ(i, packedR, packedG, packedB);
}
function setOpacitiesAt(geometry, i, opacityArray) {
  const opacities = geometry.getAttribute("opacities");
  setKeyframesAt(opacities, i, opacityArray, 1);
}
function setTimingsAt(geometry, i, spawnTime, lifeTime, repeatTime, seed = Math.random()) {
  const timings = geometry.getAttribute("timings");
  timings.setXYZW(i, spawnTime, lifeTime, repeatTime, seed);
}
function setFrameAt(geometry, i, atlasIndex, frameStyle, startFrame, endFrame, cols, rows) {
  const colors = geometry.getAttribute("colors");
  const opacities = geometry.getAttribute("opacities");
  const packA = ~~cols + ~~rows / 64 + ~~startFrame / 262144;
  const packB = frameStyle + Math.max(0, atlasIndex) / 64 + ~~endFrame / 262144;
  colors.setW(i, packA);
  opacities.setW(i, packB);
}
function setAtlasIndexAt(geometry, i, atlasIndex) {
  const opacities = geometry.getAttribute("opacities");
  const packB = opacities.getW(i);
  opacities.setW(i, Math.floor(packB) + Math.max(0, atlasIndex) / 64 + packB * 262144 % 4096 / 262144);
}
function setScalesAt(geometry, i, scaleArray) {
  const scales = geometry.getAttribute("scales");
  setKeyframesAt(scales, i, scaleArray, 1);
}
function setOrientationsAt(geometry, i, orientationArray, worldUp = 0) {
  const orientations = geometry.getAttribute("orientations");
  setKeyframesAt(orientations, i, orientationArray, 0);
  orientations.setW(i, worldUp);
}
function setVelocityAt(geometry, i, x, y, z, radial = 0) {
  const velocity = geometry.getAttribute("velocity");

  if (velocity) {
    velocity.setXYZW(i, x, y, z, radial);
  }
}
function setAccelerationAt(geometry, i, x, y, z, radial = 0) {
  const acceleration = geometry.getAttribute("acceleration");

  if (acceleration) {
    acceleration.setXYZW(i, x, y, z, radial);
  }
}
function setAngularVelocityAt(geometry, i, x, y, z, orbital = 0) {
  const angularvelocity = geometry.getAttribute("angularvelocity");

  if (angularvelocity) {
    angularvelocity.setXYZW(i, x, y, z, orbital);
  }
}
function setAngularAccelerationAt(geometry, i, x, y, z, orbital = 0) {
  const angularacceleration = geometry.getAttribute("angularacceleration");

  if (angularacceleration) {
    angularacceleration.setXYZW(i, x, y, z, orbital);
  }
}
function setWorldAccelerationAt(geometry, i, x, y, z) {
  const worldacceleration = geometry.getAttribute("worldacceleration");

  if (worldacceleration) {
    worldacceleration.setXYZ(i, x, y, z);
  }
}

function packBrownain(speed, scale) {
  return ~~(speed * 64) / 4096 + ~~(scale * 64) / 16777216;
}

function setBrownianAt(geometry, i, brownianSpeed, brownianScale) {
  console.assert(brownianSpeed >= 0 && brownianSpeed < 64);
  console.assert(brownianScale >= 0 && brownianScale < 64);
  const worldacceleration = geometry.getAttribute("worldacceleration");

  if (worldacceleration) {
    worldacceleration.setW(i, packBrownain(brownianSpeed, brownianScale));
  }
}
function setVelocityScaleAt(geometry, i, velocityScale, velocityMin, velocityMax) {
  const vs = geometry.getAttribute("velocityscale");

  if (vs) {
    vs.setXYZ(i, velocityScale, velocityMin, velocityMax);
  }
}
function setKeyframesAt(attribute, i, valueArray, defaultValue) {
  const x = valueArray[0],
        y = valueArray[1],
        z = valueArray[2];

  switch (valueArray.length) {
    case 0:
      attribute.setXYZ(i, defaultValue, defaultValue, defaultValue);
      break;

    case 1:
      attribute.setXYZ(i, x, x, x);
      break;

    case 2:
      attribute.setXYZ(i, x, 0.5 * (x + y), y);
      break;

    default:
      attribute.setXYZ(i, x, y, z);
      break;
  }
}
function needsUpdate(geometry, attrs) {
  attrs = attrs || ["row1", "row2", "row3", "offset", "scales", "colors", "opacities", "orientations", "timings", "velocity", "acceleration", "worldacceleration", "velocityscale"];
  if (attrs) for (const attr of attrs) {
    const attribute = geometry.getAttribute(attr);

    if (attribute) {
      attribute.needsUpdate = true;
    }
  }
} // eulerToQuaternion() from https://github.com/mrdoob/three.js/blob/master/src/math/Quaternion.js
// axisAngleToQuaternion() from http://www.euclideanspace.com/maths/geometry/orientations/conversions/angleToQuaternion/index.htm
// fbm3() from https://github.com/yiwenl/glsl-fbm
// instead of rand3() should we generate a random point on a sphere?

function injectParticleShaderCode(material) {
  material.vertexShader = material.vertexShader.replace("void main()", `
attribute vec4 row1;
attribute vec4 row2;
attribute vec4 row3;
attribute vec3 offset;
attribute vec3 scales;
attribute vec4 orientations;
attribute vec4 colors;
attribute vec4 opacities;
attribute vec4 timings;

#if defined(USE_LINEAR_MOTION) || defined(USE_RADIAL_MOTION)
attribute vec4 velocity;
attribute vec4 acceleration;
#endif

#if defined(USE_ANGULAR_MOTION) || defined(USE_ORBITAL_MOTION)
attribute vec4 angularvelocity;
attribute vec4 angularacceleration;
#endif

#if defined(USE_WORLD_MOTION) || defined(USE_BROWNIAN_MOTION)
attribute vec4 worldacceleration;
#endif

#if defined(USE_VELOCITY_SCALE)
attribute vec4 velocityscale;
#endif

uniform float time;
uniform vec2 textureAtlas[ATLAS_SIZE];

varying mat3 vUvTransform;
varying vec4 vParticleColor;

vec3 rand3( vec2 co )
{
  float v0 = rand(co);
  float v1 = rand(vec2(co.y, v0));
  float v2 = rand(vec2(co.x, v1));
  return vec3(v0, v1, v2);
}

#if defined(USE_BROWNIAN_MOTION)
#define NUM_OCTAVES 5

float mod289(float x){return x - floor(x * (1.0 / 289.0)) * 289.0;}
vec4 mod289(vec4 x){return x - floor(x * (1.0 / 289.0)) * 289.0;}
vec4 perm(vec4 x){return mod289(((x * 34.0) + 1.0) * x);}

float noise3(vec3 p)
{
  vec3 a = floor(p);
  vec3 d = p - a;
  d = d * d * (3.0 - 2.0 * d);

  vec4 b = a.xxyy + vec4(0.0, 1.0, 0.0, 1.0);
  vec4 k1 = perm(b.xyxy);
  vec4 k2 = perm(k1.xyxy + b.zzww);

  vec4 c = k2 + a.zzzz;
  vec4 k3 = perm(c);
  vec4 k4 = perm(c + 1.0);

  vec4 o1 = fract(k3 * (1.0 / 41.0));
  vec4 o2 = fract(k4 * (1.0 / 41.0));

  vec4 o3 = o2 * d.z + o1 * (1.0 - d.z);
  vec2 o4 = o3.yw * d.x + o3.xz * (1.0 - d.x);

  return o4.y * d.y + o4.x * (1.0 - d.y);
}

float fbm3(vec3 x)
{
  float v = 0.0;
  float a = 0.5;
  vec3 shift = vec3(100);
  for (int i = 0; i < NUM_OCTAVES; ++i) {
    v += a * noise3(x);
    x = x * 2.0 + shift;
    a *= 0.5;
  }
  return v;
}
#endif // USE_BROWNIAN_MOTION

vec3 unpackFrame( float pack )
{
  float y = fract( pack ) * 64.;
  return floor( vec3( pack, y, fract( y ) * 4096. ) );
}

vec2 unpackUVs( float pack )
{
  float x = pack * 4096.;
  return floor( vec2( x, fract( x ) * 4096. ) ) / 2048.;
}

vec3 unpackRGB( float pack )
{
  vec3 enc = fract( pack * vec3( 1., 256., 65536. ) );
  enc -= enc.yzz * vec3( 1./256., 1./256., 0. );
  return enc;
}

vec2 unpackBrownian( float pack ) {
  float a = pack*4096.;
  return floor( vec2( a, fract( a )*4096. ) ) / 64.;
}

float interpolate( const vec3 keys, const float r )
{
  float k = r*2.;
  return k < 1. ? mix( keys.x, keys.y, k ) : mix( keys.y, keys.z, k - 1. );
}

// assumes euler order is YXZ
vec4 eulerToQuaternion( const vec3 euler )
{
  vec3 c = cos( euler * .5 );
  vec3 s = sin( euler * .5 );

  return vec4(
    s.x * c.y * c.z + c.x * s.y * s.z,
    c.x * s.y * c.z - s.x * c.y * s.z,
    c.x * c.y * s.z - s.x * s.y * c.z,
    c.x * c.y * c.z + s.x * s.y * s.z
  );
}

vec4 axisAngleToQuaternion( const vec3 axis, const float angle ) 
{
  return vec4( axis * sin( angle*.5 ), cos( angle*.5 ) );
}

vec3 applyQuaternion( const vec3 v, const vec4 q )
{
  return v + 2. * cross( q.xyz, cross( q.xyz, v ) + q.w * v );
}

vec4 calcGlobalMotion( const mat4 particleMatrix, float distance, vec3 direction, const float age, const float spawnTime, const vec2 brownian, const vec3 orbitalAxis )
{
#if defined(USE_RADIAL_MOTION)
  distance += ( .5 * acceleration.w * age + velocity.w ) * age;
#endif

#if defined(USE_ANGULAR_MOTION)
  if ( length( angularacceleration.xyz ) > 0. || length( angularvelocity.xyz ) > 0. )
  {
    vec3 angularMotion = ( .5 * angularacceleration.xyz * age + angularvelocity.xyz ) * age;
    direction = applyQuaternion( direction, eulerToQuaternion( angularMotion ) );
  }
#endif

#if defined(USE_ORBITAL_MOTION)
  if ( angularacceleration.w != 0. || angularvelocity.w != 0. ) 
  {
    float orbitalMotion = ( .5 * angularacceleration.w * age + angularvelocity.w ) * age;

    vec3 axis = normalize( cross( direction, orbitalAxis ) );
    direction = applyQuaternion( direction, axisAngleToQuaternion( axis, orbitalMotion ) );
  }
#endif

  vec3 localMotion = direction * distance;

#if defined(USE_LINEAR_MOTION)
  localMotion += ( .5 * acceleration.xyz * age + velocity.xyz ) * age;
#endif

  vec4 globalMotion = particleMatrix * vec4( localMotion, 1. );

#if defined(USE_WORLD_MOTION)
  globalMotion.xyz += .5 * worldacceleration.xyz * age * age;
#endif

#if defined(USE_BROWNIAN_MOTION)
  float r = age*brownian.x;
  float nx = fbm3( globalMotion.xyz - rand( vec2(localMotion.x, spawnTime) )*r ) - .5;
  float ny = fbm3( globalMotion.yzx + rand( vec2(localMotion.y, spawnTime) )*r ) - .5;
  float nz = fbm3( globalMotion.zxy - rand( vec2(localMotion.z, spawnTime) )*r ) - .5;
  globalMotion.xyz += vec3(nx, ny, nz)*brownian.y;
#endif

  return globalMotion;
}

void main()`);
  material.vertexShader = material.vertexShader.replace("#include <project_vertex>", `

vec4 globalMotion = vec4(0.);

float spawnTime = timings.x;
float lifeTime = timings.y;
float repeatTime = timings.z;
float age = mod( time - spawnTime, max( repeatTime, lifeTime ) );
float timeRatio = age / lifeTime;
float particleScale = interpolate( scales, timeRatio );

{
  float seed = timings.w;

  float particleOpacity = interpolate( opacities.xyz, timeRatio );
  vec3 particleColor = vec3(
    interpolate( unpackRGB( colors.x ), timeRatio ),
    interpolate( unpackRGB( colors.y ), timeRatio ),
    interpolate( unpackRGB( colors.z ), timeRatio )
  );

  mat4 particleMatrix = mat4(
    vec4( row1.x, row2.x, row3.x, 0. ),
    vec4( row1.y, row2.y, row3.y, 0. ),
    vec4( row1.z, row2.z, row3.z, 0. ),
    vec4( row1.w, row2.w, row3.w, 1. )
  );

  float distance = length( offset );
  vec3 direction = distance == 0. ? normalize( rand3( vec2(spawnTime, seed) )*2. - .5 ) : offset / distance;

#if defined(USE_BROWNIAN_MOTION)
  vec2 brownian = unpackBrownian(worldacceleration.w);
#else
  vec2 brownian = vec2(0.);
#endif

#if defined(USE_ORBITAL_MOTION)
  vec3 orbitalAxis = normalize( rand3( vec2(spawnTime, seed) )*2. - .5 );
#else
  vec3 orbitalAxis = vec3(0.);
#endif

  globalMotion = calcGlobalMotion( particleMatrix, distance, direction, age, spawnTime, brownian, orbitalAxis );
  vec4 screenPosition = projectionMatrix * modelViewMatrix * globalMotion;

  vParticleColor = vec4( particleColor, particleOpacity );
  vUvTransform = mat3( 1. );

#if defined(USE_FRAMES_OR_ORIENTATION) || defined(USE_VELOCITY_SCALE)

  float orientation = interpolate( orientations.xyz, timeRatio );

#if defined(USE_VELOCITY_SCALE)
  vec4 futureMotion = calcGlobalMotion( particleMatrix, distance, direction, age + .01, spawnTime, brownian, orbitalAxis );
  vec4 screenFuture = projectionMatrix * modelViewMatrix * futureMotion;
  vec2 delta = screenFuture.xy / screenFuture.z - screenPosition.xy / screenPosition.z;

  float lenDelta = length( delta );
  float velocityOrientation = atan( delta.x, delta.y );

  if (velocityscale.x > 0.) {
    orientation -= velocityOrientation;
    particleScale *= clamp(velocityscale.x*100.*lenDelta*screenFuture.z, velocityscale.y, velocityscale.z );
  }
#endif // USE_VELOCITY_SCALE

  vec4 upView = modelViewMatrix * vec4(0., 1., 0., 1.) - modelViewMatrix * vec4(0., 0., 0., 1.);
  float viewOrientation = atan( upView.x, upView.y );
  orientation -= viewOrientation * orientations.w;

  vec3 frameInfoA = unpackFrame( colors.w );
  vec3 frameInfoB = unpackFrame( opacities.w );

  float frameCols = frameInfoA.x;
  float frameRows = frameInfoA.y;
  float startFrame = frameInfoA.z;
  float endFrame = frameInfoB.z;

  int atlasIndex = int( frameInfoB.y );
  vec2 atlasUV = unpackUVs( textureAtlas[atlasIndex].x );
  vec2 atlasSize = unpackUVs( textureAtlas[atlasIndex].y );
  vec2 frameUV = atlasSize/frameInfoA.xy;

  float frameStyle = frameInfoB.x;
  float numFrames = endFrame - startFrame + 1.;
  float currentFrame = floor( mix( startFrame, endFrame + .99999, timeRatio ) );

  currentFrame = frameStyle == 0. ? currentFrame 
    : frameStyle == 1. ? ( floor( rand( vec2(currentFrame * 6311., seed) ) * numFrames ) + startFrame  )
    : ( floor( seed * numFrames ) + startFrame );

  float tx = mod( currentFrame, frameCols ) * frameUV.x + atlasUV.x;
  float ty = 1. - floor( currentFrame / frameCols ) * frameUV.y - atlasUV.y;
  float sx = frameUV.x;
  float sy = frameUV.y;
  float cx = .5 * sx;
  float cy = -.5 * sy;
  float c = cos( orientation );
  float s = sin( orientation );

  mat3 uvrot = mat3( vec3( c, -s, 0. ), vec3( s, c, 0. ), vec3( 0., 0., 1.) );
  mat3 uvtrans = mat3( vec3( 1., 0., 0. ), vec3( 0., 1., 0. ), vec3( tx + cx, ty + cy, 1. ) );
  mat3 uvscale = mat3( vec3( sx, 0., 0. ), vec3( 0., sy, 0. ), vec3( 0., 0., 1.) );
  mat3 uvcenter = mat3( vec3( 1., 0., 0. ), vec3( 0., 1., 0. ), vec3( -cx / sx, cy / sy, 1. ) );  

  vUvTransform = uvtrans * uvscale * uvrot * uvcenter;

#endif // USE_FRAMES_OR_ORIENTATION || VELOCITY_SCALE

}

#if defined(USE_RIBBON) || defined(USE_MESH)
  transformed = particleScale * transformed + globalMotion.xyz;
#else
  transformed += globalMotion.xyz;
#endif

#include <project_vertex>

if (particleScale <= 0. || timeRatio < 0. || timeRatio > 1. )
{
  gl_Position.w = -2.; // don't draw
}`); // style particles only

  material.vertexShader = material.vertexShader.replace("if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );", `
if ( isPerspective ) gl_PointSize *= ( scale * particleScale / -mvPosition.z );`);
  material.fragmentShader = material.fragmentShader.replace("void main()", `
varying mat3 vUvTransform;
varying vec4 vParticleColor;

void main()`); // style particles only

  material.fragmentShader = material.fragmentShader.replace("#include <map_particle_fragment>", `
#if defined( USE_MAP ) || defined( USE_ALPHAMAP )

	vec2 uv = ( uvTransform * vUvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;

#endif

#ifdef USE_MAP

	vec4 mapTexel = texture2D( map, uv );
  diffuseColor *= mapTexelToLinear( mapTexel );

#endif

#ifdef USE_ALPHAMAP

	diffuseColor.a *= texture2D( alphaMap, uv ).g;

#endif`); // style mesh or ribbon

  material.fragmentShader = material.fragmentShader.replace("#include <color_fragment>", `
diffuseColor *= vParticleColor;

#include <color_fragment>`);
}

const RND_BASIS = 0x100000000;
function createPseudoRandom(s) {
  let seed = s || Math.random() * RND_BASIS;
  return () => {
    seed = (1664525 * seed + 1013904223) % RND_BASIS;
    return seed / RND_BASIS;
  };
}
function randomNumber(min, max, rndFn = Math.random) {
  if (typeof min === 'undefined') return undefined;
  if (typeof max === 'undefined') return min;
  return rndFn() * (max - min) + min;
}
function randomObject(min, max, rndFn = Math.random) {
  if (!min) return {};
  if (!max) return min;
  const v = {};

  for (let k in min) {
    const typeofMin = typeof min[k];

    if (Array.isArray(min[k])) {
      v[k] = randomArray(min[k], max[k], rndFn);
    } else if (typeofMin === "object") {
      v[k] = randomObject(min[k], max[k], rndFn);
    } else if (typeofMin === "number") {
      v[k] = randomNumber(min[k], max[k], rndFn);
    } else {
      v[k] = min[k];
    }
  }

  return v;
}
function randomArray(min, max, rndFn = Math.random) {
  if (!min) return [];
  if (!max) return min;
  const n = min.length;
  const v = Array(n);

  for (let i = 0; i < n; i++) {
    const typeofMin = typeof min[i];

    if (Array.isArray(min[i])) {
      v[i] = randomArray(min[i], max[i], rndFn);
    } else if (typeofMin === "object") {
      v[i] = randomObject(min[i], max[i], rndFn);
    } else if (typeofMin === "number") {
      v[i] = randomNumber(min[i], max[i], rndFn);
    } else {
      v[i] = min[i];
    }
  }

  return v;
}
function randomize(min, max, rndFn = Math.random) {
  const typeofMin = typeof min;

  if (Array.isArray(min)) {
    return randomArray(min, max, rndFn);
  } else if (typeofMin === "object") {
    return randomObject(min, max, rndFn);
  } else if (typeofMin === "number") {
    return randomNumber(min, max, rndFn);
  } else {
    return min;
  }
}
const randomBoxOffset = (dx, dy, dz, rndFn = Math.random) => {
  return {
    x: (rndFn() - .5) * dx,
    y: (rndFn() - .5) * dy,
    z: (rndFn() - .5) * dz
  };
}; // https://mathworld.wolfram.com/SpherePointPicking.html
// https://mathworld.wolfram.com/SphericalCoordinates.html

const randomEllipsoidOffset = (rx, ry, rz, rndFn = Math.random) => {
  const theta = rndFn() * 2 * Math.PI;
  const phi = Math.acos(2 * rndFn() - 1);
  return {
    x: rx * Math.cos(theta) * Math.sin(phi),
    y: ry * Math.sin(theta) * Math.sin(phi),
    z: rz * Math.cos(phi)
  };
};
const randomSphereOffset = (r, rndFn) => randomEllipsoidOffset(r, r, r, rndFn);
const randomCubeOffset = (d, rndFn) => randomBoxOffset(d, d, d, rndFn);

const error = console.error;
const FRAME_STYLES = ["sequence", "randomsequence", "random"];
const DEG2RAD = MathUtils.DEG2RAD;
function createParticleEmitter(options, matrixWorld, time = 0) {
  const config = {
    particleMesh: null,
    enabled: true,
    count: -1,
    textureFrame: undefined,
    lifeTime: 1,
    repeatTime: 0,
    burst: 0,
    seed: undefined,
    worldUp: false,
    // per particle values
    atlas: 0,
    frames: [],
    colors: [{
      r: 1,
      g: 1,
      b: 1
    }],
    orientations: [0],
    scales: [1],
    opacities: [1],
    frameStyle: "sequence",
    offset: {
      x: 0,
      y: 0,
      z: 0
    },
    velocity: {
      x: 0,
      y: 0,
      z: 0
    },
    acceleration: {
      x: 0,
      y: 0,
      z: 0
    },
    radialVelocity: 0,
    radialAcceleration: 0,
    angularVelocity: {
      x: 0,
      y: 0,
      z: 0
    },
    angularAcceleration: {
      x: 0,
      y: 0,
      z: 0
    },
    orbitalVelocity: 0,
    orbitalAcceleration: 0,
    worldAcceleration: {
      x: 0,
      y: 0,
      z: 0
    },
    brownianSpeed: 0,
    brownianScale: 0,
    velocityScale: 0,
    velocityScaleMin: 0.1,
    velocityScaleMax: 1
  };
  Object.defineProperties(config, Object.getOwnPropertyDescriptors(options)); // preserves getters

  const mesh = config.particleMesh;
  const geometry = mesh.geometry;
  const startTime = time;
  const startIndex = mesh.userData.nextIndex;
  const meshParticleCount = mesh.userData.meshConfig.particleCount;
  const count = config.count;
  const burst = config.burst;
  const lifeTime = config.lifeTime;
  const seed = config.seed;
  const rndFn = createPseudoRandom(seed);
  const particleRepeatTime = config.repeatTime;
  let textureFrame = config.textureFrame;
  const effectRepeatTime = Math.max(particleRepeatTime, Array.isArray(lifeTime) ? Math.max(...lifeTime) : lifeTime);
  textureFrame = config.textureFrame ? config.textureFrame : mesh.userData.meshConfig.textureFrame;

  if (config.count > 0 && startIndex + config.count > meshParticleCount) {
    error(`run out of particles, increase the particleCount for this ThreeParticleMesh`);
  }

  const numParticles = count >= 0 ? count : meshParticleCount - mesh.userData.nextIndex;
  mesh.userData.nextIndex += numParticles;
  const endIndex = Math.min(meshParticleCount, startIndex + numParticles);
  const spawnDelta = effectRepeatTime / numParticles * (1 - burst); // const vertices = model3D && typeof config.offset === "function" && model3D.isMesh ? calcSpawnOffsetsFromGeometry(model3D.geometry) : undefined

  for (let i = startIndex; i < endIndex; i++) {
    const spawnTime = time + (i - startIndex) * spawnDelta;
    spawn(geometry, matrixWorld, config, i, spawnTime, lifeTime, particleRepeatTime, textureFrame, seed, rndFn);
  }

  needsUpdate(geometry);
  loadTexturePackerJSON(mesh, config, startIndex, endIndex);
  return {
    startTime,
    startIndex,
    endIndex,
    mesh
  };
}
function setEmitterTime(emitter, time) {
  setMaterialTime(emitter.mesh.material, time);
}
function setEmitterMatrixWorld(emitter, matrixWorld, time, deltaTime) {
  const geometry = emitter.mesh.geometry;
  const endIndex = emitter.endIndex;
  const startIndex = emitter.startIndex;
  const timings = geometry.getAttribute("timings");
  let isMoved = false;

  for (let i = startIndex; i < endIndex; i++) {
    const startTime = timings.getX(i);
    const lifeTime = timings.getY(i);
    const repeatTime = timings.getZ(i);
    const age = (time - startTime) % Math.max(repeatTime, lifeTime);

    if (age > 0 && age < deltaTime) {
      setMatrixAt(geometry, i, matrixWorld);
      isMoved = true;
    }
  }

  if (isMoved) {
    needsUpdate(geometry, ["row1", "row2", "row3"]);
  }
}

function spawn(geometry, matrixWorld, config, index, spawnTime, lifeTime, repeatTime, textureFrame, seed, rndFn) {
  const velocity = config.velocity;
  const acceleration = config.acceleration;
  const angularVelocity = config.angularVelocity;
  const angularAcceleration = config.angularAcceleration;
  const worldAcceleration = config.worldAcceleration;
  const particleLifeTime = Array.isArray(lifeTime) ? rndFn() * (lifeTime[1] - lifeTime[0]) + lifeTime[0] : lifeTime;
  const orientations = config.orientations.map(o => o * DEG2RAD);
  const frames = config.frames;
  const atlas = config.atlas;
  const startFrame = frames.length > 0 ? frames[0] : 0;
  const endFrame = frames.length > 1 ? frames[1] : frames.length > 0 ? frames[0] : textureFrame.cols * textureFrame.rows - 1;
  const frameStyleIndex = FRAME_STYLES.indexOf(config.frameStyle) >= 0 ? FRAME_STYLES.indexOf(config.frameStyle) : 0;
  const atlasIndex = typeof atlas === "number" ? atlas : 0;
  setMatrixAt(geometry, index, matrixWorld);
  setOffsetAt(geometry, index, config.offset);
  setScalesAt(geometry, index, config.scales);
  setColorsAt(geometry, index, config.colors);
  setOrientationsAt(geometry, index, orientations, config.worldUp ? 1 : 0);
  setOpacitiesAt(geometry, index, config.opacities);
  setFrameAt(geometry, index, atlasIndex, frameStyleIndex, startFrame, endFrame, textureFrame.cols, textureFrame.rows);
  setTimingsAt(geometry, index, spawnTime, particleLifeTime, repeatTime, config.seed);
  setVelocityAt(geometry, index, velocity.x, velocity.y, velocity.z, config.radialVelocity);
  setAccelerationAt(geometry, index, acceleration.x, acceleration.y, acceleration.z, config.radialAcceleration);
  setAngularVelocityAt(geometry, index, angularVelocity.x * DEG2RAD, angularVelocity.y * DEG2RAD, angularVelocity.z * DEG2RAD, config.orbitalVelocity * DEG2RAD);
  setAngularAccelerationAt(geometry, index, angularAcceleration.x * DEG2RAD, angularAcceleration.y * DEG2RAD, angularAcceleration.z * DEG2RAD, config.orbitalAcceleration * DEG2RAD);
  setWorldAccelerationAt(geometry, index, worldAcceleration.x, worldAcceleration.y, worldAcceleration.z);
  setBrownianAt(geometry, index, config.brownianSpeed, config.brownianScale);
  setVelocityScaleAt(geometry, index, config.velocityScale, config.velocityScaleMin, config.velocityScaleMax);
}

class ParticleSystem extends System {
  execute(deltaTime, time) {
    for (const entity of this.queries.emitters.added) {
      const emitter = entity.getComponent(ParticleEmitter);
      const object3D = entity.getComponent(Object3DComponent);
      const matrixWorld = calcMatrixWorld(entity);

      if (!emitter.useEntityRotation) {
        clearMatrixRotation(matrixWorld);
      }

      const emitter3D = createParticleEmitter(emitter, matrixWorld, time);
      entity.addComponent(ParticleEmitterState, {
        emitter3D,
        useEntityRotation: emitter.useEntityRotation,
        syncTransform: emitter.syncTransform
      });
    }

    for (const entity of this.queries.emitterStates.results) {
      const emitterState = entity.getComponent(ParticleEmitterState);

      if (emitterState.syncTransform) {
        const matrixWorld = calcMatrixWorld(entity);

        if (!emitterState.useEntityRotation) {
          clearMatrixRotation(matrixWorld);
        }

        setEmitterMatrixWorld(emitterState.emitter3D, matrixWorld, time, deltaTime);
      }

      setEmitterTime(emitterState.emitter3D, time);
    }
  }

}
ParticleSystem.queries = {
  emitters: {
    components: [ParticleEmitter],
    listen: {
      added: true,
      removed: true
    }
  },
  emitterStates: {
    components: [ParticleEmitterState]
  }
};

const clearMatrixRotation = function () {
  const translation = new Vector3();
  const quaternion = new Quaternion();
  const scale = new Vector3();
  const unitQuat = new Quaternion();
  return function clearMatrixRotation(matrix) {
    matrix.decompose(translation, quaternion, scale);
    return matrix.compose(translation, unitQuat, scale);
  };
}();

const calcMatrixWorld = function () {
  const scale = new Vector3();
  const quaternion = new Quaternion();
  const euler = new Euler();
  return function calcMatrixWorld(entity, childMatrix = undefined) {
    const object3D = entity.getComponent(Object3DComponent);
    const transform = entity.getComponent(Transform);

    if (object3D) {
      return childMatrix ? childMatrix.multiply(object3D["value"].matrixWorld) : object3D["value"].matrixWorld;
    } else if (transform) {
      const transformMatrix = new Matrix4();
      transformMatrix.compose(transform.position, quaternion.setFromEuler(euler.setFromVector3(transform.rotation)), scale.set(1, 1, 1));

      if (childMatrix) {
        transformMatrix.premultiply(childMatrix);
      }

      const parent = entity.getComponent(Parent);
      return parent ? calcMatrixWorld(parent["value"], transformMatrix) : transformMatrix;
    } else {
      return new Matrix4();
    }
  };
}();

class KeyframeSystem extends System {
  execute(deltaTime, time) {
    for (const entity of this.queries.keyframes.results) {
      const keyframe = entity.getComponent(Keyframe);
      const frameTime = time % keyframe.duration;

      for (const attr of keyframe.attributes) {// Do something
      }
    }
  }

}
KeyframeSystem.queries = {
  keyframes: {
    components: [Keyframe]
  }
};

const parseValue = (x, self, ...args) => typeof x === "function" ? x(self, ...args) : x;

function createKeyframes(options, startTime) {
  options = Object.assign({
    parts: {},
    duration: 1,
    direction: "forward",
    loopCount: -1
  }, options);
  const keyframes = {
    duration: parseValue(options.duration, options),
    loopCount: parseValue(options.loopCount, options),
    direction: parseValue(options.direction, options),
    options,
    startTime,
    currentLoop: -1
  };
  return keyframes;
}
function syncKeyframes(keyframes, time) {
  const elapsed = time - keyframes.startTime;
  const baseTime = elapsed % keyframes.duration;
  const numLoops = Math.floor(elapsed / keyframes.duration);

  if (keyframes.loopCount < 0 || numLoops < keyframes.loopCount) {
    if (keyframes.currentLoop !== numLoops) {
      keyframes.currentLoop = numLoops;
      keyframes.frames = generateFrames(null, keyframes);
    }
  }
}

function generateFrames(object, keyframes) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  for (const part of keyframes.options.parts) {
    console.log("nothing here yet");
  }
}

const CustomTypes = {};
const FunctionType = createType({
  baseType: Function,
  isSimpleType: true,
  create: defaultValue => {
    return typeof defaultValue === "function" ? defaultValue : undefined;
  },
  reset: (src, key, defaultValue) => {
    src[key] = typeof defaultValue === "function" ? defaultValue : undefined;
  },
  clear: (src, key) => {
    src[key] = undefined;
  }
});
const VecXY = createType({
  baseType: Object,
  create: defaultValue => {
    return typeof defaultValue === "object" ? Object.assign({}, defaultValue) : {
      x: 0,
      y: 0
    };
  },
  reset: (src, key, defaultValue) => {
    src[key] = typeof defaultValue === "object" ? defaultValue : {
      x: 0,
      y: 0
    };
  },
  clear: (src, key) => {
    src[key] = {
      x: 0,
      y: 0
    };
  },
  copy: (src, dst, key) => {
    src[key].x = dst[key].x;
    src[key].y = dst[key].y;
  }
});
const VecXYZ = createType({
  baseType: Object,
  create: defaultValue => {
    return typeof defaultValue === "object" ? Object.assign({}, defaultValue) : {
      x: 0,
      y: 0,
      z: 0
    };
  },
  reset: (src, key, defaultValue) => {
    src[key] = typeof defaultValue === "object" ? defaultValue : {
      x: 0,
      y: 0,
      z: 0
    };
  },
  clear: (src, key) => {
    src[key] = {
      x: 0,
      y: 0,
      z: 0
    };
  },
  copy: (src, dst, key) => {
    src[key].x = dst[key].x;
    src[key].y = dst[key].y;
    src[key].z = dst[key].z;
  }
});
const RGB = createType({
  baseType: Array,
  create: defaultValue => {
    return typeof defaultValue === "object" ? Object.assign({}, defaultValue) : {
      r: 1,
      g: 1,
      b: 1
    };
  },
  reset: (src, key, defaultValue) => {
    src[key] = typeof defaultValue === "object" ? defaultValue : {
      r: 1,
      g: 1,
      b: 1
    };
  },
  clear: (src, key) => {
    src[key] = {
      r: 1,
      g: 1,
      b: 1
    };
  },
  copy: (src, dst, key) => {
    src[key].r = dst[key].r;
    src[key].g = dst[key].g;
    src[key].b = dst[key].b;
  }
});
const Pointer = createType({
  baseType: Object,
  create: defaultValue => {
    return typeof defaultValue === "object" ? defaultValue : undefined;
  },
  reset: (src, key, defaultValue) => {
    src[key] = typeof defaultValue === "object" ? defaultValue : undefined;
  },
  clear: (src, key) => {
    src[key] = undefined;
  },
  copy: (src, dst, key) => {
    src[key] = dst[key];
  }
});

const isBrowser = typeof window !== "undefined" && typeof window.document !== "undefined";

const DEFAULT_OPTIONS = {
  mouse: true,
  keyboard: true,
  touchscreen: true,
  gamepad: true,
  debug: false
};
function initializeParticleSystem(world, options = DEFAULT_OPTIONS) {
  if (options.debug) console.log("Initializing particle system...");
  if (!isBrowser) return console.error("Couldn't initialize particles, are you in a browser?");
  if (window && options.debug) window.DEBUG_INPUT = true;

  if (options.debug) {
    console.log("Registering particle system with the following options:");
    console.log(options);
  } // TODO: Do stuff here


  if (options.debug) console.log("INPUT: Registered particle system.");
}

export { CustomTypes, FunctionType, Keyframe, KeyframeSystem, ParticleEmitter, ParticleEmitterState, ParticleSystem, Pointer, RGB, VecXY, VecXYZ, createKeyframes, createParticleEmitter, createParticleMesh, createPseudoRandom, initializeParticleSystem, isBrowser, loadTexturePackerJSON, needsUpdate, randomArray, randomBoxOffset, randomCubeOffset, randomEllipsoidOffset, randomNumber, randomObject, randomSphereOffset, randomize, setAccelerationAt, setAngularAccelerationAt, setAngularVelocityAt, setAtlasIndexAt, setBrownianAt, setColorsAt, setEmitterMatrixWorld, setEmitterTime, setFrameAt, setKeyframesAt, setMaterialTime, setMatrixAt, setOffsetAt, setOpacitiesAt, setOrientationsAt, setScalesAt, setTextureAtlas, setTimingsAt, setVelocityAt, setVelocityScaleAt, setWorldAccelerationAt, syncKeyframes, updateGeometry, updateMaterial, updateOriginalMaterialUniforms };
