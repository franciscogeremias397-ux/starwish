Component({
  properties: {
    show: {
      type: Boolean,
      value: false
    },
    star: {
      type: Object,
      value: {}
    }
  },

  methods: {
    onClose() {
      this.triggerEvent('close');
    },

    noop() {}
  }
});
