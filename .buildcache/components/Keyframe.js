import { Component } from "ecsy";
export class Keyframe extends Component {
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
