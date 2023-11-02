

// createInputHandler returns an InputHandler by attaching event handlers to the window.
export function createInputHandler(window) {
  const digital = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    up: false,
    down: false
  }
  const analog = {
    x: 0,
    y: 0,
    zoom: 0
  }
  let mouseDown = false

  const setDigital = (e, value) => {
    switch (e.code) {
      case "KeyW":
        digital.forward = value
        e.preventDefault()
        e.stopPropagation()
        break
      case "KeyS":
        digital.backward = value
        e.preventDefault()
        e.stopPropagation()
        break
      case "KeyA":
        digital.left = value
        e.preventDefault()
        e.stopPropagation()
        break
      case "KeyD":
        digital.right = value
        e.preventDefault()
        e.stopPropagation()
        break
      case "Space":
        digital.up = value
        e.preventDefault()
        e.stopPropagation()
        break
      case "ShiftLeft":
      case "ControlLeft":
      case "KeyC":
        digital.down = value
        e.preventDefault()
        e.stopPropagation()
        break
    }
  }

  window.addEventListener("keydown", e => setDigital(e, true))
  window.addEventListener("keyup", e => setDigital(e, false))
  window.addEventListener("mousedown", () => {
    mouseDown = true
  })
  window.addEventListener("mouseup", () => {
    mouseDown = false
  })
  window.addEventListener("mousemove", e => {
    mouseDown = (e.buttons & 1) !== 0
    if (mouseDown) {
      analog.x += e.movementX
      analog.y += e.movementY
    }
  })
  window.addEventListener(
    "wheel",
    e => {
      mouseDown = (e.buttons & 1) !== 0
      if (mouseDown) {
        // The scroll value varies substantially between user agents / browsers.
        // Just use the sign.
        analog.zoom += Math.sign(e.deltaY)
        e.preventDefault()
        e.stopPropagation()
      }
    },
    { passive: false }
  )

  return () => {
    const out = {
      digital,
      analog: {
        x: analog.x,
        y: analog.y,
        zoom: analog.zoom,
        touching: mouseDown
      }
    }
    // Clear the analog values, as these accumulate.
    analog.x = 0
    analog.y = 0
    analog.zoom = 0
    return out
  }
}

