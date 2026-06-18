const app = getApp();

Page({
  data: {
    star: null
  },

  onLoad(options) {
    this.setData({
      star: app.getStarById(options.id)
    });
  },

  goBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack();
    } else {
      this.goHome();
    }
  },

  goHome() {
    wx.reLaunch({
      url: '/pages/index/index'
    });
  }
});
