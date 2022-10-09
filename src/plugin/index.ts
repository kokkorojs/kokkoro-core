import { join } from 'path';
import { Dirent } from 'fs';
import { mkdir, readdir } from 'fs/promises';
import { CronCommand, CronJob } from 'cron';
import { isMainThread, parentPort, MessagePort, workerData } from 'worker_threads';

import { Bot } from '@/core/bot';
import { deepClone } from '@/utils';
import { ContextMap } from '@/events';
import { proxyParentPort } from '@/worker';
import { Listen } from './listen';
import { Command, CommandEventMap } from './command';
import { Client } from 'oicq';

const modules_path = join(__workname, 'node_modules');
const plugins_path = join(__workname, 'plugins');

export type PluginInfo = {
  name: string;
  path: string;
  local: boolean;
};

/** 插件选项 */
export type Option = {
  /** 锁定，默认 false */
  lock: boolean;
  /** 开关，默认 true */
  apply: boolean;
  /** 其它设置 */
  [param: string]: string | number | boolean | Array<string | number>;
};

export class Plugin {
  public name: string;
  private ver: string;
  private jobs: CronJob[];
  private events: string[];
  private botPort: Map<number, MessagePort>;
  private listenerList: Map<string, Listen>;
  private commandList: Map<string, Command>;

  constructor(
    public prefix: string = '',
    private option: Option = { apply: true, lock: false },
  ) {
    if (isMainThread) {
      throw new Error('你在主线程跑这个干吗？');
    }
    proxyParentPort();

    this.name = workerData.name;
    this.ver = '0.0.0';
    this.jobs = [];
    this.events = [];
    this.botPort = new Map();
    this.listenerList = new Map();
    this.commandList = new Map();

    //#region 帮助指令
    const helpCommand = new Command('all', 'help', this)
      .description('帮助信息')
      .action((event) => {
        const message = ['Commands: '];

        for (const [_, command] of this.commandList) {
          const { raw_name, desc } = command;
          message.push(`  ${raw_name}  ${desc}`);
        }
        // event.reply(message.join('\n'));
      });
    //#endregion
    // #region 版本指令
    const versionCommand = new Command('all', 'version', this)
      .description('版本信息')
      .action((event) => {
        if (this.name) {
          // event.reply(`${this.name} v${this.ver}`);
        } else {
          // event.reply('当前插件未添加版本信息，可调用 Plugin.info 设置');
        }
      });
    //#endregion

    // 任何插件实例化后都将自带 version 及 help 指令
    setTimeout(() => {
      this.commandList.set(helpCommand.name, helpCommand);
      this.commandList.set(versionCommand.name, versionCommand);
    });

    // 绑定插件线程通信
    parentPort?.on('bind.bot.port', (event) => {
      const { uin, port } = event;

      this.botPort.set(uin, port);
      this.events.forEach((name) => {
        const bindPluginEvent = {
          name: 'bind.plugin.event',
          event: { listen: name, name: this.name },
        };
        const bindSettingEvent = {
          name: 'bind.setting',
          event: { name: this.name, option },
        };

        port.postMessage(bindPluginEvent);
        port.postMessage(bindSettingEvent);

        port.on('message', (value: any) => {
          if (value.name) {
            port.emit(value.name, value.event);
          }
        })
        port.on(name, (event: any) => {
          if (name.startsWith('message')) {
            this.parseAction(event);
          } else {
            this.listenerList.get(name)!.run(event);
          }
        });
      });
    });
  }

  botApi<K extends keyof Bot>(uin: number, method: K, ...params: Bot[K] extends (...args: infer P) => any ? P : []) {
    return new Promise((resolve, reject) => {
      const event = {
        name: 'bot.api',
        event: { method, params },
      };

      this.botPort.get(uin)?.postMessage(event);
      this.botPort.get(uin)?.once('bot.api.callback', e => {
        resolve(e);
      })
    });
  }

  schedule(cron: string, command: CronCommand) {
    const job = new CronJob(cron, command, null, true);

    this.jobs.push(job);
    return this;
  }

  version(ver: string) {
    this.ver = ver;
    return this;
  }

  sendPrivateMsg(event: Parameters<Client['sendPrivateMsg']>) {
    const { self_id } = event;
    const port_event = {
      name: 'message.send', event,
    };
    this.botPort.get(self_id)?.postMessage(port_event);
  }

  // sendAllMessage(event: PortEventMap['message.send']) {
  //   const port_event = {
  //     name: 'message.send', event,
  //   };
  //   this.botPort.forEach((port) => {
  //     port.postMessage(port_event);
  //   })
  // }

  // recallMessage(event: any) {
  //   const { self_id } = event;
  //   this.botPort.get(self_id)?.postMessage(event);
  // }

  // 指令监听
  command<T extends keyof CommandEventMap>(raw_name: string, message_type?: T): Command<T> {
    const command = new Command(message_type, raw_name, this);

    this.events.push('message.all');
    this.commandList.set(command.name, command);
    return command;
  }

  // 事件监听
  listen<T extends keyof ContextMap>(name: T): Listen<T> {
    const listen = new Listen(name, this);

    // 单个插件单项事件不应该重复监听
    this.events.push(name);
    this.listenerList.set(name, listen);
    return listen;
  }

  // 指令解析器
  private parseAction(event: any) {
    for (const [_, command] of this.commandList) {
      if (command.isMatched(event)) {
        event.query = command.parseQuery(event.raw_message);
        command.run(event);
      }
    }
  }

  getOption() {
    // 深拷贝防止 default option 被修改
    return deepClone(this.option);
  }
}

/**
 * 检索可用插件
 *
 * @returns Promise
 */
export async function retrievalPlugins(): Promise<PluginInfo[]> {
  const plugin_dirs: Dirent[] = [];
  const module_dirs: Dirent[] = [];
  const plugins: PluginInfo[] = [];

  try {
    const dirs = await readdir(plugins_path, { withFileTypes: true });
    plugin_dirs.push(...dirs);
  } catch (error) {
    await mkdir(plugins_path);
  }

  for (const dir of plugin_dirs) {
    if (dir.isDirectory() || dir.isSymbolicLink()) {
      const name = dir.name;
      const path = join(plugins_path, name);

      try {
        require.resolve(path);
        const info: PluginInfo = {
          name, path, local: true,
        };
        plugins.push(info);
      } catch {
      }
    }
  }

  try {
    const dirs = await readdir(modules_path, { withFileTypes: true });
    module_dirs.push(...dirs);
  } catch (err) {
    await mkdir(modules_path);
  }

  for (const dir of module_dirs) {
    if (dir.isDirectory() && dir.name.startsWith('kokkoro-plugin-')) {
      // 移除文件名前缀
      const name = dir.name.replace('kokkoro-plugin-', '');
      const path = join(modules_path, name);

      try {
        require.resolve(path);
        const info: PluginInfo = {
          name, path, local: false,
        };
        plugins.push(info);
      } catch {
      }
    }
  }

  return plugins;
}
