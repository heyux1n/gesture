export const action = {
  Down: 'down',
  Move: 'move',
  Up: 'up',
}

export class Pointer {
  constructor(pointerId, pointerType, x, y, timestamp) {
    this.pointerId = pointerId
    this.pointerType = pointerType
    this.x = x
    this.y = y
    this.timestamp = timestamp
  }
}

export class Matrix3x2 {
  constructor(m11, m12, m21, m22, m31, m32) {
    this.m11 = m11
    this.m12 = m12
    this.m21 = m21
    this.m22 = m22
    this.m31 = m31
    this.m32 = m32
  }

  static get Identity() {
    return new Matrix3x2(1, 0, 0, 1, 0, 0)
  }

  static createTranslation(x, y) {
    return new Matrix3x2(1, 0, 0, 1, x, y)
  }

  static multiply(a, b) {
    return new Matrix3x2(
      a.m11 * b.m11 + a.m12 * b.m21,
      a.m11 * b.m12 + a.m12 * b.m22,
      a.m21 * b.m11 + a.m22 * b.m21,
      a.m21 * b.m12 + a.m22 * b.m22,
      a.m31 * b.m11 + a.m32 * b.m21 + b.m31,
      a.m31 * b.m12 + a.m32 * b.m22 + b.m32
    )
  }

  toString() {
    return `${this.m11},${this.m12},${this.m21},${this.m22},${this.m31},${this.m32}`
  }
}

export class Vector2 {
  constructor(x, y) {
    this.x = x
    this.y = y
  }

  length() {
    return Math.sqrt(this.x * this.x + this.y * this.y)
  }
}

export class TouchControl {
  constructor(translateThreshold = 100, scaleThreshold = 0.8, rotateThreshold = 30) {
    this.translateThreshold = translateThreshold
    this.scaleThreshold = scaleThreshold
    this.rotateThreshold = rotateThreshold
    this.originActivePointerDictionary = new Map()
    this.isReachThreshold = false
    this.activePointerDictionary = new Map()
    this.pointerDictionary = new Map()
    this.baseMatrix = Matrix3x2.Identity
    this.matrix = Matrix3x2.Identity
  }

  onTouch(pointer) {
    if (pointer.pointerType === action.Down && this.activePointerDictionary.size < 2) {
      this.activePointerDictionary.set(pointer.pointerId, pointer)
      this.pointerDictionary.set(pointer.pointerId, pointer)
      this.reset()
    } else if (pointer.pointerType === action.Move) {
      if (this.activePointerDictionary.has(pointer.pointerId)) {
        this.pointerDictionary.set(pointer.pointerId, pointer)
      }
    } else if (pointer.pointerType === action.Up) {
      this.activePointerDictionary.delete(pointer.pointerId)
      this.pointerDictionary.delete(pointer.pointerId)
      this.reset()
      if (this.activePointerDictionary.size === 0) {
        this.isReachThreshold = false
      }
    }

    const transformMatrix = this.getMatrix()
    this.matrix = Matrix3x2.multiply(this.baseMatrix, transformMatrix)
    return this.matrix
  }

  getMatrix() {
    let transformMatrix = Matrix3x2.Identity

    if (this.pointerDictionary.size === 1) {
      transformMatrix = this.getMatrixFromSinglePointer([...this.activePointerDictionary.values()][0])
      const translateLength = Math.sqrt(
        transformMatrix.m31 * transformMatrix.m31 + transformMatrix.m32 * transformMatrix.m32
      )
      if (!this.isReachThreshold && translateLength >= this.translateThreshold) {
        this.isReachThreshold = true
        for (const p of this.activePointerDictionary.values()) {
          this.activePointerDictionary.set(p.pointerId, this.pointerDictionary.get(p.pointerId))
        }
        transformMatrix = this.getMatrixFromSinglePointer([...this.activePointerDictionary.values()][0])
      }
    } else if (this.pointerDictionary.size >= 2) {
      const pointers = this.getValidPointers3()
      transformMatrix = this.getMatrixFromTwoPointers(pointers[0], pointers[1])

      const translateLength = Math.sqrt(
        transformMatrix.m31 * transformMatrix.m31 + transformMatrix.m32 * transformMatrix.m32
      )
      const scale = Math.sqrt(transformMatrix.m11 * transformMatrix.m11 + transformMatrix.m22 * transformMatrix.m22)
      const deltaScale = Math.abs(scale - this.baseMatrix.m11)
      const rotation = Math.atan2(transformMatrix.m21, transformMatrix.m11)
      const rotationDeg = Math.abs(rotation * (180 / Math.PI))

      if (
        !this.isReachThreshold &&
        (translateLength >= this.translateThreshold ||
          deltaScale >= this.scaleThreshold ||
          rotationDeg >= this.rotateThreshold)
      ) {
        console.log(`translateLength: ${translateLength}, deltaScale: ${deltaScale}, rotationDeg: ${rotationDeg}`)
        this.isReachThreshold = true
        for (const p of this.activePointerDictionary.values()) {
          this.activePointerDictionary.set(p.pointerId, this.pointerDictionary.get(p.pointerId))
        }
        transformMatrix = this.getMatrixFromSinglePointer([...this.activePointerDictionary.values()][0])
      }
    }

    return this.isReachThreshold ? transformMatrix : Matrix3x2.Identity
  }

  getMatrixFromTwoPointers(pointer1, pointer2) {
    const pi1 = this.activePointerDictionary.get(pointer1.pointerId)
    const pi2 = this.activePointerDictionary.get(pointer2.pointerId)
    const v1 = new Vector2(pi2.x - pi1.x, pi2.y - pi1.y)

    const p1 = this.pointerDictionary.get(pointer1.pointerId)
    const p2 = this.pointerDictionary.get(pointer2.pointerId)
    const v2 = new Vector2(p2.x - p1.x, p2.y - p1.y)

    const c1x = pi1.x + (pi2.x - pi1.x) / 2
    const c1y = pi1.y + (pi2.y - pi1.y) / 2
    const c2x = p1.x + (p2.x - p1.x) / 2
    const c2y = p1.y + (p2.y - p1.y) / 2
    const m31 = c2x - c1x
    const m32 = c2y - c1y

    let transformMatrix = this.getMatrixFromVectors(v1, v2)
    transformMatrix = Matrix3x2.multiply(Matrix3x2.createTranslation(-c1x, -c1y), transformMatrix)
    transformMatrix = Matrix3x2.multiply(transformMatrix, Matrix3x2.createTranslation(c1x, c1y))
    transformMatrix = Matrix3x2.multiply(transformMatrix, Matrix3x2.createTranslation(m31, m32))

    return transformMatrix
  }

  getMatrixFromSinglePointer(pointer) {
    const p1 = this.activePointerDictionary.get(pointer.pointerId)
    const p2 = this.pointerDictionary.get(pointer.pointerId)

    const m31 = p2.x - p1.x
    const m32 = p2.y - p1.y
    return Matrix3x2.createTranslation(m31, m32)
  }

  getMatrixFromVectors(v1, v2) {
    const vectorLengthSquare = v1.x * v1.x + v1.y * v1.y
    const dotProduct = v1.x * v2.x + v1.y * v2.y
    const crossProduct = v1.x * v2.y - v1.y * v2.x

    const m11 = dotProduct / vectorLengthSquare
    const m12 = crossProduct / vectorLengthSquare
    const m21 = -crossProduct / vectorLengthSquare
    const m22 = dotProduct / vectorLengthSquare

    return new Matrix3x2(m11, m12, m21, m22, 0, 0)
  }

  reset() {
    for (const p of this.activePointerDictionary.values()) {
      this.activePointerDictionary.set(p.pointerId, this.pointerDictionary.get(p.pointerId))
    }
    this.baseMatrix = new Matrix3x2(
      this.matrix.m11,
      this.matrix.m12,
      this.matrix.m21,
      this.matrix.m22,
      this.matrix.m31,
      this.matrix.m32
    )
  }

  getValidPointers3() {
    return [...this.activePointerDictionary.values()].slice(0, 2)
  }
}
