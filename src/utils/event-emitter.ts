import { Subject } from 'rxjs'

export class EventEmitter {
    events
  
    constructor() {
      this.events = new Subject()
    }
  
    emit(eventName, params) {
      this.events.next({
        event: eventName,
        returnedValues: { ...params }
      })
    }
  }