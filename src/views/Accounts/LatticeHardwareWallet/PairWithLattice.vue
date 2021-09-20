<template>
  <div class="wrapper">
    <div class="wrapper_top">
      <div class="step-detail">
        <div class="step-number">2</div>
        <div class="step-name">Pair With Lattice</div>
      </div>
      <div class="input-group">
        <input  class="di-input"
                v-if="!needsRetry"
                v-model="inputCode"
                placeholder="Pairing Code"
        >
        <p class="error-text">{{errMsg}}</p>
      </div>
    </div>
    <div class="wrapper_bottom">
      <div class="button-group">
          <button
            class="btn btn-light btn-outline-primary btn-lg"
            @click="cancel"
          >
            Cancel
          </button>
          <button
            class="btn btn-primary btn-lg btn-icon"
            @click="handleAttempt"
            :disabled="loading"
          >
            <SpinnerIcon class="btn-loading" v-if="loading" />
            <template v-if="!needsRetry">Connect</template>
            <template v-else>Retry</template>
          </button>
        </div>
    </div>
  </div>
</template>
<script>

import SpinnerIcon from '@/assets/icons/spinner.svg'

export default {
  props: ['loading', 'needsRetry', 'errMsg', 'client', 'inputCode'],
  components: {
    SpinnerIcon
  },
  methods: {
    handleAttempt () {
      this.errMsg = ''
      this.loading = true
      if (this.needsRetry) {
        this.retry()
      } else {
        this.pair()
      }
    },
    pair () {
      this.client.pair(this.inputCode.toUpperCase(), (err) => {
        this.loading = false
        if (err) {
          this.errMsg = 'Failed to pair. Please press "Retry" to generate a new code.'
          this.needsRetry = true
          return
        }
        this.$emit('on-pairing-success')
      })
    },
    retry () {
      this.inputCode = ''
      this.client.connect(this.client.deviceId, (err) => {
        this.loading = false
        if (err) {
          this.errMsg = 'Failed to re-connect.'
        } else {
          this.needsRetry = false
        }
      })
    },
    cancel () {
      this.loading = false
      this.inputCode = ''
      if (this.client) {
        this.client.pair('', () => {})
      }
      this.$emit('on-remove-client')
    }
  }
}
</script>

<style lang="scss">
  .input-group {
    align-items: center;
    padding: 15px;
  }
  .di-input {
    width: 100%;
    font-size: 18px;
  }
  .pw-input {
    -webkit-text-security: disc;
  }
  .error-text {
    padding: 3px;
    color: red;
  }
</style>
