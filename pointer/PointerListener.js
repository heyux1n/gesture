export const PointerType = {
  None: 0,
  Mouse: 1,
  Touch: 2,
  Stylus: 3,
}

export const PointerAction = {
  Down: 0,
  Move: 1,
  Up: 2,
}

class PointerEventArgs {
  constructor({ position, pointerType, pointerAction, pointerId, originalEvent, matrix }) {
    this.position = position
    this.pointerType = pointerType
    this.pointerAction = pointerAction
    this.pointerId = pointerId
    this.originalEvent = originalEvent
    this.matrix = matrix
  }
}

export default class PointerListener {
  constructor(targetElement, pointerControl, stylusCooldown = 2000, fingerAreaThreshold = 500) {
    this.target = targetElement
    this.pointerControl = pointerControl
    this.stylusCooldown = stylusCooldown
    this.fingerAreaThreshold = fingerAreaThreshold

    this.pointerType = PointerType.None
    this.lastPointerType = PointerType.None
    this.lastTimestamp = 0

    this.onPointerDown = () => {}
    this.onPointerMove = () => {}
    this.onPointerUp = () => {}

    this.bindEvents()
  }

  /**
   * pointer 事件通用属性：
   * pointerId: 唯一标识触发事件的指针。
   * pointerType: 指针设备的类型（"mouse"、"pen" 或 "touch"）。
   * isPrimary: 指针是否是主指针（例如，第一个触摸点）。
   * clientX, clientY: 指针在视口中的坐标。
   * pageX, pageY: 指针在页面中的坐标。
   * screenX, screenY: 指针在屏幕中的坐标。
   * offsetX, offsetY: 指针在目标元素中的坐标。
   * button: 按下的鼠标按钮（0: 主按钮，1: 中键，2: 右键）。
   * buttons: 按下的鼠标按钮的位掩码。
   * ctrlKey, shiftKey, altKey, metaKey: 是否按下了 Ctrl、Shift、Alt 或 Meta 键。
   */
  bindEvents() {
    this.target.addEventListener('pointerdown', this.handlePointerDown.bind(this))
    this.target.addEventListener('pointermove', this.handlePointerMove.bind(this))
    this.target.addEventListener('pointerup', this.handlePointerUp.bind(this))
    this.target.addEventListener('pointercancel', this.handlePointerUp.bind(this))
  }

  createEventArgs(position, pointerType, pointerAction, pointerId, originalEvent, matrix) {
    return new PointerEventArgs({
      position,
      pointerType,
      pointerAction,
      pointerId,
      originalEvent,
      matrix,
    })
  }

  handlePointerDown(e) {
    e.preventDefault()
    const pos = { x: e.clientX, y: e.clientY }
    const id = e.pointerId
    const type = this.getPointerType(e)

    if (this.pointerType < type) {
      this.pointerControl.resetPointer()
      this.onPointerUp(
        this.createEventArgs(pos, this.pointerType, PointerAction.Up, id, e, this.pointerControl.baseMatrix)
      )
    }

    if (type === PointerType.Touch) {
      if (this.lastPointerType === PointerType.Stylus && performance.now() - this.lastTimestamp < this.stylusCooldown) {
        return
      }
    }

    this.pointerType = type
    const matrix = this.pointerControl.onPointer(PointerAction.Down, id, pos)
    this.onPointerDown(this.createEventArgs(pos, type, PointerAction.Down, id, e, matrix))
  }

  handlePointerMove(e) {
    if (e.buttons === 0) return // Only handle move while pointer is pressed

    const pos = { x: e.clientX, y: e.clientY }
    const id = e.pointerId
    const matrix = this.pointerControl.onPointer(PointerAction.Move, id, pos)
    this.onPointerMove(this.createEventArgs(pos, this.pointerType, PointerAction.Move, id, e, matrix))
  }

  handlePointerUp(e) {
    const pos = { x: e.clientX, y: e.clientY }
    const id = e.pointerId
    const matrix = this.pointerControl.onPointer(PointerAction.Up, id, pos)

    if (this.pointerControl.pointMap.size == 0) {
      this.lastPointerType = this.pointerType
      this.lastTimestamp = performance.now()
      this.pointerType = PointerType.None
    }

    this.onPointerUp(this.createEventArgs(pos, this.pointerType, PointerAction.Up, id, e, matrix))
  }

  getPointerType(e) {
    switch (e.pointerType) {
      case 'mouse':
        return PointerType.Mouse
      case 'touch':
        return PointerType.Touch
      case 'pen':
        return PointerType.Stylus
      default:
        return PointerType.None
    }
  }
}
