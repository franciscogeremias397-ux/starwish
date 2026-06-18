const {
  WORLD_WIDTH,
  WORLD_HEIGHT,
  createBackgroundStars,
  createGalaxyParticles,
  createNebulaClouds,
  pickWishStarColor
} = require('../../utils/starfield');
const { KEYS } = require('../../utils/storage');
const { formatDate } = require('../../utils/time');

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function distance(a, b) {
  const dx = a.clientX - b.clientX;
  const dy = a.clientY - b.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function easeOutQuart(t) {
  return 1 - Math.pow(1 - t, 4);
}

function easeInOutSine(t) {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

function cubicPoint(start, controlA, controlB, end, t) {
  const oneMinusT = 1 - t;
  return {
    x: oneMinusT * oneMinusT * oneMinusT * start.x
      + 3 * oneMinusT * oneMinusT * t * controlA.x
      + 3 * oneMinusT * t * t * controlB.x
      + t * t * t * end.x,
    y: oneMinusT * oneMinusT * oneMinusT * start.y
      + 3 * oneMinusT * oneMinusT * t * controlA.y
      + 3 * oneMinusT * t * t * controlB.y
      + t * t * t * end.y
  };
}

function lerp(start, end, t) {
  return start + (end - start) * t;
}

Component({
  properties: {
    wishStars: {
      type: Array,
      value: [],
      observer(value) {
        this.stars = Array.isArray(value) ? value : [];
      }
    },
    animationLevel: {
      type: String,
      value: 'standard'
    }
  },

  data: {},

  lifetimes: {
    ready() {
      this.stars = this.properties.wishStars || [];
      this.backgroundStars = createBackgroundStars(2300);
      this.galaxyParticles = createGalaxyParticles(1700);
      this.nebulaClouds = createNebulaClouds(36);
      this.particles = [];
      this.meteor = null;
      this.birthGlow = null;
      this.touchState = null;
      this.frameHandle = null;
      this.destroyed = false;
      this.initCanvas();
    },

    detached() {
      this.destroyed = true;
      if (this.frameHandle && this.canvas && this.canvas.cancelAnimationFrame) {
        this.canvas.cancelAnimationFrame(this.frameHandle);
      }
    }
  },

  methods: {
    initCanvas() {
      const query = wx.createSelectorQuery().in(this);
      query.select('#starCanvas').fields({ node: true, size: true }).exec((res) => {
        const canvasInfo = res && res[0];
        if (!canvasInfo || !canvasInfo.node) {
          return;
        }

        const systemInfo = wx.getSystemInfoSync();
        const canvas = canvasInfo.node;
        const ctx = canvas.getContext('2d');
        const dpr = systemInfo.pixelRatio || 1;

        this.canvas = canvas;
        this.ctx = ctx;
        this.dpr = dpr;
        this.width = canvasInfo.width;
        this.height = canvasInfo.height;
        this.safeTop = systemInfo.safeArea ? systemInfo.safeArea.top : 24;

        canvas.width = this.width * dpr;
        canvas.height = this.height * dpr;
        ctx.scale(dpr, dpr);

        const savedCamera = wx.getStorageSync(KEYS.LAST_CAMERA_STATE);
        const defaultCamera = {
          x: WORLD_WIDTH / 2 - this.width / 2,
          y: WORLD_HEIGHT * 0.53 - this.height / 2,
          zoom: 1
        };

        this.camera = savedCamera
          && savedCamera.visualVersion === 2
          && typeof savedCamera.x === 'number'
          ? savedCamera
          : defaultCamera;
        this.camera = this.clampCamera(this.camera);

        this.startLoop();
      });
    },

    startLoop() {
      const tick = () => {
        if (this.destroyed) {
          return;
        }
        this.render(Date.now());
        if (this.canvas && this.canvas.requestAnimationFrame) {
          this.frameHandle = this.canvas.requestAnimationFrame(tick);
        } else {
          this.frameHandle = setTimeout(tick, 16);
        }
      };

      tick();
    },

    clampCamera(camera) {
      const zoom = clamp(camera.zoom || 1, 0.6, 2.5);
      const maxX = WORLD_WIDTH - this.width / zoom;
      const maxY = WORLD_HEIGHT - this.height / zoom;

      return {
        x: clamp(camera.x, 0, Math.max(0, maxX)),
        y: clamp(camera.y, 0, Math.max(0, maxY)),
        zoom
      };
    },

    worldToScreen(worldX, worldY) {
      return {
        x: (worldX - this.camera.x) * this.camera.zoom,
        y: (worldY - this.camera.y) * this.camera.zoom
      };
    },

    screenToWorld(screenX, screenY) {
      return {
        worldX: this.camera.x + screenX / this.camera.zoom,
        worldY: this.camera.y + screenY / this.camera.zoom
      };
    },

    render(now) {
      if (!this.ctx) {
        return;
      }

      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.width, this.height);
      this.drawSkyGradient(ctx);
      this.drawNebulaFields(ctx, now);
      this.drawGalaxy(ctx, now);
      this.drawBackgroundStars(ctx, now);
      this.drawMeteorAtmosphere(ctx, now);
      this.drawWishStars(ctx, now);
      this.drawBirthGlow(ctx, now);
      this.drawMeteor(ctx, now);
      this.drawParticles(ctx, now);
    },

    drawSkyGradient(ctx) {
      const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
      gradient.addColorStop(0, '#02030A');
      gradient.addColorStop(0.36, '#060916');
      gradient.addColorStop(0.72, '#0A1028');
      gradient.addColorStop(1, '#101A38');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, this.width, this.height);

      const upperGlow = ctx.createRadialGradient(
        this.width * 0.28,
        this.height * 0.16,
        8,
        this.width * 0.28,
        this.height * 0.16,
        this.width * 0.92
      );
      upperGlow.addColorStop(0, 'rgba(116, 128, 255, 0.17)');
      upperGlow.addColorStop(0.45, 'rgba(67, 94, 170, 0.08)');
      upperGlow.addColorStop(1, 'rgba(5, 7, 17, 0)');
      ctx.fillStyle = upperGlow;
      ctx.fillRect(0, 0, this.width, this.height);

      const lowerGlow = ctx.createRadialGradient(
        this.width * 0.82,
        this.height * 0.92,
        0,
        this.width * 0.82,
        this.height * 0.92,
        this.width * 0.82
      );
      lowerGlow.addColorStop(0, 'rgba(255, 214, 241, 0.09)');
      lowerGlow.addColorStop(0.42, 'rgba(108, 99, 255, 0.055)');
      lowerGlow.addColorStop(1, 'rgba(5, 7, 17, 0)');
      ctx.fillStyle = lowerGlow;
      ctx.fillRect(0, 0, this.width, this.height);
    },

    drawNebulaFields(ctx, now) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      for (let index = 0; index < this.nebulaClouds.length; index += 1) {
        const cloud = this.nebulaClouds[index];
        const driftX = Math.sin(now * 0.000025 + cloud.phase) * 18;
        const driftY = Math.cos(now * 0.000018 + cloud.phase) * 12;
        const point = this.worldToScreen(cloud.worldX + driftX, cloud.worldY + driftY);
        const radius = cloud.radius * this.camera.zoom;

        if (
          point.x < -radius
          || point.x > this.width + radius
          || point.y < -radius
          || point.y > this.height + radius
        ) {
          continue;
        }

        const color = this.nebulaColor(cloud.color, cloud.alpha);
        const gradient = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, radius);
        gradient.addColorStop(0, color.core);
        gradient.addColorStop(0.45, color.mid);
        gradient.addColorStop(1, color.edge);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    },

    drawGalaxy(ctx, now) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      for (let index = 0; index < this.galaxyParticles.length; index += 1) {
        const particle = this.galaxyParticles[index];
        const driftX = Math.sin(now * 0.000035 + particle.phase) * (particle.kind === 'cloud' ? 26 : 10);
        const driftY = Math.cos(now * 0.000023 + particle.phase) * (particle.kind === 'cloud' ? 16 : 6);
        const point = this.worldToScreen(particle.worldX + driftX, particle.worldY + driftY);
        const size = particle.size * this.camera.zoom;

        if (point.x < -size - 20 || point.x > this.width + size + 20 || point.y < -size - 20 || point.y > this.height + size + 20) {
          continue;
        }

        const color = this.nebulaColor(particle.hue, particle.alpha);

        if (particle.kind === 'cloud') {
          const gradient = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, size);
          gradient.addColorStop(0, color.core);
          gradient.addColorStop(0.46, color.mid);
          gradient.addColorStop(1, color.edge);
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
          ctx.fill();
          continue;
        }

        ctx.beginPath();
        ctx.fillStyle = particle.kind === 'core' ? color.core : color.mid;
        ctx.arc(point.x, point.y, Math.max(0.45, size), 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    },

    drawBackgroundStars(ctx, now) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      for (let index = 0; index < this.backgroundStars.length; index += 1) {
        const star = this.backgroundStars[index];
        const parallax = 1 - star.layer * 0.028;
        const driftX = Math.sin(now * 0.000027 + star.phase) * (star.layer + 1) * 7;
        const driftY = Math.cos(now * 0.000019 + star.phase) * (star.layer + 1) * 4;
        const basePoint = {
          x: (star.worldX - this.camera.x * parallax) * this.camera.zoom + driftX,
          y: (star.worldY - this.camera.y * parallax) * this.camera.zoom + driftY
        };
        const orbitAngle = now * 0.00000032 * star.orbit * (star.layer + 1);
        const centerX = this.width * 0.5;
        const centerY = this.height * 0.47;
        const relX = basePoint.x - centerX;
        const relY = basePoint.y - centerY;
        const point = {
          x: centerX + relX * Math.cos(orbitAngle) - relY * Math.sin(orbitAngle),
          y: centerY + relX * Math.sin(orbitAngle) + relY * Math.cos(orbitAngle)
        };

        if (point.x < -10 || point.x > this.width + 10 || point.y < -10 || point.y > this.height + 10) {
          continue;
        }

        const twinkle = 1 + Math.sin(now * (0.00055 + star.layer * 0.00016) + star.phase) * star.twinkle;
        const alpha = clamp(star.alpha * twinkle, 0.06, 0.82);
        const color = star.color || [220, 232, 255];
        const size = star.size * this.camera.zoom;

        if (star.layer >= 2) {
          const glow = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, size * 6);
          glow.addColorStop(0, `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha * 0.28})`);
          glow.addColorStop(1, `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0)`);
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(point.x, point.y, size * 6, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.beginPath();
        ctx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;
        ctx.arc(point.x, point.y, Math.max(0.35, size), 0, Math.PI * 2);
        ctx.fill();

        if (star.glint && alpha > 0.42) {
          ctx.strokeStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha * 0.32})`;
          ctx.lineWidth = 0.65;
          ctx.beginPath();
          ctx.moveTo(point.x - size * 3.8, point.y);
          ctx.lineTo(point.x + size * 3.8, point.y);
          ctx.moveTo(point.x, point.y - size * 3.8);
          ctx.lineTo(point.x, point.y + size * 3.8);
          ctx.stroke();
        }
      }

      ctx.restore();
    },

    drawMeteorAtmosphere(ctx, now) {
      if (!this.meteor) {
        return;
      }

      const progress = clamp((now - this.meteor.startTime) / this.meteor.duration, 0, 1);
      const pulse = Math.sin(progress * Math.PI);

      ctx.save();
      ctx.fillStyle = `rgba(1, 3, 10, ${0.08 * pulse})`;
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.restore();
    },

    drawWishStars(ctx, now) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      for (let index = 0; index < this.stars.length; index += 1) {
        const star = this.stars[index];
        if (star.isDeleted) {
          continue;
        }

        const point = this.worldToScreen(star.worldX, star.worldY);
        if (point.x < -60 || point.x > this.width + 60 || point.y < -60 || point.y > this.height + 60) {
          continue;
        }

        const breath = (Math.sin(now * 0.0015 + (star.phase || index)) + 1) / 2;
        const size = (star.size || 4.2) * this.camera.zoom;
        const haloSize = size * (8.2 + breath * 3.2);
        const color = star.color || '#FFE8A3';
        const gradient = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, haloSize);

        gradient.addColorStop(0, this.hexToRgba(color, 0.95));
        gradient.addColorStop(0.18, this.hexToRgba(color, 0.36 + breath * 0.14));
        gradient.addColorStop(0.56, this.hexToRgba(color, 0.1 + breath * 0.04));
        gradient.addColorStop(1, this.hexToRgba(color, 0));

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(point.x, point.y, haloSize, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = this.hexToRgba(color, 0.28 + breath * 0.18);
        ctx.lineWidth = Math.max(0.7, this.camera.zoom * 0.85);
        ctx.beginPath();
        ctx.arc(point.x, point.y, size * (2.45 + breath * 0.42), 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = this.hexToRgba(color, 0.23 + breath * 0.18);
        ctx.lineWidth = Math.max(0.6, this.camera.zoom * 0.72);
        ctx.beginPath();
        ctx.moveTo(point.x - size * 4.7, point.y);
        ctx.lineTo(point.x + size * 4.7, point.y);
        ctx.moveTo(point.x, point.y - size * 4.7);
        ctx.lineTo(point.x, point.y + size * 4.7);
        ctx.stroke();

        const core = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, size * 2.25);
        core.addColorStop(0, 'rgba(255, 255, 255, 0.98)');
        core.addColorStop(0.32, this.hexToRgba(color, 0.95));
        core.addColorStop(1, this.hexToRgba(color, 0));
        ctx.fillStyle = core;
        ctx.beginPath();
        ctx.arc(point.x, point.y, size * 2.25, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
        ctx.beginPath();
        ctx.arc(point.x, point.y, Math.max(1.2, size * 0.34), 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    },

    drawBirthGlow(ctx, now) {
      if (!this.birthGlow) {
        return;
      }

      const elapsed = now - this.birthGlow.startTime;
      const progress = elapsed / this.birthGlow.duration;

      if (progress >= 1) {
        this.birthGlow = null;
        return;
      }

      const point = this.worldToScreen(this.birthGlow.worldX, this.birthGlow.worldY);
      const eased = easeOutCubic(progress);
      const radius = 22 + eased * 96;
      const alpha = 0.46 * (1 - progress);
      const color = this.birthGlow.color || '#FFE8A3';

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const gradient = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, radius);
      gradient.addColorStop(0, this.hexToRgba(color, alpha + 0.15));
      gradient.addColorStop(0.42, this.hexToRgba(color, alpha));
      gradient.addColorStop(1, this.hexToRgba(color, 0));
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = this.hexToRgba(color, 0.26 * (1 - progress));
      ctx.lineWidth = 1 + eased * 1.8;
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius * 0.48, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
      ctx.beginPath();
      ctx.arc(point.x, point.y, Math.max(1.8, 5 * (1 - progress) + 1), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    },

    drawMeteor(ctx, now) {
      if (!this.meteor) {
        return;
      }

      const elapsed = now - this.meteor.startTime;
      const rawProgress = clamp(elapsed / this.meteor.duration, 0, 1);
      const progress = easeOutQuart(rawProgress);
      const head = this.getMeteorPoint(progress);
      const previous = this.getMeteorPoint(clamp(progress - 0.012, 0, 1));
      const angle = Math.atan2(head.y - previous.y, head.x - previous.x);
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);

      this.spawnMeteorParticles(head, progress, now);

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const tailLength = 0.14 + (1 - rawProgress) * 0.16;
      const startT = clamp(progress - tailLength, 0, 1);
      const segments = 34;

      for (let index = 0; index < segments; index += 1) {
        const localA = index / segments;
        const localB = (index + 1) / segments;
        const tA = lerp(startT, progress, localA);
        const tB = lerp(startT, progress, localB);
        const pointA = this.getMeteorPoint(tA);
        const pointB = this.getMeteorPoint(tB);
        const strength = Math.pow(localB, 1.7);
        const fade = 1 - rawProgress * 0.42;

        ctx.strokeStyle = `rgba(137, 170, 255, ${0.035 + strength * 0.22 * fade})`;
        ctx.lineWidth = 2 + strength * 18;
        ctx.beginPath();
        ctx.moveTo(pointA.x, pointA.y);
        ctx.lineTo(pointB.x, pointB.y);
        ctx.stroke();
      }

      for (let index = 0; index < segments; index += 1) {
        const localA = index / segments;
        const localB = (index + 1) / segments;
        const tA = lerp(startT, progress, localA);
        const tB = lerp(startT, progress, localB);
        const pointA = this.getMeteorPoint(tA);
        const pointB = this.getMeteorPoint(tB);
        const strength = Math.pow(localB, 2);

        ctx.strokeStyle = `rgba(255, 255, 255, ${0.04 + strength * 0.42})`;
        ctx.lineWidth = 0.8 + strength * 4.2;
        ctx.beginPath();
        ctx.moveTo(pointA.x, pointA.y);
        ctx.lineTo(pointB.x, pointB.y);
        ctx.stroke();
      }

      const beamGradient = ctx.createLinearGradient(
        head.x - cos * 138,
        head.y - sin * 138,
        head.x + cos * 18,
        head.y + sin * 18
      );
      beamGradient.addColorStop(0, 'rgba(157, 187, 255, 0)');
      beamGradient.addColorStop(0.58, 'rgba(192, 212, 255, 0.2)');
      beamGradient.addColorStop(1, 'rgba(255, 255, 255, 0.72)');
      ctx.strokeStyle = beamGradient;
      ctx.lineWidth = 3.8;
      ctx.beginPath();
      ctx.moveTo(head.x - cos * 138, head.y - sin * 138);
      ctx.lineTo(head.x + cos * 16, head.y + sin * 16);
      ctx.stroke();

      const haloRadius = 34 + Math.sin(rawProgress * Math.PI) * 15;
      const halo = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, haloRadius);
      halo.addColorStop(0, 'rgba(255, 255, 255, 0.96)');
      halo.addColorStop(0.2, 'rgba(255, 232, 190, 0.68)');
      halo.addColorStop(0.46, 'rgba(157, 187, 255, 0.42)');
      halo.addColorStop(1, 'rgba(108, 99, 255, 0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(head.x, head.y, haloRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.98)';
      ctx.beginPath();
      ctx.arc(head.x, head.y, 4.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      if (rawProgress >= 1 && !this.meteor.completed) {
        this.completeMeteor();
      }
    },

    getMeteorPoint(progress) {
      return cubicPoint(
        this.meteor.start,
        this.meteor.controlA,
        this.meteor.controlB,
        this.meteor.end,
        progress
      );
    },

    spawnMeteorParticles(head, progress, now) {
      if (!this.meteor || progress <= 0 || progress >= 1) {
        return;
      }

      const previous = this.getMeteorPoint(clamp(progress - 0.026, 0, 1));
      const dx = head.x - previous.x;
      const dy = head.y - previous.y;
      const length = Math.max(1, Math.sqrt(dx * dx + dy * dy));
      const nx = dx / length;
      const ny = dy / length;
      const px = -ny;
      const py = nx;
      const count = this.properties.animationLevel === 'soft' ? 2 : 4;

      for (let index = 0; index < count; index += 1) {
        const spread = 18 + Math.random() * 70;
        const side = (Math.random() - 0.5) * 26;
        this.particles.push({
          x: head.x - nx * spread + px * side,
          y: head.y - ny * spread + py * side,
          vx: -nx * (0.45 + Math.random() * 1.4) + px * (Math.random() - 0.5) * 0.75,
          vy: -ny * (0.45 + Math.random() * 1.4) + py * (Math.random() - 0.5) * 0.75,
          size: 0.7 + Math.random() * 2.4,
          alpha: 0.24 + Math.random() * 0.5,
          color: Math.random() > 0.62 ? this.meteor.color : '#F4F7FF',
          bornAt: now,
          life: 520 + Math.random() * 620
        });
      }

      if (this.particles.length > 280) {
        this.particles.splice(0, this.particles.length - 280);
      }
    },

    drawParticles(ctx, now) {
      if (!this.particles.length) {
        return;
      }

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const alive = [];

      this.particles.forEach((particle) => {
        const age = now - particle.bornAt;
        if (age >= particle.life) {
          return;
        }

        const progress = age / particle.life;
        const x = particle.x + particle.vx * age * 0.05;
        const y = particle.y + particle.vy * age * 0.05;
        const alpha = particle.alpha * (1 - progress);

        const color = particle.color || '#F4F7FF';
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, particle.size * 4);
        gradient.addColorStop(0, color === '#F4F7FF'
          ? `rgba(244, 247, 255, ${alpha})`
          : this.hexToRgba(color, alpha));
        gradient.addColorStop(1, color === '#F4F7FF'
          ? 'rgba(244, 247, 255, 0)'
          : this.hexToRgba(color, 0));
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, particle.size * 4, 0, Math.PI * 2);
        ctx.fill();
        alive.push(particle);
      });

      this.particles = alive;
      ctx.restore();
    },

    launchMeteor(pendingWish) {
      if (!this.ctx || this.meteor) {
        return false;
      }

      const startX = this.width * (0.42 + Math.random() * 0.16);
      const startY = this.height * (0.86 + Math.random() * 0.04);
      const direction = Math.random() > 0.5 ? 1 : -1;
      const endX = clamp(
        startX + direction * this.width * (0.22 + Math.random() * 0.34),
        this.width * 0.16,
        this.width * 0.84
      );
      const endY = Math.min(
        this.height * (0.18 + Math.random() * 0.32),
        startY - this.height * 0.34
      );
      const lift = startY - endY;
      const controlAX = startX + direction * this.width * (0.08 + Math.random() * 0.08);
      const controlAY = startY - lift * (0.36 + Math.random() * 0.12);
      const controlBX = endX - direction * this.width * (0.08 + Math.random() * 0.1);
      const controlBY = endY + lift * (0.16 + Math.random() * 0.12);
      const world = this.screenToWorld(endX, endY);
      const color = pickWishStarColor(Date.now());
      const star = Object.assign({}, pendingWish, {
        id: `my-star-${Date.now()}`,
        createdDate: formatDate(),
        worldX: world.worldX,
        worldY: world.worldY,
        size: 4.4 + Math.random() * 0.9,
        brightness: 0.95,
        color,
        phase: Math.random() * Math.PI * 2,
        constellation: pendingWish.constellation || '银河深处',
        ipRegion: pendingWish.ipRegion || '未知',
        isMine: true,
        isDeleted: false
      });

      this.meteor = {
        start: { x: startX, y: startY },
        controlA: { x: controlAX, y: controlAY },
        controlB: { x: controlBX, y: controlBY },
        end: { x: endX, y: endY },
        startTime: Date.now(),
        duration: this.properties.animationLevel === 'soft' ? 2200 : 2700,
        color,
        star,
        completed: false
      };

      return true;
    },

    completeMeteor() {
      if (!this.meteor || this.meteor.completed) {
        return;
      }

      this.meteor.completed = true;
      const star = this.meteor.star;
      this.birthGlow = {
        worldX: star.worldX,
        worldY: star.worldY,
        color: star.color,
        startTime: Date.now(),
        duration: 1500
      };
      this.meteor = null;
      this.triggerEvent('meteorend', { star });
    },

    onTouchStart(event) {
      const touches = event.touches || [];
      if (touches.length === 1) {
        const touch = touches[0];
        this.touchState = {
          mode: 'pan',
          startX: touch.clientX,
          startY: touch.clientY,
          lastX: touch.clientX,
          lastY: touch.clientY,
          startTime: Date.now(),
          moved: false,
          startCamera: Object.assign({}, this.camera)
        };
      } else if (touches.length >= 2) {
        const center = this.getTouchesCenter(touches);
        this.touchState = {
          mode: 'pinch',
          startDistance: distance(touches[0], touches[1]),
          startCamera: Object.assign({}, this.camera),
          center,
          centerWorld: this.screenToWorld(center.x, center.y),
          moved: true
        };
      }
    },

    onTouchMove(event) {
      if (!this.touchState) {
        return;
      }

      const touches = event.touches || [];

      if (this.touchState.mode === 'pan' && touches.length === 1) {
        const touch = touches[0];
        const dx = touch.clientX - this.touchState.startX;
        const dy = touch.clientY - this.touchState.startY;

        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
          this.touchState.moved = true;
        }

        this.camera = this.clampCamera({
          x: this.touchState.startCamera.x - dx / this.camera.zoom,
          y: this.touchState.startCamera.y - dy / this.camera.zoom,
          zoom: this.camera.zoom
        });
      }

      if (touches.length >= 2) {
        const center = this.getTouchesCenter(touches);
        const nextZoom = clamp(
          this.touchState.startCamera.zoom * distance(touches[0], touches[1]) / this.touchState.startDistance,
          0.6,
          2.5
        );
        const centerWorld = this.touchState.centerWorld;

        this.camera = this.clampCamera({
          x: centerWorld.worldX - center.x / nextZoom,
          y: centerWorld.worldY - center.y / nextZoom,
          zoom: nextZoom
        });
        this.touchState.moved = true;
      }
    },

    onTouchEnd(event) {
      if (!this.touchState) {
        return;
      }

      wx.setStorageSync(
        KEYS.LAST_CAMERA_STATE,
        Object.assign({}, this.camera, { visualVersion: 2 })
      );

      const changedTouches = event.changedTouches || [];
      const touch = changedTouches[0];
      const wasTap = this.touchState.mode === 'pan'
        && !this.touchState.moved
        && touch
        && Date.now() - this.touchState.startTime < 320;

      if (wasTap) {
        const star = this.hitTestWishStar(touch.clientX, touch.clientY);
        if (star) {
          this.triggerEvent('startap', { star });
        }
      }

      this.touchState = null;
    },

    getTouchesCenter(touches) {
      return {
        x: (touches[0].clientX + touches[1].clientX) / 2,
        y: (touches[0].clientY + touches[1].clientY) / 2
      };
    },

    hitTestWishStar(screenX, screenY) {
      for (let index = this.stars.length - 1; index >= 0; index -= 1) {
        const star = this.stars[index];
        if (star.isDeleted) {
          continue;
        }

        const point = this.worldToScreen(star.worldX, star.worldY);
        const dx = screenX - point.x;
        const dy = screenY - point.y;
        const hitRadius = Math.max(22, (star.size || 4) * this.camera.zoom + 18);

        if (dx * dx + dy * dy <= hitRadius * hitRadius) {
          return star;
        }
      }

      return null;
    },

    nebulaColor(name, alpha) {
      const palettes = {
        blue: [128, 168, 255],
        violet: [168, 146, 255],
        pink: [255, 205, 235],
        white: [244, 247, 255]
      };
      const color = palettes[name] || palettes.blue;

      return {
        core: `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`,
        mid: `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha * 0.48})`,
        edge: `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0)`
      };
    },

    hexToRgba(hex, alpha) {
      const value = String(hex || '#FFFFFF').replace('#', '');
      const bigint = parseInt(value.length === 3
        ? value.split('').map((item) => item + item).join('')
        : value, 16);
      const r = (bigint >> 16) & 255;
      const g = (bigint >> 8) & 255;
      const b = bigint & 255;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
  }
});
