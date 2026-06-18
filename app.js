const { createInitialWishStars } = require('./utils/starfield');
const { KEYS } = require('./utils/storage');

App({
  globalData: {
    musicEnabled: true,
    animationLevel: 'standard'
  },

  onLaunch() {
    this.ensureStarStore();
    this.loadSettings();
  },

  ensureStarStore() {
    const stored = wx.getStorageSync(KEYS.WISH_STARS);
    const initialStars = createInitialWishStars();

    if (!Array.isArray(stored) || stored.length === 0) {
      wx.setStorageSync(KEYS.WISH_STARS, initialStars);
    } else {
      this.syncPublicStarLayout(stored, initialStars);
    }

    const sequence = wx.getStorageSync(KEYS.STAR_SEQUENCE);
    if (!sequence) {
      wx.setStorageSync(KEYS.STAR_SEQUENCE, 168);
    }
  },

  syncPublicStarLayout(stored, initialStars) {
    const initialById = initialStars.reduce((result, star) => {
      result[star.id] = star;
      return result;
    }, {});
    let changed = false;

    const nextStars = stored.map((star) => {
      const initial = initialById[star.id];

      if (!initial || star.isMine) {
        return star;
      }

      if (
        star.worldX === initial.worldX &&
        star.worldY === initial.worldY &&
        star.color === initial.color
      ) {
        return star;
      }

      changed = true;
      return Object.assign({}, star, {
        worldX: initial.worldX,
        worldY: initial.worldY,
        size: initial.size,
        brightness: initial.brightness,
        color: initial.color
      });
    });

    if (changed) {
      wx.setStorageSync(KEYS.WISH_STARS, nextStars);
    }
  },

  loadSettings() {
    const musicEnabled = wx.getStorageSync(KEYS.MUSIC_ENABLED);
    const animationLevel = wx.getStorageSync(KEYS.ANIMATION_LEVEL);

    if (typeof musicEnabled === 'boolean') {
      this.globalData.musicEnabled = musicEnabled;
    }

    if (animationLevel === 'soft' || animationLevel === 'standard') {
      this.globalData.animationLevel = animationLevel;
    }
  },

  getWishStars() {
    return (wx.getStorageSync(KEYS.WISH_STARS) || []).filter((star) => !star.isDeleted);
  },

  getMyStars() {
    return this.getWishStars().filter((star) => star.isMine);
  },

  getStarById(id) {
    return this.getWishStars().find((star) => star.id === id);
  },

  addWishStar(star) {
    const allStars = wx.getStorageSync(KEYS.WISH_STARS) || [];
    const nextStars = [star].concat(allStars);
    wx.setStorageSync(KEYS.WISH_STARS, nextStars);
    return this.getWishStars();
  },

  deleteMyStar(id) {
    const allStars = wx.getStorageSync(KEYS.WISH_STARS) || [];
    const nextStars = allStars.map((star) => {
      if (star.id === id && star.isMine) {
        return Object.assign({}, star, { isDeleted: true });
      }
      return star;
    });
    wx.setStorageSync(KEYS.WISH_STARS, nextStars);
    return this.getMyStars();
  },

  nextStarNo() {
    const sequence = (wx.getStorageSync(KEYS.STAR_SEQUENCE) || 168) + 1;
    wx.setStorageSync(KEYS.STAR_SEQUENCE, sequence);
    return `No.${String(sequence).padStart(6, '0')}`;
  }
});
