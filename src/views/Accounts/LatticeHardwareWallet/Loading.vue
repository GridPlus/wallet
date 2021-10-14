<template>
  <div class="wrapper">
    <div class="wrapper_top">
      <div class="step-detail">
        <div class="step-number">⏳</div>
        <div class="step-name">Loading. Please Wait...</div>
        <SpinnerIcon class="btn-loading" v-if="loading" />
      </div>
    </div>
  </div>
</template>
<script>
import SpinnerIcon from '@/assets/icons/spinner.svg'

export default {
  components: {
    SpinnerIcon
  },
  props: ["loading"],
}
</script>

<style lang="scss">
</style>
