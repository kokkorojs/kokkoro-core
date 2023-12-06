import { Bot, CommandEvent, Metadata, useCommand } from '@kokkoro/core';
import {
  hitMonster,
  initClanBattle,
  killMonster,
  knockOff,
  parseProgress,
  revokeHit,
  terminateClanBattle,
} from '@/service.js';

export interface Member {
  id: string;
  name?: string;
}

function parseId(event: CommandEvent): string {
  if (event.t === 'AT_MESSAGE_CREATE') {
    return event.guild_id;
  } else {
    return event.group_openid;
  }
}

function parseMember(event: CommandEvent): Member {
  if (event.t === 'AT_MESSAGE_CREATE') {
    return {
      id: event.author.id,
      name: event.author.username,
    };
  } else {
    return {
      id: event.author.member_openid,
    };
  }
}

async function sendImage(event: CommandEvent, bot: Bot, url: string) {
  if (event.t === 'AT_MESSAGE_CREATE') {
    return bot.api.sendChannelMessage(event.channel_id, {
      msg_id: event.id,
      image: url,
    });
  }
  const result: any = await bot.api.sendGroupFile(event.group_openid, {
    file_type: 1,
    srv_send_msg: false,
    url,
  });

  if (result.data?.code) {
    return bot.api.sendGroupMessage(event.group_openid, {
      msg_id: event.id,
      msg_type: 0,
      content: `图片发送失败 (っ °Д °;)っ\nCode ${result.data.code}, ${result.data?.message}`,
    });
  } else {
    return bot.api.sendGroupMessage(event.group_openid, {
      msg_id: event.id,
      msg_type: 7,
      content: '(oﾟvﾟ)ノ',
      media: {
        file_info: result.data.file_info,
      },
    });
  }
}

export const metadata: Metadata = {
  name: 'pcr',
  description: '公主连结',
};

export default function Priconne() {
  useCommand('/发起会战 <service>', event => {
    const id = parseId(event);
    return initClanBattle(id, event.query.service);
  });
  useCommand('/结束会战', event => {
    const id = parseId(event);
    return terminateClanBattle(id);
  });
  useCommand('/状态', event => {
    const id = parseId(event);
    return parseProgress(id);
  });
  useCommand('/报刀 <boss> <damage>', event => {
    const id = parseId(event);
    const member = parseMember(event);
    const { boss, damage } = event.query;

    return hitMonster(id, member, +boss, +damage);
  });
  useCommand('/尾刀 <boss>', event => {
    const id = parseId(event);
    const member = parseMember(event);
    const { boss } = event.query;

    return killMonster(id, member, +boss);
  });
  useCommand('/撤销', event => {
    const id = parseId(event);
    const member = parseMember(event);

    return revokeHit(id, member);
  });
  useCommand('/预约', () => '目前机器人无法获取到用户昵称，也不能在群聊 at 成员，暂未支持');
  useCommand('/激爽下班', async (event, bot) => {
    const memes = [
      'https://vip2.loli.io/2023/11/23/SR19wsgjAQ4HVi6.png',
      'https://vip2.loli.io/2023/11/23/Jo9q6uDTfEbv4c7.png',
      'https://vip2.loli.io/2023/11/23/val9ThHxz1MVNuF.png',
    ];
    const random = Math.floor(Math.random() * memes.length);
    const image = memes[random];
    const id = parseId(event);
    const member = parseMember(event);
    const message = await knockOff(id, member);

    if (message) {
      return message;
    } else {
      await sendImage(event, bot, image);
    }
  });
}
