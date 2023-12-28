import { Dirent } from 'node:fs';
import { join, resolve } from 'node:path';
import { mkdir, readFile, readdir } from 'node:fs/promises';
import { mountPlugin } from '@kokkoro/core';
import { Package } from './index.js';

const plugins_path = resolve('plugins');
const modules_path = resolve('node_modules');

/**
 * 判断是否是合法的插件目录
 *
 * @param dir - 目录实例对象
 * @returns 是否是插件目录
 */
function isPluginFolder(dir: Dirent): boolean {
  return dir.isDirectory() || dir.isSymbolicLink();
}

/**
 * 检索可用插件信息
 *
 * @returns 插件信息列表
 */
async function retrievalPlugins(): Promise<Dirent[]> {
  const pluginDirs: Dirent[] = [];
  const moduleDirs: Dirent[] = [];
  const dirs: Dirent[] = [];

  try {
    const dirs = await readdir(plugins_path, { withFileTypes: true });
    pluginDirs.push(...dirs);
  } catch (error) {
    await mkdir(plugins_path);
  }

  for (const dir of pluginDirs) {
    const is_plugin_folder = isPluginFolder(dir);

    if (!is_plugin_folder) {
      continue;
    }

    try {
      dirs.push(dir);
    } catch {}
  }

  try {
    const dirs = await readdir(modules_path, { withFileTypes: true });
    moduleDirs.push(...dirs);
  } catch (err) {
    await mkdir(modules_path);
  }

  for (const dir of moduleDirs) {
    const is_plugin_folder = isPluginFolder(dir);

    if (is_plugin_folder && dir.name.startsWith('kokkoro-plugin-')) {
      try {
        dirs.push(dir);
      } catch {}
    }
  }
  return dirs;
}

/**
 * 挂载所有插件
 */
export async function mountPlugins(): Promise<void> {
  const dirs = await retrievalPlugins();

  for (let i = 0; i < dirs.length; i++) {
    const { name, path } = dirs[i];
    const is_local = path === plugins_path;

    if (is_local) {
      const module_path = join(path, name);
      const json_path = join(module_path, 'package.json');
      const text = await readFile(json_path, 'utf-8');
      const { main } = <Package>JSON.parse(text);

      await mountPlugin(`./plugins/${name}/${main}`);
    } else {
      await mountPlugin(name);
    }
  }
}
