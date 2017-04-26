<template lang="pug">
  div
    h1 vue-template-sentinel
    img(src='./inner/test.jpg')
</template>

<script>
const exportObj = {
  talk() {
    console.log('vue-script-sentinel');
  }
}
export default exportObj;
</script>

<style lang="less">
.vue-style-sentinel {
  background-color: 'pink';
}
</style>
