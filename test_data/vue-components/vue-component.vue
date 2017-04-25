<template>
  <div>
    <h1>vue-template-sentinel</h1>
    <img src="./inner/test.jpg">
  </div>
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
