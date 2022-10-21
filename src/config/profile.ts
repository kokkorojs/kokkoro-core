import { join } from 'path';
import { writeFileSync } from 'fs';
import { writeFile } from 'fs/promises';
import { MemberDecreaseEvent, MemberIncreaseEvent } from 'oicq';

import { Bot } from '@/core';
import { PluginSetting } from '@/plugin';
import { debounce, deepClone, deepMerge } from '@/utils';

/** 群聊 */
export type Group = {
  /** 群名称 */
  name: string;
  /** 插件 */
  plugin: {
    /** 插件名 */
    [name: string]: PluginSetting;
  }
}

export interface UpdateSettingEvent {
  name: string;
  setting: PluginSetting;
}

export class Profile {
  disable: string[];
  group: {
    [group_id: number]: Group;
  };
  defaultSetting: {
    [key: string]: PluginSetting;
  };
  readonly file: string;

  constructor(
    private bot: Bot,
  ) {
    this.defaultSetting = {};
    this.file = join(this.bot.dir, `profile-${this.bot.uin}.json`);

    try {
      const profile: Profile = require(this.file);

      this.group = profile.group;
      this.disable = profile.disable;
    } catch (error) {
      this.group = {};
      this.disable = [];

      writeFileSync(this.file, '{}');
      this.bot.logger.mark("创建了新的配置文件：" + this.file);
    }
    this.bindEvents();
  }

  /**
   * 绑定事件监听
   */
  private bindEvents(): void {
    this.bot.on('config.update.disable', (event) => this.onUpdateDisable(event));
    this.bot.on('config.update.setting', (event) => this.onUpdateSetting(event));
    this.bot.on('notice.group.increase', (event) => this.onGroupIncrease(event));
    this.bot.on('notice.group.decrease', (event) => this.onGroupDecrease(event));
  }

  // TODO ⎛⎝≥⏝⏝≤⎛⎝ 使用 proxy 重构
  private async write() {
    const data = {
      group: this.group,
      disable: this.disable,
    };

    // TODO ⎛⎝≥⏝⏝≤⎛⎝ 数据校验，避免重复调用 writeFile
    // const localData = require(this.setting_dir);

    return writeFile(this.file, JSON.stringify(data, null, 2));
  }

  private onUpdateSetting(event: UpdateSettingEvent) {
    const { name, setting } = event;

    // 内置插件不用初始化配置
    if (name === 'kokkoro') {
      return;
    }
    this.defaultSetting[name] = setting;
    this.refresh(name, setting);
  }

  private onUpdateDisable(event: { name: string, id: string, }) {
    const { name, id } = event;

    if (this.disable.includes(name)) {
      this.bot.logger.error(`插件 ${name} 已在禁用列表`);
      this.bot.emit(`config.disable.${id}`, false, `插件 ${name} 已在禁用列表`);
      return;
    }
    this.disable.push(name);
    this.write()
      .then(() => {
        this.bot.logger.info(`更新了禁用列表，新增了插件：${name}`);
        this.bot.emit(`config.disable.${id}`, true);
      })
      .catch((error) => {
        this.bot.logger.error(`更新禁用列表失败，${error.message}`);
        this.bot.emit(`config.disable.${id}`, false, `更新禁用列表失败，${error.message}`);
      })
  }

  private onGroupIncrease(event: MemberIncreaseEvent): void {
    if (event.user_id !== this.bot.uin) {
      return;
    }
    const group_id = event.group_id;
    const group_name = event.group.info!.group_name;
    // const group_name = (await this.getGroupInfo(group_id)).group_name;

    this.group[group_id] ??= {
      name: group_name, plugin: {},
    };
    this.group[group_id].name = group_name;

    const settingNames = Object.keys(this.defaultSetting);
    const settings_length = settingNames.length;

    for (let i = 0; i < settings_length; i++) {
      const name: string = settingNames[i];
      const setting: PluginSetting = this.getDefaultSetting(name);

      this.group[group_id].plugin[name] = deepMerge(
        setting,
        this.group[group_id].plugin[name]
      )
    }

    this.write()
      .then(() => {
        this.bot.logger.info(`更新了群配置，新增了群：${group_id}`);
      })
      .catch((error) => {
        this.bot.logger.error(`更新群配置失败，${error.message}`);
      })
  }

  private onGroupDecrease(event: MemberDecreaseEvent): void {
    if (event.user_id !== this.bot.uin) {
      return;
    }
    const group_id = event.group_id;

    delete this.group[group_id];
    this.write()
      .then(() => {
        this.bot.logger.info(`更新了群配置，删除了群：${group_id}`);
      })
      .catch((error) => {
        this.bot.logger.error(`更新群配置失败，${error.message}`);
      })
  }

  private refresh = debounce(async (name: string, setting: PluginSetting) => {
    for (const [, info] of this.bot.gl) {
      const { group_id, group_name } = info;

      this.group[group_id] ??= {
        name: group_name, plugin: {},
      };
      this.group[group_id].name = group_name;
      // 刷新指定插件配置项
      this.group[group_id].plugin[name] = deepMerge(
        deepClone(setting),
        this.group[group_id].plugin[name]
      )
    }

    try {
      await this.write();
      this.bot.logger.info(`更新了群配置`);
    } catch (error) {
      if (error instanceof Error) {
        this.bot.logger.error(`更新群配置失败，${(error).message}`);
      }
    }
  }, 10)

  getDefaultSetting(name: string): PluginSetting {
    return deepClone(this.defaultSetting[name]);
  }

  getSetting(group_id: number, name: string) {
    return this.group[group_id].plugin[name];
  }
}
