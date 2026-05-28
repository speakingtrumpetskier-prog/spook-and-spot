// Keyboard + mouse input. Polled each frame.

export class Input {
  private keys = new Set<string>();
  private keysPressed = new Set<string>();
  private keysReleased = new Set<string>();

  mouse = { x: 0, y: 0, dx: 0, dy: 0 };
  private lastMouse = { x: 0, y: 0 };
  mouseDown = { left: false, right: false };
  mousePressed = { left: false, right: false };
  mouseReleased = { left: false, right: false };

  wheel = 0;

  constructor(target: HTMLElement) {
    window.addEventListener("keydown", (e) => {
      const k = e.key.toLowerCase();
      if (!this.keys.has(k)) this.keysPressed.add(k);
      this.keys.add(k);
      // Prevent default for game keys
      if (["w","a","s","d","e","q","tab"," "].includes(k) || k.startsWith("arrow")) {
        e.preventDefault();
      }
    });
    window.addEventListener("keyup", (e) => {
      const k = e.key.toLowerCase();
      this.keys.delete(k);
      this.keysReleased.add(k);
    });

    target.addEventListener("mousemove", (e) => {
      const rect = (target as HTMLElement).getBoundingClientRect();
      this.mouse.x = e.clientX - rect.left;
      this.mouse.y = e.clientY - rect.top;
    });
    target.addEventListener("mousedown", (e) => {
      if (e.button === 0) {
        if (!this.mouseDown.left) this.mousePressed.left = true;
        this.mouseDown.left = true;
      }
      if (e.button === 2) {
        if (!this.mouseDown.right) this.mousePressed.right = true;
        this.mouseDown.right = true;
      }
      e.preventDefault();
    });
    target.addEventListener("mouseup", (e) => {
      if (e.button === 0) {
        this.mouseDown.left = false;
        this.mouseReleased.left = true;
      }
      if (e.button === 2) {
        this.mouseDown.right = false;
        this.mouseReleased.right = true;
      }
    });
    target.addEventListener("contextmenu", (e) => e.preventDefault());
    target.addEventListener("wheel", (e) => {
      this.wheel += e.deltaY;
      e.preventDefault();
    }, { passive: false });
  }

  isDown(key: string): boolean {
    return this.keys.has(key.toLowerCase());
  }

  wasPressed(key: string): boolean {
    return this.keysPressed.has(key.toLowerCase());
  }

  wasReleased(key: string): boolean {
    return this.keysReleased.has(key.toLowerCase());
  }

  // Call at end of frame to clear edge-triggered state and compute deltas
  endFrame(): void {
    this.mouse.dx = this.mouse.x - this.lastMouse.x;
    this.mouse.dy = this.mouse.y - this.lastMouse.y;
    this.lastMouse.x = this.mouse.x;
    this.lastMouse.y = this.mouse.y;
    this.keysPressed.clear();
    this.keysReleased.clear();
    this.mousePressed.left = false;
    this.mousePressed.right = false;
    this.mouseReleased.left = false;
    this.mouseReleased.right = false;
    this.wheel = 0;
  }
}
