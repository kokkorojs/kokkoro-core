import { none } from '@kokkoro/utils';
import { BotEvent } from 'amesu';
import { Bot } from '@/bot.js';
import { logger } from '@/logger.js';

export type EventType<K extends keyof BotEvent> = BotEvent[K] extends (event: infer E) => void ? E : never;

/** 插件信息 */
export interface PluginInfo {
  /** 名称 */
  name: string;
  /** 描述 */
  description?: string;
}

export type CommandEvent<T = any> = (EventType<'at.message.create'> | EventType<'group.at.message.create'>) & {
  query: T;
};

interface PluginHandle {
  /** 事件 */
  event: string | null;
  /** 方法 */
  method: (event: any, bot: Bot) => string | void | Promise<string | void>;
}

/** 指令参数 */
type CommandArg = {
  /** 是否必填 */
  required: boolean;
  /** 参数值 */
  value: string;
  /** 可变参数 */
  variadic: boolean;
};

class Command {
  public prefix: string;
  public args: CommandArg[];

  constructor(
    public statement: string,
    private callback: (event: CommandEvent, bot: Bot) => string | void | Promise<string | void>,
  ) {
    this.prefix = this.parsePrefix();
    this.args = this.parseArguments();
  }

  public action(event: CommandEvent, bot: Bot) {
    const is_match = this.isMatch(event);

    if (!is_match) {
      return;
    }
    return this.callback(event, bot);
  }

  private parsePrefix(): string {
    return this.statement.replace(/[<[].+/, '').trim();
  }

  private parseArguments(): CommandArg[] {
    const args = [];
    const BRACKET_RE_GLOBAL = /<([^>]+)>|\[([^\]]+)\]/g;

    const parse = (match: string[]): CommandArg => {
      let variadic = false;
      let value = match[1] ?? match[2];

      if (value.startsWith('...')) {
        value = value.slice(3);
        variadic = true;
      }
      return {
        required: match[0].startsWith('<'),
        value,
        variadic,
      };
    };

    let match;
    while ((match = BRACKET_RE_GLOBAL.exec(this.statement))) {
      args.push(parse(match));
    }

    for (let i = 0; i < args.length; i++) {
      const { variadic, value } = args[i];

      if (variadic && i !== args.length - 1) {
        throw new Error(`only the last argument can be variadic "...${value}"`);
      }
    }
    return args;
  }

  private isMatch(event: CommandEvent): boolean {
    const { content } = event;
    const message = content.replace(/^.+(?=\/)/, '').trimEnd();

    if (!message.startsWith(this.prefix)) {
      return false;
    }
    const args = message
      .replace(this.prefix, '')
      .replace(/\s{2,}/, ' ')
      .split(' ')
      .filter(arg => arg);
    const args_count = this.args.filter(arg => arg.required).length;

    if (args.length < args_count) {
      const message = `缺少指令参数，有效语句为："${this.statement}"`;

      event.reply({ msg_type: 0, content: message }).catch(none);
      return false;
    }
    const query: CommandEvent['query'] = {};

    for (let i = 0; i < this.args.length; i++) {
      const arg = this.args[i];
      const { variadic, value } = arg;

      query[value] = variadic ? args.slice(i) : args[i] ?? null;
    }
    event.query = query;

    return true;
  }
}

class Plugin {
  public name: string;
  public description?: string;
  public handles: PluginHandle[];

  constructor(info: PluginInfo) {
    this.name = info.name;
    this.description = info.description;
    this.handles = [];

    logger.info(`Load plugin: "${this.name}"`);
    pluginList.set(this.name, this);
  }

  public command<T = Record<string, any>>(
    statement: string,
    callback: (event: CommandEvent<T>, bot: Bot) => string | void | Promise<string | void>,
  ) {
    const command = new Command(statement, callback);
    const handle: PluginHandle = {
      event: null,
      method: command.action.bind(command),
    };

    this.handles.push(handle);
    return this;
  }

  public event<K extends keyof BotEvent>(name: K, callback: (event: EventType<K>, bot: Bot) => void) {
    const handle: PluginHandle = {
      event: name,
      method: callback,
    };

    this.handles.push(handle);
    return this;
  }
}

export const pluginList = new Map<string, Plugin>();

export function usePlugin(info: PluginInfo): Plugin {
  const { name } = info;
  const is_use = pluginList.has(name);

  if (is_use) {
    const message = `Plugin "${name}" is already registered.`;

    logger.error(message);
    throw new Error(message);
  }
  return new Plugin(info);
}
