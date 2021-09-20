<template>
  <div class="wrapper">
    <div class="wrapper_top">
      <div class="step-detail">
        <div class="step-number">1</div>
        <div class="step-name">Discover Lattice fuck you</div>
      </div>
      <h3>{{errMsg}}</h3>
      <div class="input-group">
        <input v-model="inputDeviceID" placeholder="Device ID">
        <input v-model="inputPassword" placeholder="Password (create if new)">
      </div>
      <div class="button-group">
        <button
          @click="handleInput"
          :disabled="loading"
        >
          <SpinnerIcon class="btn-loading" v-if="loading" />
          Continue
        </button>
      </div>
    </div>
  </div>
</template>
<script>

import SpinnerIcon from '@/assets/icons/spinner.svg'
import { Client } from 'gridplus-sdk'

export default {
  components: {
    SpinnerIcon
  },
  methods: {
    handleInput () {
      try {
        this.loading = true
        const ReactCrypto = require('gridplus-react-crypto').default
        const crypto = new ReactCrypto()
        const client = new Client({
          name: 'Liquality',
          crypto: crypto,
          privKey: crypto.createHash('sha256').update(`${this.inputDeviceID}${this.inputPassword}liquality`).digest()
        })
        console.log('client', client)
        client.connect(this.inputDeviceID, (err, isPaired) => {
          console.log('err', err)
          console.log('isPaired', isPaired)
        })
      } catch (err) {
        this.errMsg = err.message()
      }
    }
  }
}
</script>

<style lang="scss">

</style>
