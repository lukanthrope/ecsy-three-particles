import { Component } from "ecsy"

export class Keyframe extends Component {
  attributes: any[]
  duration: number
  direction: string
  constructor() {
    super()
    this.reset()
  }

  reset(): void {
    this.attributes = []
    this.duration = 1
    this.direction = "ping-pong"
  }
}
