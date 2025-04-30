import { PointerAction } from './PointerListener.js'
import GeometryTool from './GeometryTool .js'

export default class PointerControl {
  constructor(translateThreshold = 10, scaleThreshold = 5 / 4, rotateThreshold = (5 * Math.PI) / 180) {
    this.translateThreshold = translateThreshold
    this.scaleThreshold = scaleThreshold
    this.rotateThreshold = rotateThreshold

    this.initPointMap = new Map()
    this.activePointMap = new Map()
    this.pointMap = new Map()

    this.baseMatrix = [1, 0, 0, 0, 1, 0]
    this.matrix = [1, 0, 0, 0, 1, 0]

    this.scaleFlag = false
    this.rotateFlag = false
    this.translateFlag = false

    this.firstScaleFlag = false
    this.firstRotateFlag = false
    this.firstTranslateFlag = false
  }

  onPointer(action, id, point) {
    if (action === PointerAction.Down) {
      this.pointDown(id, point)
    } else if (action === PointerAction.Move) {
      this.pointMove(id, point)
    } else if (action === PointerAction.Up) {
      this.pointUp(id, point)
    }

    if (this.pointMap.size === 0) {
      return this.baseMatrix
    }

    const transformMatrix = this.getMatrix()
    this.matrix = GeometryTool.concat(this.baseMatrix, transformMatrix)

    if (this.firstScaleFlag || this.firstRotateFlag || this.firstTranslateFlag) {
      this.reset(true, false)
    }

    return this.matrix
  }

  resetPointer() {
    this.scaleFlag = false
    this.rotateFlag = false
    this.translateFlag = false
    this.firstScaleFlag = false
    this.firstRotateFlag = false
    this.firstTranslateFlag = false

    this.initPointMap.clear()
    this.activePointMap.clear()
    this.pointMap.clear()

    this.baseMatrix = [...this.matrix]
  }

  pointDown(id, point) {
    if (this.activePointMap.size < 2) {
      this.initPointMap.set(id, point)
      this.activePointMap.set(id, point)
      this.pointMap.set(id, point)
      this.reset(true, true)
    }
  }

  pointMove(id, point) {
    if (!this.activePointMap.has(id)) return
    this.pointMap.set(id, point)
  }

  pointUp(id) {
    if (!this.activePointMap.has(id)) return

    this.initPointMap.delete(id)
    this.activePointMap.delete(id)
    this.pointMap.delete(id)

    if (this.activePointMap.size === 0) {
      this.scaleFlag = false
      this.rotateFlag = false
      this.translateFlag = false
    }

    this.reset(true, true)
  }

  getMatrix() {
    const points = Array.from(this.pointMap.values())

    if (points.length === 1) {
      const [p0] = this.initPointMap.values()
      const [p1] = this.activePointMap.values()
      const [p2] = points
      const [dx, dy] = this.getTranslation(p0, p1, p2)
      return [1, 0, dx, 0, 1, dy]
    }

    if (points.length >= 2) {
      const ids = Array.from(this.activePointMap.keys()).slice(0, 2)
      const pi1 = this.initPointMap.get(ids[0])
      const pi2 = this.initPointMap.get(ids[1])
      const pa1 = this.activePointMap.get(ids[0])
      const pa2 = this.activePointMap.get(ids[1])
      const p1 = this.pointMap.get(ids[0])
      const p2 = this.pointMap.get(ids[1])

      const v0 = { x: pi2.x - pi1.x, y: pi2.y - pi1.y }
      const v1 = { x: pa2.x - pa1.x, y: pa2.y - pa1.y }
      const v2 = { x: p2.x - p1.x, y: p2.y - p1.y }

      const [m11, m12, m21, m22] = this.getScaleRotate(v0, v1, v2)

      const c0 = { x: (pi1.x + pi2.x) / 2, y: (pi1.y + pi2.y) / 2 }
      const c1 = { x: (pa1.x + pa2.x) / 2, y: (pa1.y + pa2.y) / 2 }
      const c2 = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }

      const [dx, dy] = this.getTranslation(c0, c1, c2)
      const originX = c1.x
      const originY = c1.y

      let transform = [m11, m21, dx, m12, m22, dy]
      transform = GeometryTool.concat([1, 0, -originX, 0, 1, -originY], transform)
      transform = GeometryTool.concat(transform, [1, 0, originX, 0, 1, originY])

      return transform
    }

    return [1, 0, 0, 0, 1, 0]
  }

  getTranslation(p0, p1, p2) {
    this.firstTranslateFlag = false

    if (this.translateFlag) {
      return [p2.x - p1.x, p2.y - p1.y]
    }

    const dx = p2.x - p0.x
    const dy = p2.y - p0.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (!this.translateFlag && dist > this.translateThreshold) {
      this.firstTranslateFlag = true
      this.translateFlag = true
    }

    return [0, 0]
  }

  getScaleRotate(v0, v1, v2) {
    this.firstScaleFlag = false
    this.firstRotateFlag = false

    const crossT = v0.x * v2.y - v0.y * v2.x
    const dotT = v0.x * v2.x + v0.y * v2.y
    const len0 = Math.hypot(v0.x, v0.y)
    const len2 = Math.hypot(v2.x, v2.y)
    const scaleT = len2 / len0
    const sinT = crossT / (len0 * len2)

    if (!this.scaleFlag && (scaleT > this.scaleThreshold || scaleT < 1 / this.scaleThreshold)) {
      this.scaleFlag = true
      this.firstScaleFlag = true
    }

    if (!this.rotateFlag && Math.abs(sinT) > Math.sin(this.rotateThreshold)) {
      this.rotateFlag = true
      this.firstRotateFlag = true
    }

    const isSetScale = this.scaleFlag && !this.firstScaleFlag
    const isSetRotate = this.rotateFlag && !this.firstRotateFlag

    if (!isSetScale && !isSetRotate) return [1, 0, 0, 1]

    const dot = v1.x * v2.x + v1.y * v2.y
    const cross = v1.x * v2.y - v1.y * v2.x
    const len1 = Math.hypot(v1.x, v1.y)
    const lenV2 = Math.hypot(v2.x, v2.y)
    const scale = lenV2 / len1
    const sin = cross / (len1 * lenV2)

    if (isSetScale && isSetRotate) {
      const lenSq = v1.x * v1.x + v1.y * v1.y
      return [dot / lenSq, cross / lenSq, -cross / lenSq, dot / lenSq]
    } else if (isSetScale) {
      return [scale, 0, 0, scale]
    } else if (isSetRotate) {
      return [dot / (len1 * lenV2), sin, -sin, dot / (len1 * lenV2)]
    }

    return [1, 0, 0, 1]
  }

  reset(resetActive, resetInit) {
    if (resetActive) {
      for (const [id, point] of this.pointMap) {
        if (this.activePointMap.has(id)) {
          this.activePointMap.set(id, point)
        }
      }
    }

    if (resetInit) {
      for (const [id, point] of this.pointMap) {
        if (this.initPointMap.has(id)) {
          this.initPointMap.set(id, point)
        }
      }
    }

    this.baseMatrix = [...this.matrix]
  }
}
