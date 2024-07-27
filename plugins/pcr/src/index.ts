import { stringToNumber } from '@kokkoro/utils';
import { CommandContext, Metadata, useCommand } from '@kokkoro/core';
import {
  Service,
  calcMakeUpTime,
  recordSituation,
  getKnockOffMeme,
  hitMonster,
  initClanBattle,
  killMonster,
  knockOff,
  parseProgress,
  revokeHit,
  skipLap,
  terminateClanBattle,
} from '@/service.js';

export interface Member {
  id: string;
  name?: string;
}

function parseId(ctx: CommandContext): string {
  if (ctx.t === 'AT_MESSAGE_CREATE') {
    return ctx.guild_id;
  } else {
    return ctx.group_openid;
  }
}

function parseMember(ctx: CommandContext): Member {
  if (ctx.t === 'AT_MESSAGE_CREATE') {
    return {
      id: ctx.author.id,
      name: ctx.author.username,
    };
  } else {
    return {
      id: ctx.author.member_openid,
    };
  }
}

async function sendImage(ctx: CommandContext, url: string) {
  if (ctx.t === 'AT_MESSAGE_CREATE') {
    return ctx.api.sendChannelMessage(ctx.channel_id, {
      msg_id: ctx.id,
      image: url,
    });
  }
  const result: any = await ctx.api.sendGroupFile(ctx.group_openid, {
    file_type: 1,
    srv_send_msg: false,
    url,
  });

  if (result.data?.code) {
    return ctx.api.sendGroupMessage(ctx.group_openid, {
      msg_id: ctx.id,
      msg_type: 0,
      content: `图片发送失败 (っ °Д °;)っ\nCode ${result.data.code}, ${result.data?.message}`,
    });
  } else {
    return ctx.api.sendGroupMessage(ctx.group_openid, {
      msg_id: ctx.id,
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
  useCommand<{ service: Service }>('/发起会战 <service>', ctx => {
    const id = parseId(ctx);
    return initClanBattle(id, ctx.query.service);
  });
  useCommand('/结束会战', ctx => {
    const id = parseId(ctx);
    return terminateClanBattle(id);
  });
  useCommand('/状态', async ctx => {
    const id = parseId(ctx);
    return await parseProgress(id);
  });
  useCommand<{ boss: string; damage: string }>('/报刀 <boss> <damage>', ctx => {
    const id = parseId(ctx);
    const member = parseMember(ctx);
    const { boss, damage } = ctx.query;

    return hitMonster(id, member, stringToNumber(boss), stringToNumber(damage));
  });
  useCommand<{ boss: string }>('/尾刀 <boss>', ctx => {
    const id = parseId(ctx);
    const member = parseMember(ctx);
    const { boss } = ctx.query;

    return killMonster(id, member, stringToNumber(boss));
  });
  useCommand('/撤销', ctx => {
    const id = parseId(ctx);
    const member = parseMember(ctx);

    return revokeHit(id, member);
  });
  useCommand('/预约', () => '目前机器人无法获取到用户昵称，也不能在群聊 at 成员，暂未支持');
  useCommand('/激爽下班', async ctx => {
    const id = parseId(ctx);
    const member = parseMember(ctx);
    const message = await knockOff(id, member);

    if (message) {
      return message;
    } else {
      const image = getKnockOffMeme();
      await sendImage(ctx, image);
    }
  });
  useCommand<{ lap: string }>('/周目 <lap>', async ctx => {
    const id = parseId(ctx);
    const { lap } = ctx.query;

    return await skipLap(id, stringToNumber(lap));
  });
  useCommand<{ health: string; first: string; last: string }>('/合刀计算 <health> <first> <last>', ctx => {
    const { health, first, last } = ctx.query;
    return calcMakeUpTime(health, first, last);
  });
  useCommand<{ boss: string }>('/出刀 <boss>', ctx => {
    const { boss } = ctx.query;
    const id = parseId(ctx);
    const member = parseMember(ctx);

    return recordSituation(id, member, stringToNumber(boss), 'fight');
  });
  useCommand<{ boss: string }>('/挂树 <boss>', ctx => {
    const { boss } = ctx.query;
    const id = parseId(ctx);
    const member = parseMember(ctx);

    return recordSituation(id, member, stringToNumber(boss), 'hang');
  });
}
