<template>
  <div class="wrapper">
    <div class="wrapper_top">
      <div class="step-detail">
        <div class="step-number">1</div>
        <div class="step-name">Discover Lattice</div>
      </div>
      <div class="input-group">
        <input class="di-input" v-model="inputDeviceID" placeholder="Device ID">
      </div>
      <div class="input-group">
        <input class="di-input pw-input" v-model="inputPassword" placeholder="Password (create if new)">
        <p class="error-text">{{errMsg}}</p>
      </div>
    </div>
    <div class="wrapper_bottom">
      <!-- <div class="button-group"> -->
        <button
          class="btn btn-primary btn-lg btn-icon"
          @click="handleInput"
          :disabled="loading || !inputDeviceID || !inputPassword"
        >
          <SpinnerIcon class="btn-loading" v-if="loading" />
          <template v-else>Connect</template>
        </button>
      <!-- </div> -->
    </div>
  </div>
</template>
<script>

import SpinnerIcon from '@/assets/icons/spinner.svg'

export default {
  props: ['inputDeviceID', 'inputPassword', 'loading', 'errMsg', 'client'],
  components: {
    SpinnerIcon
  },
  methods: {
    handleInput () {
      try {
        this.loading = true
        const clientInfo = {
          name: 'Liquality',
          deviceID: this.inputDeviceID,
          password: this.inputPassword
        }
        this.$emit('on-client-info', { clientInfo })
      } catch (err) {
        this.errMsg = err.message
      }
    }
  }
}
</script>

<style lang="scss">
  .wrapper_top {
    align-items: center;
  }
  .input-button {
    background-color: #6699ff;
    color: white;
    border-radius: 15%;
  }
  .input-group {
    align-items: center;
    padding: 15px;
  }
  .di-input {
    width: 100%;
  }
  .pw-input {
    -webkit-text-security: disc;
  }
  .error-text {
    padding: 3px;
    color: red;
  }
</style>
