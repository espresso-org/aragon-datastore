import { Subject } from 'rxjs'

export class EventEmitter {
    events
  
    constructor() {
      this.events = new Subject()
    }
  
    emit(event) {
      this.events.next({
        event
      })
    }
  }