import { createType } from "ecsy"
export const CustomTypes = {}

export const FunctionType = createType({
  baseType: Function,
  isSimpleType: true,
  create: defaultValue => {
    return typeof defaultValue === "function" ? defaultValue : undefined
  },
  reset: (src, key, defaultValue) => {
    src[key] = typeof defaultValue === "function" ? defaultValue : undefined
  },
  clear: (src, key) => {
    src[key] = undefined
  }
})

export const VecXY = createType({
  baseType: Object,
  create: defaultValue => {
    return typeof defaultValue === "object"
      ? { ...defaultValue }
      : { x: 0, y: 0 }
  },
  reset: (src, key, defaultValue) => {
    src[key] = typeof defaultValue === "object" ? defaultValue : { x: 0, y: 0 }
  },
  clear: (src, key) => {
    src[key] = { x: 0, y: 0 }
  },
  copy: (src, dst, key) => {
    src[key].x = dst[key].x
    src[key].y = dst[key].y
  }
})

export const VecXYZ = createType({
  baseType: Object,
  create: defaultValue => {
    return typeof defaultValue === "object"
      ? { ...defaultValue }
      : { x: 0, y: 0, z: 0 }
  },
  reset: (src, key, defaultValue) => {
    src[key] =
      typeof defaultValue === "object" ? defaultValue : { x: 0, y: 0, z: 0 }
  },
  clear: (src, key) => {
    src[key] = { x: 0, y: 0, z: 0 }
  },
  copy: (src, dst, key) => {
    src[key].x = dst[key].x
    src[key].y = dst[key].y
    src[key].z = dst[key].z
  }
})

export const RGB = createType({
  baseType: Array,
  create: defaultValue => {
    return typeof defaultValue === "object"
      ? { ...defaultValue }
      : { r: 1, g: 1, b: 1 }
  },
  reset: (src, key, defaultValue) => {
    src[key] =
      typeof defaultValue === "object" ? defaultValue : { r: 1, g: 1, b: 1 }
  },
  clear: (src, key) => {
    src[key] = { r: 1, g: 1, b: 1 }
  },
  copy: (src, dst, key) => {
    src[key].r = dst[key].r
    src[key].g = dst[key].g
    src[key].b = dst[key].b
  }
})

export const Pointer = createType({
  baseType: Object,
  create: defaultValue => {
    return typeof defaultValue === "object" ? defaultValue : undefined
  },
  reset: (src, key, defaultValue) => {
    src[key] = typeof defaultValue === "object" ? defaultValue : undefined
  },
  clear: (src, key) => {
    src[key] = undefined
  },
  copy: (src, dst, key) => {
    src[key] = dst[key]
  }
})
