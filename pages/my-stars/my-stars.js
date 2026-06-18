const app = getApp();

Page({
  data: {
    myStars: []
  },

  onShow() {
    this.setData({
      myStars: app.getMyStars()
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

  goWrite() {
    wx.reLaunch({
      url: '/pages/index/index'
    });
  },

  openStar(event) {
    const id = event.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/star-detail/star-detail?id=${id}`
    });
  },

  confirmDelete(event) {
    const id = event.currentTarget.dataset.id;
    wx.showModal({
      title: '要让这颗星从夜空中消失吗？',
      content: '',
      confirmText: '删除',
      cancelText: '留下它',
      confirmColor: '#FFD6F1',
      success: (res) => {
        if (res.confirm) {
          this.setData({
            myStars: app.deleteMyStar(id)
          });
        }
      }
    });
  }
});
