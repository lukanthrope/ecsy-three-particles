# ecsy-three-particles
A particle system for ECSY and three.js in Typescript, inspired by / heavily copied from https://github.com/harlyq

# Installation
```
npm install ecsy-three-particles
```

# How to use
```javascript
import { World } from 'ecsy'
import { initializeInputSystems } from 'ecsy-three-particles'

const world = new World()

const options = {
  vr: true,
  ar: false,
  mouse: true,
  keyboard: true,
  touchscreen: false,
  gamepad: true,
  debug: true

initializeInputSystems(world, options)

world.execute()
```
