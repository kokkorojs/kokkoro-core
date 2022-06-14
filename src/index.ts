import { join } from 'path';
import { createWebServer } from './web';

const { upday, version, changelogs } = require('../package.json');

export const KOKKORO_UPDAY = upday;
export const KOKKORO_VERSION = version;
export const KOKKORO_CHANGELOGS = changelogs;

export const data_dir = join(__workname, 'data');
export const bot_dir = join(data_dir, 'bot');
export const plugins_dir = join(__workname, 'plugins');
export const modules_dir = join(__workname, 'node_modules');

export function startup() {
  const logo = `
    |   _  |  |   _  ._ _    ._ _   _. o o   _|_  _  ._  ._   _ |_  o   |
    |< (_) |< |< (_) | (_)   | | | (_| | |    |_ (/_ | | | |  > | | |   |
                                       ╯                                o
  `;

  console.log(`\u001b[32m${logo}\u001b[0m`);
  createWebServer();
}

export { web } from './web';
