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
          :disabled="loading"
        >
          Remove
        </button>
        <button
          class="btn btn-light btn-outline-primary btn-lg"
          @click="refreshConnection"
          :disabled="loading"
        >
          <SpinnerIcon class="btn-loading" v-if="loading" />
          <template>Refresh</template>
        </button>
       </div>
       <div>
         <center>
          <button
            class="btn btn-primary btn-lg btn-icon btn-full"
            @click="goToWallet"
            :disabled="loading"
          >
            <SpinnerIcon class="btn-loading" v-if="loading" />
            <template>Go to Wallet</template>
          </button>
        </center>
      </div>
    </div>
  </div>
</template>
<script>
import SpinnerIcon from '@/assets/icons/spinner.svg'

export default {
  props: ['client'],
  data () {
    return {
      errMsg: '',
      loading: false
    }
  },
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
          return
        }
        this.$emit('on-refresh-connection')
      })
    },
    removeConnection () {
      this.$emit('on-remove-client')
    },
    goToWallet () {
      this.$emit('on-go-to-wallet')
    }
  }
}
</script>

<style lang="scss">
 .btn-full {
   margin: 20px;
   width: 70%;
 }
</style>
