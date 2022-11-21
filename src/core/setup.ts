import { getConfig } from '@/config';
import { logger } from '@/utils';
import { createBot, getBotMap } from '@/core';
import { VERSION, UPDAY, CHANGELOGS } from '@/kokkoro';
import { retrievalPlugins, importPlugin } from '@/plugin';

/**
 * 创建机器人服务
 */
function createBots() {
  const bots = getConfig('bots');
  const uins = Object.keys(bots).map(Number);
  const uins_length = uins.length;

  // TODO ／人◕ ‿‿ ◕人＼ v2 将会开发 web 后台统一管理账号
  if (uins_length > 1) {
    throw new Error('v1 暂不支持多账号登录，若要在终端并发登录可自行 fork 修改源码');
  }
  for (let i = 0; i < uins_length; i++) {
    const uin = uins[i];
    const config = bots[uin];
    const bot = createBot(uin, config);
  }
}

/**
 * 创建插件服务
 */
async function createPlugins() {
  const pluginList = await retrievalPlugins();

  pluginList.core = {
    name: 'core',
    folder: 'plugin',
    filename: './core.js',
    local: true,
  }
  const keys = Object.keys(pluginList);
  const keys_length = keys.length;

  for (let i = 0; i < keys_length; i++) {
    const key = keys[i];
    const info = pluginList[key];
    const plugin = importPlugin(info);
  }
}

export async function setup() {
  const logo = `
    |   _  |  |   _  ._ _    ._ _   _. o o   _|_  _  ._  ._   _ |_  o   |
    |< (_) |< |< (_) | (_)   | | | (_| | |    |_ (/_ | | | |  > | | |   |
                                       ╯                                o
  `;
  process.title = 'kokkoro';
  console.log(`\u001b[32m${logo}\u001b[0m`);

  logger.mark(`----------`);
  logger.mark(`Package Version: kokkoro@${VERSION} (Released on ${UPDAY})`);
  logger.mark(`View Changelogs: ${CHANGELOGS}`);
  logger.mark(`----------`);

  try {
    createBots();
    await createPlugins();

    const bl = getBotMap();

    bl.forEach((bot) => {
      bot.linkStart();
    });
  } catch (error) {
    logger.error((<Error>error).message);
    process.exit();
  }
}
