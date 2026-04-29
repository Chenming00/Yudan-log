'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface GreetingItem {
  text: string;
  emoji: string;
  sub: string;
}

const greetings: Record<string, GreetingItem[]> = {
  night: [
    { text: '夜深了', emoji: '🌙', sub: '宝宝乖乖睡觉觉' },
    { text: '夜深了', emoji: '🌙', sub: '宝贝早点睡，晚安' },
    { text: '夜深了', emoji: '🌟', sub: '小鱼蛋该做美梦啦' },
    { text: '夜深了', emoji: '💤', sub: '月亮出来了，睡觉觉' },
    { text: '夜深了', emoji: '🧸', sub: '抱着小熊一起入睡吧' },
  ],
  morning: [
    { text: '早安', emoji: '☀️', sub: '鱼蛋起床啦，新的一天' },
    { text: '早安', emoji: '🌤', sub: '小懒虫醒了吗' },
    { text: '早安', emoji: '🍼', sub: '先喝瓶奶奶再说' },
    { text: '早安', emoji: '🌸', sub: '今天也要开开心心的呀' },
    { text: '早安', emoji: '🐣', sub: '鱼蛋早安，太阳公公出来了' },
    { text: '早安', emoji: '✨', sub: '新的一天，新的冒险' },
  ],
  noon: [
    { text: '午安', emoji: '🌤', sub: '吃饱饱，睡个午觉' },
    { text: '午安', emoji: '🍚', sub: '午饭时间，要好好吃饭哦' },
    { text: '午安', emoji: '😴', sub: '午安，小憩一下' },
    { text: '午安', emoji: '🌞', sub: '太阳当头照，该休息啦' },
  ],
  afternoon: [
    { text: '下午好', emoji: '☕', sub: '喝奶奶，继续玩耍' },
    { text: '下午好', emoji: '🍪', sub: '下午茶时间到' },
    { text: '下午好', emoji: '🎈', sub: '下午也要元气满满哦' },
    { text: '下午好', emoji: '🌈', sub: '玩了一下午累不累呀' },
    { text: '下午好', emoji: '🧸', sub: '下午好，小宝贝在干嘛呢' },
  ],
  evening: [
    { text: '晚上好', emoji: '🌆', sub: '今天有没有乖乖的呀' },
    { text: '晚上好', emoji: '🍲', sub: '晚饭吃饱了吗' },
    { text: '晚上好', emoji: '🌟', sub: '辛苦啦，放松一下' },
    { text: '晚上好', emoji: '🎶', sub: '晚上好，听听音乐吧' },
    { text: '晚上好', emoji: '🛁', sub: '洗香香准备睡觉啦' },
  ],
};

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getGreeting(): GreetingItem {
  const hour = new Date().getHours();
  if (hour < 6) return pickRandom(greetings.night);
  if (hour < 11) return pickRandom(greetings.morning);
  if (hour < 14) return pickRandom(greetings.noon);
  if (hour < 18) return pickRandom(greetings.afternoon);
  if (hour < 22) return pickRandom(greetings.evening);
  return pickRandom(greetings.night);
}

const defaultGreeting: GreetingItem = { text: '你好', emoji: '👋', sub: '欢迎回来' };

export function Greeting() {
  const [greeting, setGreeting] = useState<GreetingItem>(defaultGreeting);

  useEffect(() => {
    setGreeting(getGreeting());
  }, []);

  return (
    <div className="relative flex items-center gap-4 px-1 py-2 sm:gap-5">
      <div className="relative shrink-0">
        <Image
          src="/apple-home-logo.png"
          alt="头像"
          width={52}
          height={52}
          sizes="52px"
          className="h-[52px] w-[52px] rounded-2xl object-cover shadow-sm sm:h-16 sm:w-16"
          priority
        />
      </div>
      <div>
        <h1 className="text-[22px] font-bold tracking-tight text-foreground sm:text-2xl">
          {greeting.text}，{greeting.emoji}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5 sm:text-base">{greeting.sub}</p>
      </div>
    </div>
  );
}
