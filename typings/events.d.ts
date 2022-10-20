import { DiscussMessage, EventMap, GroupMessage, PrivateMessage } from 'oicq';
import { BotMessage, UserLevel } from './core';
import { PluginMessage, PluginSetting } from './plugin';
import { BotLinkChannelEvent, PluginLinkChannelEvent, ThreadMessage } from './worker';
/** 移除对象指定类型 */
declare type OmitType<T, P> = Omit<T, {
    [K in keyof T]: T[K] extends P ? K : never;
}[keyof T]>;
/** 消息事件名 */
export declare type EventName = keyof EventMap;
/** 获取事件回调 event 参数 */
export declare type Parameter<T> = T extends (event: infer P) => void ? P : never;
/** bot 线程消息地图 */
declare type PostMessageMap = {
    [Key in EventName]: (event: OmitType<Parameter<EventMap[Key]>, Function>) => void;
};
export declare type ContextName = 'message' | 'message.group' | 'message.private';
/** 指令上下文 */
export declare type Context<Key extends ContextName> = Parameter<PostMessageMap[Key]> & {
    self_id: number;
    query: {
        [key: string]: any;
    };
    setting: PluginSetting;
    /** 权限等级 */
    permission_level: UserLevel;
    /** 快捷回复 */
    reply(message: string): void;
};
/** 指令事件 */
export declare type Event<Key extends EventName> = Parameter<PostMessageMap[Key]> & {
    self_id: number;
    setting: PluginSetting;
};
export declare type AllMessage = PrivateMessage | GroupMessage | DiscussMessage;
/** 工作线程事件地图 */
export interface ThreadEventMap<T = any> {
    'error': (err: Error) => void;
    'exit': (exitCode: number) => void;
    'message': (value: any) => void;
    'messageerror': (error: Error) => void;
    'online': () => void;
    /** 引发未捕获的异常 */
    "thread.error": (this: T, error: Error) => void;
    /** 线程停止 */
    "thread.exit": (this: T, code: number) => void;
    /** 调用 parentPort.postMessage() */
    "thread.message": (this: T, message: ThreadMessage) => void;
    /** 反序列化消息失败 */
    "thread.messageerror": (this: T, error: Error) => void;
    /** 开始执行 JavaScript 代码 */
    "thread.online": (this: T) => void;
    /** 控制台输入流 */
    "thread.process.stdin": (this: T, prefix?: string) => void;
}
/** bot 事件地图 */
export interface BotEventMap<T = any> {
    'close': () => void;
    'message': (value: any) => void;
    'messageerror': (error: Error) => void;
    /** 通道断开连接 */
    "bot.close": (this: T) => void;
    /** 调用 parentPort.postMessage() */
    "bot.message": (this: T, message: BotMessage) => void;
    /** 反序列化消息失败 */
    "bot.messageerror": (this: T, error: Error) => void;
    /** 绑定插件线程通信 */
    "bot.link.channel": (this: T, event: BotLinkChannelEvent) => void;
    "thread.process.stdout": (this: T, content: string) => void;
}
/** 插件事件地图 */
export interface PluginEventMap<T = any> {
    'close': () => void;
    'message': (value: any) => void;
    'messageerror': (error: Error) => void;
    /** 通道断开连接 */
    "plugin.close": (this: T) => void;
    /** 调用 parentPort.postMessage() */
    "plugin.message": (this: T, message: PluginMessage) => void;
    /** 反序列化消息失败 */
    "plugin.messageerror": (this: T, error: Error) => void;
    /** 绑定 bot 线程通信 */
    "plugin.link.channel": (this: T, event: PluginLinkChannelEvent) => void;
}
export {};