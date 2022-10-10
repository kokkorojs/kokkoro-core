import { MessageElem } from 'oicq';

import { Plugin } from '@/plugin';
import { ContextMap } from '@/events';

export class Listen<T extends keyof ContextMap = any>  {
  public func?: (event: ContextMap[T]) => any;

  constructor(
    private event_name: string,
    public plugin: Plugin,
  ) {
  }

  run(event: any) {
    event.reply = (message: string | MessageElem[]) => {
      const { message_type, user_id, group_id, self_id } = event;

      // this.reply({
      //   type: message_type,
      //   message, self_id, user_id, group_id,
      // });
    };

    if (this.func) {
      this.func(event);
    }
  }

  trigger(callback: (event: ContextMap[T]) => any) {
    this.func = callback;
    return this;
  }

  // reply(event: PortEventMap['message.send']) {
  //   this.plugin.sendMessage(event);
  // }
}
