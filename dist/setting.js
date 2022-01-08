"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.settingHanders = exports.setOption = exports.getOption = exports.getList = exports.getAllSetting = exports.getSetting = void 0;
const path_1 = require("path");
const fs_1 = require("fs");
const promises_1 = require("fs/promises");
const util_1 = require("./util");
const config_1 = require("./config");
const all_setting = new Map();
(async () => {
    try {
        const global_config = (0, config_1.getGlobalConfig)();
        const uins = Object.keys(global_config.bots);
        for (const uin of uins) {
            const setting_path = (0, path_1.resolve)(__workname, `data/bots/${uin}/setting.json`);
            if ((0, fs_1.existsSync)(setting_path)) {
                all_setting.set(Number(uin), require(setting_path));
            }
            else {
                const setting = {
                    all_plugin: [],
                };
                all_setting.set(Number(uin), setting);
                await (0, promises_1.writeFile)(setting_path, `${JSON.stringify(setting, null, 2)}`);
            }
        }
    }
    catch { }
})();
//#region 获取所有群聊插件设置
function getAllSetting() {
    return all_setting;
}
exports.getAllSetting = getAllSetting;
//#endregion
//#region 获取当前群聊插件设置
function getSetting(uin) {
    return all_setting.get(uin);
}
exports.getSetting = getSetting;
//#region 写入群聊插件设置
function setSetting(uin) {
    const setting_path = (0, path_1.resolve)(__workname, `data/bots/${uin}/setting.json`);
    const setting = all_setting.get(uin);
    return (0, promises_1.writeFile)(setting_path, `${JSON.stringify(setting, null, 2)}`);
}
//#endregion
//#region 获取当前插件的群聊选项
function getOption(event) {
    const { self_id, group_id } = event;
    const stack = (0, util_1.getStack)();
    const regex = /\w+(?=\\index\.js)/g;
    const setting = all_setting.get(self_id);
    const fileName = stack[2].getFileName();
    const [plugin_name] = fileName.match(regex);
    return setting[group_id].plugin[plugin_name] || {};
}
exports.getOption = getOption;
//#endregion
// #dregion 获取当前插件的群聊选项
async function setOption(params, event) {
    const [plugin_name, option_name, value] = params;
    let message;
    switch (true) {
        case !plugin_name:
            message = '插件名不能为空';
            break;
        case !option_name:
            message = '插件选项不能为空';
            break;
        case !value:
            message = '参数不能为空';
            break;
    }
    if (message) {
        return message;
    }
    const { self_id, group_id } = event;
    const setting = all_setting.get(self_id);
    const option = setting[group_id].plugin[plugin_name] || {};
    const plugin = setting[group_id].plugin;
    if (Object.keys(option).includes(option_name)) {
        switch (true) {
            case ['true', 'false'].includes(value):
                setting[group_id].plugin[plugin_name][option_name] = value === 'true';
                break;
            case !isNaN(value):
                setting[group_id].plugin[plugin_name][option_name] = Number(value);
                break;
            default:
                setting[group_id].plugin[plugin_name][option_name] = value;
                break;
        }
        all_setting.set(self_id, setting);
        await setSetting(self_id);
        return `${plugin_name} {\n  ${option_name}: ${value}\n}`;
    }
    else {
        return `Error: ${plugin[plugin_name] ? option_name : plugin_name} is not defined`;
    }
}
exports.setOption = setOption;
// #endregion
//#region 获取群聊插件列表
async function getList(event) {
    const { self_id, group_id } = event;
    const { plugin } = all_setting.get(self_id)?.[group_id] || { plugin: {} };
    const message = ['// 如要查看更多信息可输入 >setting\n"list": {'];
    for (const key in plugin)
        message.push(`  "${key}": ${plugin[key].switch}`);
    message.push('}');
    return message.join('\n');
}
exports.getList = getList;
//#endregion
async function settingHanders(params, event) {
    const { group_id, self_id } = event;
    let message;
    switch (true) {
        case !params.length:
            const setting = `"${group_id}": ${JSON.stringify(all_setting.get(self_id)?.[group_id] || {}, null, 2)}`;
            message = setting;
            break;
        default:
            message = `Error: 未知参数：${params[0]}`;
            break;
    }
    return message;
}
exports.settingHanders = settingHanders;
