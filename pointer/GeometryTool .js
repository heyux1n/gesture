export default class GeometryTool {
  static isRectValid(rect) {
    return rect[2] - rect[0] > 0 && rect[3] - rect[1] > 0
  }

  static isRectsIntersected(rectA, rectB) {
    return rectA[0] < rectB[2] && rectA[2] > rectB[0] && rectA[1] < rectB[3] && rectA[3] > rectB[1]
  }

  static isPointContainedByRect(x, y, rect) {
    return rect[0] <= x && rect[2] >= x && rect[1] <= y && rect[3] >= y
  }

  static det(matrix) {
    return matrix[0] * matrix[4] - matrix[1] * matrix[3]
  }

  static invert(matrix) {
    const det = this.det(matrix)
    const sx = matrix[4] / det
    const rx = -matrix[1] / det
    const tx = (matrix[1] * matrix[5] - matrix[4] * matrix[2]) / det
    const ry = -matrix[3] / det
    const sy = matrix[0] / det
    const ty = (matrix[3] * matrix[2] - matrix[0] * matrix[5]) / det
    return [sx, rx, tx, ry, sy, ty]
  }

  static concat(preMatrix, postMatrix) {
    const sx = postMatrix[0] * preMatrix[0] + postMatrix[1] * preMatrix[3]
    const rx = postMatrix[0] * preMatrix[1] + postMatrix[1] * preMatrix[4]
    const tx = postMatrix[0] * preMatrix[2] + postMatrix[1] * preMatrix[5] + postMatrix[2]
    const ry = postMatrix[3] * preMatrix[0] + postMatrix[4] * preMatrix[3]
    const sy = postMatrix[3] * preMatrix[1] + postMatrix[4] * preMatrix[4]
    const ty = postMatrix[3] * preMatrix[2] + postMatrix[4] * preMatrix[5] + postMatrix[5]
    return [sx, rx, tx, ry, sy, ty]
  }

  static concatTranslate(preTx, preTy, postMatrix) {
    return [
      postMatrix[0],
      postMatrix[1],
      postMatrix[0] * preTx + postMatrix[1] * preTy + postMatrix[2],
      postMatrix[3],
      postMatrix[4],
      postMatrix[3] * preTx + postMatrix[4] * preTy + postMatrix[5],
    ]
  }

  static mapRect(matrix, rect) {
    const ex = rect[2] - rect[0]
    const ey = rect[3] - rect[1]

    // 矩阵乘法中的向量投影
    const p0 = [0, 0]
    const p1 = [matrix[0] * ex, matrix[3] * ex]
    const p2 = [matrix[1] * ey, matrix[4] * ey]
    const p3 = [p1[0] + p2[0], p1[1] + p2[1]]

    const l = Math.min(p0[0], p1[0], p2[0], p3[0])
    const t = Math.min(p0[1], p1[1], p2[1], p3[1])
    const r = Math.max(p0[0], p1[0], p2[0], p3[0])
    const b = Math.max(p0[1], p1[1], p2[1], p3[1])

    const x0 = matrix[0] * rect[0] + matrix[1] * rect[1] + matrix[2]
    const y0 = matrix[3] * rect[0] + matrix[4] * rect[1] + matrix[5]

    return [l + x0, t + y0, r + x0, b + y0]
  }
}
