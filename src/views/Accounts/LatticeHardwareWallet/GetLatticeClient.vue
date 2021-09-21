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
      <div class="button-group">
        <button
          class="btn btn-light btn-outline-primary btn-lg"
          @click="cancelConnect"
        >
          Cancel
        </button>
        <button
          class="btn btn-primary btn-lg btn-icon"
          @click="handleInput"
          :disabled="loading || !inputDeviceID || !inputPassword"
        >
          <SpinnerIcon class="btn-loading" v-if="loading" />
          <template v-else>Connect</template>
        </button>
      </div>
    </div>
  </div>
</template>
<script>

import SpinnerIcon from '@/assets/icons/spinner.svg'
import { Client } from 'gridplus-sdk'

export default {
  props: ['inputDeviceID', 'inputPassword', 'loading', 'errMsg', 'client'],
  components: {
    SpinnerIcon
  },
  methods: {
    cancelConnect () {
      this.loading = false
      if (this.client) {
        // Send a message with an empty pairing code to cancel the request
        this.client.pair('', () => {})
      }
    },
    handleInput () {
      try {
        this.loading = true
        const ReactCrypto = require('gridplus-react-crypto').default
        const crypto = new ReactCrypto()
        this.client = new Client({
          name: 'Liquality',
          crypto: crypto,
          privKey: crypto.createHash('sha256').update(`${this.inputDeviceID}${this.inputPassword}liquality`).digest()
        })
        this.client.connect(this.inputDeviceID, (err, isPaired) => {
          if (err) {
            this.errMsg = err.message
            return
          }
          this.$emit('on-lattice-client', { client: this.client, isPaired })
        })
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
