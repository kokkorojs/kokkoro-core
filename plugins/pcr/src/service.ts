import { Database } from '@kokkoro/database';
import { stringToNumber } from '@kokkoro/utils';
import { Member } from '@/index.js';

export type Service = 'jp' | 'tw' | 'cn';

interface ClanBattleInfo {
  /** 服务器 */
  service: Service;
  /** 阶段 */
  ranges: number[];
  /** 血量 */
  healths: number[][];
  /** 分数率 */
  multipliers: number[][];
}

enum Stage {
  A,
  B,
  C,
  D,
  E,
}

const memes = [
  'https://vip2.loli.io/2023/11/23/SR19wsgjAQ4HVi6.png',
  'https://vip2.loli.io/2023/11/23/Jo9q6uDTfEbv4c7.png',
  'https://vip2.loli.io/2023/11/23/val9ThHxz1MVNuF.png',
];
const digits = ['一', '二', '三', '四', '五'];
const clanBattleInfos: ClanBattleInfo[] = [
  {
    service: 'jp',
    ranges: [0, 6, 22, Infinity],
    healths: [
      [9_000_000, 12_000_000, 15_000_000, 18_000_000, 23_000_000],
      [12_000_000, 15_000_000, 20_000_000, 23_000_000, 30_000_000],
      [35_000_000, 40_000_000, 45_000_000, 50_000_000, 58_000_000],
      [540_000_000, 560_000_000, 600_000_000, 620_000_000, 640_000_000],
    ],
    multipliers: [
      [1.2, 1.2, 1.3, 1.4, 1.5],
      [1.6, 1.6, 1.8, 1.9, 2.0],
      [2.0, 2.0, 2.1, 2.1, 2.2],
      [4.5, 4.5, 4.7, 4.8, 5.0],
    ],
  },
  {
    service: 'tw',
    ranges: [0, 6, 22, Infinity],
    healths: [
      [9_000_000, 12_000_000, 15_000_000, 18_000_000, 23_000_000],
      [12_000_000, 15_000_000, 20_000_000, 23_000_000, 30_000_000],
      [35_000_000, 40_000_000, 45_000_000, 50_000_000, 58_000_000],
      [540_000_000, 560_000_000, 600_000_000, 620_000_000, 640_000_000],
    ],
    multipliers: [
      [1.2, 1.2, 1.3, 1.4, 1.5],
      [1.6, 1.6, 1.8, 1.9, 2.0],
      [2.0, 2.0, 2.1, 2.1, 2.2],
      [4.5, 4.5, 4.7, 4.8, 5.0],
    ],
  },
  {
    service: 'cn',
    ranges: [3, 10, 30, 38, Infinity],
    healths: [
      [6_000_000, 8_000_000, 10_000_000, 12_000_000, 15_000_000],
      [6_000_000, 8_000_000, 10_000_000, 12_000_000, 15_000_000],
      [12_000_000, 14_000_000, 17_000_000, 19_000_000, 22_000_000],
      [19_000_000, 20_000_000, 23_000_000, 25_000_000, 27_000_000],
      [95_000_000, 100_000_000, 110_000_000, 120_000_000, 130_000_000],
    ],
    multipliers: [
      [1.2, 1.2, 1.3, 1.4, 1.5],
      [1.6, 1.6, 1.8, 1.9, 2.0],
      [2.0, 2.0, 2.4, 2.4, 2.6],
      [3.5, 3.5, 3.7, 3.8, 4.0],
      [3.5, 3.5, 3.7, 3.8, 4.0],
    ],
  },
];

/** boss */
interface Monster {
  /** hp，为 -1 时表示满血 */
  hp: number;
  /** 周目 */
  lap: number;
  /** 状况 */
  situation: {
    fight: number;
    hang: number;
  };
}

/** 出刀信息 */
interface Hit {
  /** 成员 */
  member: Member;
  /** 周目 */
  lap: number;
  /** boss */
  boss: number;
  /** 伤害 */
  damage: number;
  /** 分数 */
  score: number;
  /** 是否斩杀 */
  is_kill: boolean;
  /** 时间戳 */
  timestamp: number;
}

/** 星座 */
type Zodiac =
  | 'Aries'
  | 'Taurus'
  | 'Gemini'
  | 'Cancer'
  | 'Leo'
  | 'Virgo'
  | 'Libra'
  | 'Scorpio'
  | 'Sagittarius'
  | 'Capricorn'
  | 'Aquarius'
  | 'Pisces'
  | 'Ophiuchus';
interface Constellation {
  name: Zodiac;
  month: number;
  day: number;
  emoji: string;
}

const constellations: Constellation[] = [
  { name: 'Capricorn', month: 1, day: 19, emoji: '♑' },
  { name: 'Aquarius', month: 1, day: 20, emoji: '♒' },
  { name: 'Pisces', month: 2, day: 19, emoji: '♓' },
  { name: 'Aries', month: 3, day: 21, emoji: '♈' },
  { name: 'Taurus', month: 4, day: 20, emoji: '♉' },
  { name: 'Gemini', month: 5, day: 21, emoji: '♊' },
  { name: 'Cancer', month: 6, day: 22, emoji: '♋' },
  { name: 'Leo', month: 7, day: 23, emoji: '♌' },
  { name: 'Virgo', month: 8, day: 23, emoji: '♍' },
  { name: 'Libra', month: 9, day: 23, emoji: '♎' },
  { name: 'Scorpio', month: 10, day: 23, emoji: '♏' },
  { name: 'Sagittarius', month: 11, day: 22, emoji: '♐' },
  { name: 'Ophiuchus', month: 2, day: 30, emoji: '⛎' },
];

/**
 * 获取当月星座
 *
 * @returns 星座
 */
function getCurrentZodiac(): string {
  const date = new Date();
  const currentMonth = date.getMonth() + 1;
  const currentDay = date.getDate();
  const constellation = constellations.find(({ month, day }) => {
    return currentMonth < month || (currentMonth === month && currentDay <= day);
  })!;

  return `${constellation.emoji} (${constellation.name})`;
}

/**
 * 会战进度
 */
interface Progress {
  /** 服务器 */
  service: Service;
  /** 星座 */
  zodiac: string;
  /** 周目 */
  lap: number;
  /** boss 信息 */
  monsters: Monster[];
  /** 出刀信息 */
  hits: Hit[];
}

const db = new Database<Record<string, Progress>>('pcr', {
  valueEncoding: 'json',
});

/**
 * 获取会战信息
 *
 * @param service - 服务器
 * @returns 会战信息
 */
function getClanBattleInfo(service: Service): ClanBattleInfo | null {
  for (const clanBattleInfo of clanBattleInfos) {
    if (clanBattleInfo.service !== service) {
      continue;
    }
    return clanBattleInfo;
  }
  return null;
}

/**
 * 获取当前阶段
 *
 * @param lap - 周目
 * @param service - 服务器
 * @returns 阶段
 */
function getStage(lap: number, service: Service): number {
  const clanBattleInfo = getClanBattleInfo(service);

  if (!clanBattleInfo) {
    throw new Error('未能获取服务器信息');
  }
  return clanBattleInfo.ranges.findIndex(range => range >= lap);
}

/**
 * 查询传入的时间戳是否是兰德索尔时间（次日 5 点前）
 *
 * @param timestamp - 时间戳
 * @returns 布尔值
 */
function isToday(timestamp: number): boolean {
  const nowDate = new Date();
  const hitDate = new Date(timestamp);

  const now_day = nowDate.getDate();
  const hit_day = hitDate.getDate();
  const hit_hours = hitDate.getHours();

  return hit_day === now_day && hit_hours >= 5;
}

/**
 * 获取成员当日出刀数
 *
 * @param id - 成员 id
 * @param hits - 出刀记录
 * @returns 当日出刀总数
 */
function getMemberTodayHitCount(id: string, hits: Hit[]): number {
  const todayHits = hits.filter(hit => hit.member.id === id && isToday(hit.timestamp));
  const hit_count = todayHits.reduce((accumulator, current) => {
    const is_integer = Number.isInteger(accumulator);

    if (!is_integer) {
      return Math.ceil(accumulator);
    }
    return accumulator + (current.is_kill ? 0.5 : 1);
  }, 0);

  return hit_count;
}

/**
 * 更新下一周目会战进度
 *
 * @param progress - 会战进度
 * @returns 更新后的数据
 */
function nextLap(progress: Progress) {
  const { service, lap, monsters } = progress;
  const { ranges } = getClanBattleInfo(service)!;
  const range = ranges.find(range => range >= lap)!;

  for (const monster of monsters) {
    if (monster.hp || monster.lap === lap + 1 || monster.lap === range) {
      continue;
    }
    monster.lap++;
    monster.hp = -1;
  }
  const is_next_lap = monsters.every(monster => monster.lap === lap + 1);
  const is_next_stage = monsters.every(monster => monster.hp === 0);

  if (!is_next_lap && !is_next_stage) {
    return;
  }
  progress.lap++;
  nextLap(progress);

  if (is_next_stage) {
    const stage = getStage(progress.lap, progress.service);
    return `开始第 ${progress.lap} 周目，当前已进入 ${Stage[stage]} 阶段，不要抄错了作业哦`;
  } else {
    return `开始第 ${progress.lap} 周目`;
  }
}

/**
 * 结束会战
 *
 * @param id - 群聊 id
 */
export async function terminateClanBattle(id: string): Promise<string> {
  const has_battle = await db.has(id);

  if (!has_battle) {
    return '当月未发起会战 (⊙x⊙;)';
  }
  await db.del(id);
  return `会战已结束 (●'◡'●)`;
}

/**
 * 发起会战
 *
 * @param id - 群聊 id
 * @param service - 服务器
 */
export async function initClanBattle(id: string, service: Service): Promise<string> {
  const has_battle = await db.has(id);

  if (has_battle) {
    return '当月已发起过会战，如果要开启新一轮会战，请先结束当前会战 (oﾟvﾟ)ノ';
  }
  const clanBattleInfo = getClanBattleInfo(service);

  if (!clanBattleInfo) {
    return `未获取到服务器信息，当前有效值：[cn, jp, tw]`;
  }
  const monsters: Monster[] = [];
  const lap = 1;
  const progress: Progress = {
    service,
    zodiac: getCurrentZodiac(),
    lap,
    monsters,
    hits: [],
  };

  for (let i = 0; i < 5; i++) {
    const monster: Monster = {
      lap,
      hp: -1,
      situation: {
        fight: 0,
        hang: 0,
      },
    };
    monsters.push(monster);
  }
  await db.put(id, progress);
  return `已开启会战 (*/ω＼*)\n\n${await parseProgress(id)}`;
}

/**
 * 解析会战状态
 *
 * @param id - 群聊 id
 * @returns 当前状态信息
 */
export async function parseProgress(id: string): Promise<string> {
  const has_battle = await db.has(id);

  if (!has_battle) {
    return '当月未发起会战 (⊙x⊙;)';
  }
  const progress = await db.get(id);
  const messages = [];
  const stage = getStage(progress.lap, progress.service)!;
  const clanBattleInfo = getClanBattleInfo(progress.service)!;
  const healths = clanBattleInfo.healths[stage];

  messages.push(`${progress.zodiac} 当前 ${progress.lap} 周目，${Stage[stage]} 阶段：`);
  progress.monsters.map((monster, index) => {
    const health = healths[index];
    const hp = monster.hp === -1 ? health : monster.hp;
    const prefix = index !== 4 ? '├' : '└';

    messages.push(`${prefix} (${monster.lap}) ${hp.toLocaleString()} / ${health.toLocaleString()}`);

    if (monster.situation.fight || monster.situation.hang) {
      messages.push(`│ └ 🔪 (${monster.situation.fight}) 🌲 (${monster.situation.hang})`);
    }
  });
  return messages.join('\n');
}

/**
 * 斩杀 boss
 *
 * @param id - 群聊 id
 * @param member - 成员
 * @param boss - boss
 * @returns 出刀信息
 */
export function killMonster(id: string, member: Member, boss: number): Promise<string> {
  return hitMonster(id, member, boss, Infinity);
}

/**
 * 记录出刀
 *
 * @param id - 群聊 id
 * @param member - 成员
 * @param boss - boss
 * @param damage - 伤害
 * @returns 出刀信息
 */
export async function hitMonster(id: string, member: Member, boss: number, damage: number): Promise<string> {
  const has_battle = await db.has(id);

  if (!has_battle) {
    return '当月未发起会战 (⊙x⊙;)';
  }
  if (![1, 2, 3, 4, 5].includes(boss) || isNaN(damage)) {
    return '请输入合法的数值，boss 应为 1 ~ 5，damage 应该是数字 (╬▔皿▔)╯';
  }
  const monster_index = boss - 1;
  const progress = await db.get(id);
  const monsters = progress.monsters;
  const hits = progress.hits;
  const stage = getStage(progress.lap, progress.service)!;
  const clanBattleInfo = getClanBattleInfo(progress.service)!;
  const healths = clanBattleInfo.healths[stage];
  const health = healths[monster_index];
  const hp = monsters[monster_index].hp === -1 ? health : <number>monsters[monster_index].hp;

  if (damage === Infinity) {
    damage = hp;
  }
  const today_hit_count = getMemberTodayHitCount(member.id, hits);

  if (today_hit_count === 3) {
    return '你今天已经出完 3 刀啦 (～￣▽￣)～';
  } else if (hp === 0) {
    return 'boss 已经寄了 (；′⌒`)';
  } else if (hp < damage) {
    return '超出 boss 血量上限 Pia!(ｏ ‵-′)ノ”(ノ﹏<。)';
  } else if (!damage) {
    return '喜欢 0 不喜欢 1 是么？ψ(._. )>';
  }

  const multipliers = clanBattleInfo.multipliers[stage];
  const multiplier = multipliers[monster_index];

  monsters[monster_index].hp = hp - damage;

  const hit: Hit = {
    member,
    lap: monsters[monster_index].lap,
    boss,
    damage,
    is_kill: !monsters[monster_index].hp,
    score: damage * multiplier,
    timestamp: Date.now(),
  };
  progress.hits.push(hit);
  let next_message: string | undefined;

  if (!monsters[monster_index].hp) {
    monsters[monster_index].situation.fight = 0;
    monsters[monster_index].situation.hang = 0;
    next_message = nextLap(progress);
  }
  await db.put(id, progress);
  const progress_message = await parseProgress(id);

  return `${member.name ?? ''}对${digits[monster_index]}王造成 ${damage} 点伤害${
    next_message ? `，${next_message}` : ''
  }\n\n${progress_message}`;
}

/**
 * 撤销上次出刀记录（跨周目无法撤销）
 *
 * @param id - 群聊 id
 * @param member - 成员
 * @returns 撤销信息
 */
export async function revokeHit(id: string, member: Member): Promise<string> {
  const has_battle = await db.has(id);

  if (!has_battle) {
    return '当月未发起会战 (⊙x⊙;)';
  }
  const progress = await db.get(id);
  const today_hit_count = getMemberTodayHitCount(member.id, progress.hits);

  if (!today_hit_count) {
    return '你今天还没出过刀呢！(¬_¬")';
  }
  const hit_index = progress.hits.findLastIndex(hit => hit.member.id === member.id);
  const hit = progress.hits[hit_index];

  if (hit.lap < progress.lap) {
    return '当前 boss 已不在出刀时的同一轮，无法撤销 ㄟ( ▔, ▔ )ㄏ';
  }
  const monster_index = hit.boss - 1;
  const monster = progress.monsters[monster_index];

  const stage = getStage(progress.lap, progress.service)!;
  const clanBattleInfo = getClanBattleInfo(progress.service)!;
  const healths = clanBattleInfo.healths[stage];
  const health = healths[monster_index];

  if (monster.lap === hit.lap) {
    const hp = monster.hp + hit.damage;
    monster.hp = hp === health ? -1 : hp;
  } else {
    monster.lap--;
    monster.hp = hit.damage;
  }
  progress.hits.splice(hit_index, 1);
  await db.put(id, progress);

  return `已撤销上一次出刀记录 (。・ω・。)\n\n${await parseProgress(id)}`;
}

/**
 * 激爽下班（快速记录成员剩余的出刀数），暂时没用，后续可用于预约、查刀、催刀等功能
 *
 * @param id - 群聊 id
 * @param member - 成员
 * @returns 下班信息
 */
export async function knockOff(id: string, member: Member): Promise<string | void> {
  const has_battle = await db.has(id);

  if (!has_battle) {
    return '当月未发起会战 (⊙x⊙;)';
  }
  const progress = await db.get(id);
  const today_hit_count = getMemberTodayHitCount(member.id, progress.hits);

  if (today_hit_count === 3) {
    return '你今天已经出完 3 刀啦 (～￣▽￣)～';
  }
  const hit: Hit = {
    member,
    lap: progress.lap,
    boss: 0,
    damage: 0,
    is_kill: false,
    score: 0,
    timestamp: Date.now(),
  };

  for (let i = today_hit_count; i < 3; i++) {
    progress.hits.push(hit);
  }
  await db.put(id, progress);
}

export function getKnockOffMeme(): string {
  const random = Math.floor(Math.random() * memes.length);
  const image = memes[random];

  return image;
}

export async function skipLap(id: string, lap: number) {
  const has_battle = await db.has(id);

  if (!has_battle) {
    return '当月未发起会战 (⊙x⊙;)';
  } else if (lap <= 0 || isNaN(lap)) {
    return '请输入合法的数值，lap 应该是正整数 (╬▔皿▔)╯';
  }
  const progress = await db.get(id);

  progress.lap = lap;
  progress.monsters.map(monster => {
    monster.hp = -1;
    monster.lap = lap;
  });
  await db.put(id, progress);

  return `已强制跳至 ${lap} 周目`;
}

/**
 * 记录战况
 *
 * @param id - 群聊 id
 * @param member - 成员
 * @param boss - boss
 * @param type - 战况类型
 * @returns 进度信息
 */
export async function recordSituation(
  id: string,
  member: Member,
  boss: number,
  type: 'fight' | 'hang',
): Promise<string> {
  const has_battle = await db.has(id);

  if (!has_battle) {
    return '当月未发起会战 (⊙x⊙;)';
  }
  if (![1, 2, 3, 4, 5].includes(boss)) {
    return '请输入合法的数值，boss 应为 1 ~ 5';
  }
  const monster_index = boss - 1;
  const progress = await db.get(id);
  const monsters = progress.monsters;
  const hits = progress.hits;
  const stage = getStage(progress.lap, progress.service)!;
  const clanBattleInfo = getClanBattleInfo(progress.service)!;
  const healths = clanBattleInfo.healths[stage];
  const health = healths[monster_index];
  const hp = monsters[monster_index].hp === -1 ? health : <number>monsters[monster_index].hp;
  const today_hit_count = getMemberTodayHitCount(member.id, hits);

  if (today_hit_count === 3) {
    return '你今天已经出完 3 刀啦 (～￣▽￣)～';
  } else if (hp === 0) {
    return 'boss 已经寄了 (；′⌒`)';
  }
  monsters[monster_index].situation[type]++;
  await db.put(id, progress);
  const progress_message = await parseProgress(id);

  switch (type) {
    case 'fight':
      return `${member.name ?? ''}开始挑战${digits[monster_index]}王\n\n${progress_message}`;
    case 'hang':
      return `${member.name ?? ''}在${digits[monster_index]}王挂树力（悲）\n\n${progress_message}`;
  }
}

/**
 * 计算 [e=110-(90-t)/(d/b)] 的结果，方程式取自 {@link https://github.com/watermellye/pcr_calculator_plus PCR ClanBattle Calculator}。
 *
 * @param t - 剩余秒数
 * @param d - 造成伤害
 * @param b - boss 血量
 * @returns 有解则返回解的向上取整结果
 */
function solveEquation(t: number, d: number, b: number) {
  const x = d / b;
  const y = 90 - t;
  const e = Math.min(90, Math.ceil(110 - y / x));

  return e;
}

/**
 * 计算合刀补偿时间，目前仅支持 BDD 计算。
 *
 * @param health - boss 血量
 * @param firstDamage - 第一次伤害
 * @param lastDamage - 最后一次伤害
 * @returns 补偿信息
 */
export function calcMakeUpTime(health: string, firstDamage: string, lastDamage: string): string {
  // TODO: ／人◕ ‿‿ ◕人＼ 增加更多计算方式
  const healthNumber = stringToNumber(health);
  const firstDamageNumber = stringToNumber(firstDamage);
  const lastDamageNumber = stringToNumber(lastDamage);

  return [
    `boss血量=${health}`,
    `对boss伤害=${firstDamage} | ${lastDamage}`,
    `若[${firstDamageNumber}]先出，[${lastDamageNumber}]后出，补偿${solveEquation(0, lastDamageNumber, healthNumber - firstDamageNumber)}s`,
    `若[${lastDamageNumber}]先出，[${firstDamageNumber}]后出，补偿${solveEquation(0, firstDamageNumber, healthNumber - lastDamageNumber)}s`,
  ].join('\n');
}
