const { KEYS } = require('../../utils/storage');

const app = getApp();

Page({
  data: {
    musicEnabled: true,
    animationLevel: 'standard'
  },

  onShow() {
    this.setData({
      musicEnabled: app.globalData.musicEnabled,
      animationLevel: app.globalData.animationLevel
    });
  },

  goBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack();
    } else {
      wx.reLaunch({
        url: '/pages/index/index'
      });
    }
  },

  onMusicChange(event) {
    const musicEnabled = event.detail.value;
    wx.setStorageSync(KEYS.MUSIC_ENABLED, musicEnabled);
    app.globalData.musicEnabled = musicEnabled;
    this.setData({ musicEnabled });
  },

  setAnimationLevel(event) {
    const animationLevel = event.currentTarget.dataset.value;
    wx.setStorageSync(KEYS.ANIMATION_LEVEL, animationLevel);
    app.globalData.animationLevel = animationLevel;
    this.setData({ animationLevel });
  }
});
