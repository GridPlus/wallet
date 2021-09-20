<template>
  <div class="wrapper">
    <div class="wrapper_top">
      <div class="step-detail">
        <div class="step-number">✔️</div>
        <div class="step-name">Connected to Your Lattice</div>
        <br/>
        <p>
          Your Lattice is connected. If you change wallets using SafeCards please come
          back here and clikc "Refresh". If you wish to remove the connection to your
          device you can do so by clicking "Remove Connection".
        </p>
      </div>
    </div>
    <div class="wrapper_bottom">
      <div class="button-group">
          <button
            class="btn btn-light btn-outline-primary btn-lg"
            @click="removeConnection"
          >
            Remove Connection
          </button>
          <button
            class="btn btn-primary btn-lg btn-icon"
            @click="refreshConnection"
            :disabled="loading"
          >
            <SpinnerIcon class="btn-loading" v-if="loading" />
            <template>Refresh</template>
          </button>
        </div>
    </div>
  </div>
</template>
<script>
import SpinnerIcon from '@/assets/icons/spinner.svg'

export default {
  props: ['loading', 'client', 'errMsg'],
  components: {
    SpinnerIcon
  },
  methods: {
    refreshConnection () {
      this.loading = true
      this.client.connect(this.client.deviceId, (err) => {
        this.loading = false
        if (err) {
          this.errMsg = 'Failed to re-connect.'
        }
      })
    },
    removeConnection () {
      this.$emit('on-remove-client')
    }
  }
}
</script>

<style lang="scss">
</style>
