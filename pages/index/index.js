const { MAX_WISH_LENGTH, validateWishContent } = require('../../utils/validators');
const { KEYS } = require('../../utils/storage');
const { WORLD_WIDTH, WORLD_HEIGHT, pickWishStarColor } = require('../../utils/starfield');
const { formatDate } = require('../../utils/time');

const app = getApp();

const TRACKS = ['track-left', 'track-right', 'track-steep'];
const TRACK_ENDS = {
  'track-left': { xPct: 31, yPct: 34 },
  'track-right': { xPct: 69, yPct: 32 },
  'track-steep': { xPct: 52, yPct: 27 }
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function createRenderStars(stars) {
  return (stars || [])
    .filter((star) => !star.isDeleted)
    .map((star) => ({
      id: star.id,
      color: star.color || '#FFE8A3',
      xPct: clamp(star.worldX / WORLD_WIDTH * 100, 5, 95).toFixed(2),
      yPct: clamp(star.worldY / WORLD_HEIGHT * 100, 6, 94).toFixed(2),
      isMine: !!star.isMine
    }));
}

Page({
  data: {
    wishStars: [],
    renderStars: [],
    selectedStar: null,
    showStarModal: false,
    wishText: '',
    maxLength: MAX_WISH_LENGTH,
    isSubmitting: false,
    musicEnabled: true,
    animationLevel: 'standard',
    toastText: '',
    mapStyle: 'transform: translate3d(0px, 0px, 0) scale(1);',
    meteorVisible: false,
    meteorClass: 'track-right',
    topLeftTop: 82,
    topActionsTop: 118,
    topActionsRight: 32
  },

  onLoad() {
    this.toastTimer = null;
    this.meteorTimer = null;
    this.mapOffset = { x: 0, y: 0 };
    this.mapScale = 1;
    this.dragBounds = { x: 120, y: 170 };
    this.touchState = null;
    this.setupNavigationChrome();
    this.syncStars();
    this.setData({
      musicEnabled: app.globalData.musicEnabled,
      animationLevel: app.globalData.animationLevel
    });
  },

  setupNavigationChrome() {
    try {
      const windowInfo = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
      const menuButton = wx.getMenuButtonBoundingClientRect ? wx.getMenuButtonBoundingClientRect() : null;
      const pxToRpx = 750 / windowInfo.windowWidth;
      this.dragBounds = {
        x: Math.round(windowInfo.windowWidth * 0.36),
        y: Math.round(windowInfo.windowHeight * 0.25)
      };

      if (!menuButton) {
        this.setData({
          topLeftTop: 82,
          topActionsTop: 112,
          topActionsRight: 32
        });
        return;
      }

      this.setData({
        topLeftTop: 82,
        topActionsTop: Math.max(112, Math.round(menuButton.bottom * pxToRpx + 18)),
        topActionsRight: 32
      });
    } catch (error) {
      this.setData({
        topLeftTop: 82,
        topActionsTop: 118,
        topActionsRight: 32
      });
    }
  },

  onShow() {
    this.syncStars();
    this.setData({
      musicEnabled: app.globalData.musicEnabled,
      animationLevel: app.globalData.animationLevel
    });
  },

  onUnload() {
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
    if (this.meteorTimer) {
      clearTimeout(this.meteorTimer);
    }
  },

  onWishInput(event) {
    this.setData({
      wishText: event.detail.value
    });
  },

  submitWish() {
    if (this.data.isSubmitting) {
      return;
    }

    const result = validateWishContent(this.data.wishText);
    if (!result.valid) {
      wx.showToast({
        title: result.message,
        icon: 'none'
      });
      return;
    }

    this.setData({
      isSubmitting: true
    });

    this.submitWishLocally(result.content)
      .then((pendingWish) => {
        this.startAscend(pendingWish);
      })
      .catch(() => {
        this.setData({ isSubmitting: false });
        wx.showToast({
          title: '这句话暂时不能飞升，请换一种表达。',
          icon: 'none'
        });
      });
  },

  submitWishLocally(content) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          content,
          contentPreview: content.length > 20 ? `${content.slice(0, 20)}……` : content,
          starNo: app.nextStarNo(),
          ipRegion: '本地星域',
          constellation: '银河深处'
        });
      }, 260);
    });
  },

  startAscend(pendingWish) {
    const meteorClass = TRACKS[Math.floor(Math.random() * TRACKS.length)];
    this.pendingWish = pendingWish;

    if (this.meteorTimer) {
      clearTimeout(this.meteorTimer);
    }

    this.setData({
      meteorVisible: false,
      meteorClass
    }, () => {
      this.setData({
        meteorVisible: true
      });
    });

    this.meteorTimer = setTimeout(() => {
      this.completeAscend(meteorClass);
    }, this.data.animationLevel === 'soft' ? 1800 : 2150);
  },

  completeAscend(meteorClass) {
    if (!this.pendingWish) {
      this.setData({
        isSubmitting: false,
        meteorVisible: false
      });
      return;
    }

    const target = TRACK_ENDS[meteorClass] || TRACK_ENDS['track-right'];
    const color = pickWishStarColor(Date.now());
    const star = Object.assign({}, this.pendingWish, {
      id: `my-star-${Date.now()}`,
      createdDate: formatDate(),
      worldX: WORLD_WIDTH * target.xPct / 100,
      worldY: WORLD_HEIGHT * target.yPct / 100,
      size: 4.8,
      brightness: 0.96,
      color,
      phase: Math.random() * Math.PI * 2,
      constellation: this.pendingWish.constellation || '银河深处',
      ipRegion: this.pendingWish.ipRegion || '未知',
      isMine: true,
      isDeleted: false
    });
    const wishStars = app.addWishStar(star);

    this.pendingWish = null;
    this.setData({
      wishStars,
      renderStars: createRenderStars(wishStars),
      wishText: '',
      isSubmitting: false,
      meteorVisible: false
    });
    this.showQuietToast('你的话，已化作一颗星。');
  },

  onStarTap(event) {
    const id = event.currentTarget.dataset.id;
    const star = this.data.wishStars.find((item) => item.id === id);

    if (!star) {
      return;
    }

    this.setData({
      selectedStar: star,
      showStarModal: true
    });
  },

  closeStarModal() {
    this.setData({
      showStarModal: false,
      selectedStar: null
    });
  },

  showQuietToast(text) {
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }

    this.setData({
      toastText: text
    });

    this.toastTimer = setTimeout(() => {
      this.setData({
        toastText: ''
      });
    }, 2100);
  },

  goMyStars() {
    wx.navigateTo({
      url: '/pages/my-stars/my-stars'
    });
  },

  goSettings() {
    wx.navigateTo({
      url: '/pages/settings/settings'
    });
  },

  toggleMusic() {
    const musicEnabled = !this.data.musicEnabled;
    wx.setStorageSync(KEYS.MUSIC_ENABLED, musicEnabled);
    app.globalData.musicEnabled = musicEnabled;
    this.setData({ musicEnabled });
  },

  syncStars() {
    const wishStars = app.getWishStars();
    this.setData({
      wishStars,
      renderStars: createRenderStars(wishStars)
    });
  },

  onSkyTouchStart(event) {
    const touches = event.touches || [];
    if (touches.length === 1) {
      const touch = touches[0];
      this.touchState = {
        mode: 'pan',
        startX: touch.clientX,
        startY: touch.clientY,
        offsetX: this.mapOffset.x,
        offsetY: this.mapOffset.y
      };
      return;
    }

    if (touches.length >= 2) {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      this.touchState = {
        mode: 'pinch',
        startDistance: Math.sqrt(dx * dx + dy * dy),
        startScale: this.mapScale
      };
    }
  },

  onSkyTouchMove(event) {
    if (!this.touchState) {
      return;
    }

    const touches = event.touches || [];

    if (this.touchState.mode === 'pan' && touches.length === 1) {
      const touch = touches[0];
      const bounds = this.dragBounds || { x: 120, y: 170 };
      this.mapOffset = {
        x: clamp(this.touchState.offsetX + (touch.clientX - this.touchState.startX) * 0.46, -bounds.x, bounds.x),
        y: clamp(this.touchState.offsetY + (touch.clientY - this.touchState.startY) * 0.46, -bounds.y, bounds.y)
      };
      this.updateMapStyle();
      return;
    }

    if (touches.length >= 2 && this.touchState.mode === 'pinch') {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      this.mapScale = clamp(this.touchState.startScale * distance / this.touchState.startDistance, 0.94, 1.14);
      this.mapOffset = this.clampMapOffset(this.mapOffset);
      this.updateMapStyle();
    }
  },

  onSkyTouchEnd() {
    this.touchState = null;
  },

  updateMapStyle() {
    this.setData({
      mapStyle: `transform: translate3d(${this.mapOffset.x}px, ${this.mapOffset.y}px, 0) scale(${this.mapScale});`
    });
  },

  clampMapOffset(offset) {
    const bounds = this.dragBounds || { x: 120, y: 170 };
    return {
      x: clamp(offset.x, -bounds.x, bounds.x),
      y: clamp(offset.y, -bounds.y, bounds.y)
    };
  }
});
