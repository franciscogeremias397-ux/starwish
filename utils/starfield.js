const WORLD_WIDTH = 5000;
const WORLD_HEIGHT = 8000;

const WISH_STAR_COLORS = [
  '#FFE8A3',
  '#9DBBFF',
  '#FFD6F1',
  '#B8A7FF',
  '#C7FFF4'
];

function seededRandom(seed) {
  let value = seed % 2147483647;
  if (value <= 0) {
    value += 2147483646;
  }
  return function next() {
    value = value * 16807 % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function createBackgroundStars(count, seed = 920618) {
  const random = seededRandom(seed);
  const stars = [];

  for (let index = 0; index < count; index += 1) {
    const layerRoll = random();
    const layer = layerRoll < 0.58 ? 0 : layerRoll < 0.86 ? 1 : layerRoll < 0.97 ? 2 : 3;
    const size = layer === 0
      ? 0.35 + random() * 0.75
      : layer === 1
        ? 0.85 + random() * 0.95
        : layer === 2
          ? 1.45 + random() * 1.2
          : 2.2 + random() * 1.25;
    const colorRoll = random();
    const color = colorRoll < 0.48
      ? [232, 240, 255]
      : colorRoll < 0.78
        ? [170, 200, 255]
        : colorRoll < 0.94
          ? [214, 202, 255]
          : [255, 232, 190];

    stars.push({
      worldX: random() * WORLD_WIDTH,
      worldY: random() * WORLD_HEIGHT,
      size,
      alpha: layer === 0
        ? 0.16 + random() * 0.22
        : layer === 1
          ? 0.24 + random() * 0.28
          : 0.34 + random() * 0.36,
      phase: random() * Math.PI * 2,
      twinkle: 0.06 + random() * (layer > 1 ? 0.26 : 0.14),
      layer,
      color,
      glint: layer >= 2 && random() > 0.72,
      orbit: (random() > 0.5 ? 1 : -1) * (0.25 + random() * 0.75)
    });
  }

  return stars;
}

function galaxyBasePoint(t) {
  const x = -420 + t * (WORLD_WIDTH + 840);
  const y = 6400
    - t * 4550
    + Math.sin((t - 0.08) * Math.PI * 1.35) * 320
    + Math.sin(t * Math.PI * 3.6) * 90;

  return { x, y };
}

function galaxyNormal(t) {
  const before = galaxyBasePoint(Math.max(0, t - 0.004));
  const after = galaxyBasePoint(Math.min(1, t + 0.004));
  const dx = after.x - before.x;
  const dy = after.y - before.y;
  const length = Math.max(1, Math.sqrt(dx * dx + dy * dy));

  return {
    x: -dy / length,
    y: dx / length
  };
}

function createGalaxyParticles(count, seed = 610314) {
  const random = seededRandom(seed);
  const particles = [];

  for (let index = 0; index < count; index += 1) {
    const t = Math.pow(random(), 0.92);
    const base = galaxyBasePoint(t);
    const normal = galaxyNormal(t);
    const lane = (random() - 0.5) * (260 + random() * 920);
    const roll = random();
    const kind = roll < 0.12 ? 'cloud' : roll < 0.84 ? 'dust' : 'core';
    const jitter = kind === 'cloud' ? 80 : 22;
    const hueRoll = random();

    particles.push({
      worldX: base.x + normal.x * lane + (random() - 0.5) * jitter,
      worldY: base.y + normal.y * lane + (random() - 0.5) * jitter,
      size: kind === 'cloud'
        ? 90 + random() * 230
        : kind === 'dust'
          ? 1.4 + random() * 5.6
          : 0.7 + random() * 2.1,
      alpha: kind === 'cloud'
        ? 0.018 + random() * 0.05
        : kind === 'dust'
          ? 0.035 + random() * 0.12
          : 0.16 + random() * 0.22,
      hue: hueRoll < 0.38 ? 'blue' : hueRoll < 0.68 ? 'violet' : hueRoll < 0.86 ? 'white' : 'pink',
      phase: random() * Math.PI * 2,
      kind
    });
  }

  return particles;
}

function createNebulaClouds(count, seed = 330917) {
  const random = seededRandom(seed);
  const clouds = [];

  for (let index = 0; index < count; index += 1) {
    const roll = random();

    clouds.push({
      worldX: random() * WORLD_WIDTH,
      worldY: random() * WORLD_HEIGHT,
      radius: 180 + random() * 520,
      alpha: 0.025 + random() * 0.06,
      color: roll < 0.42 ? 'blue' : roll < 0.76 ? 'violet' : 'pink',
      phase: random() * Math.PI * 2
    });
  }

  return clouds;
}

function createInitialWishStars() {
  return [
    {
      id: 'public-star-001',
      starNo: 'No.000128',
      content: '希望今年可以顺利一点，也希望自己不要再那么内耗。',
      contentPreview: '希望今年可以顺利一点……',
      createdDate: '2026.06.17 23:48',
      ipRegion: '湖北',
      constellation: '狮子座',
      worldX: 3050,
      worldY: 1840,
      size: 4.2,
      brightness: 0.96,
      color: '#FFE8A3',
      phase: 0.4,
      isMine: false
    },
    {
      id: 'public-star-002',
      starNo: 'No.000129',
      content: '今天真的有点累，但我还是想再坚持一下。',
      contentPreview: '今天真的有点累……',
      createdDate: '2026.06.17 22:12',
      ipRegion: '广东',
      constellation: '双子座',
      worldX: 1300,
      worldY: 2960,
      size: 3.7,
      brightness: 0.88,
      color: '#9DBBFF',
      phase: 1.2,
      isMine: false
    },
    {
      id: 'public-star-003',
      starNo: 'No.000130',
      content: '愿我喜欢的人，也能被世界温柔以待。',
      contentPreview: '愿我喜欢的人……',
      createdDate: '2026.06.16 21:05',
      ipRegion: '浙江',
      constellation: '天秤座',
      worldX: 3700,
      worldY: 3040,
      size: 4,
      brightness: 0.9,
      color: '#FFD6F1',
      phase: 2.6,
      isMine: false
    },
    {
      id: 'public-star-004',
      starNo: 'No.000131',
      content: '希望妈妈身体健康，希望我也能早点成为可靠的大人。',
      contentPreview: '希望妈妈身体健康……',
      createdDate: '2026.06.15 23:18',
      ipRegion: '四川',
      constellation: '处女座',
      worldX: 900,
      worldY: 4160,
      size: 4.6,
      brightness: 0.92,
      color: '#B8A7FF',
      phase: 3.1,
      isMine: false
    },
    {
      id: 'public-star-005',
      starNo: 'No.000132',
      content: '想把焦虑放在这里，明天醒来能轻一点。',
      contentPreview: '想把焦虑放在这里……',
      createdDate: '2026.06.15 00:42',
      ipRegion: '北京',
      constellation: '白羊座',
      worldX: 4100,
      worldY: 4400,
      size: 3.8,
      brightness: 0.86,
      color: '#FFE8A3',
      phase: 4.2,
      isMine: false
    },
    {
      id: 'public-star-006',
      starNo: 'No.000133',
      content: '祝我面试顺利，也祝陌生的你今晚好梦。',
      contentPreview: '祝我面试顺利……',
      createdDate: '2026.06.14 20:36',
      ipRegion: '江苏',
      constellation: '天蝎座',
      worldX: 2700,
      worldY: 4800,
      size: 3.9,
      brightness: 0.89,
      color: '#9DBBFF',
      phase: 5.5,
      isMine: false
    }
  ];
}

function pickWishStarColor(seedValue) {
  const index = Math.abs(seedValue) % WISH_STAR_COLORS.length;
  return WISH_STAR_COLORS[index];
}

module.exports = {
  WORLD_WIDTH,
  WORLD_HEIGHT,
  WISH_STAR_COLORS,
  createBackgroundStars,
  createGalaxyParticles,
  createNebulaClouds,
  createInitialWishStars,
  pickWishStarColor,
  seededRandom
};
