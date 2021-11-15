<template>
  <div class="wrapper">
    <div class="wrapper_top">
      <div class="step-detail">
        <div class="step-number">1</div>
        <div class="step-name">Discover Lattice</div>
      </div>
      <div class="input-group">
        <input class="di-input" v-model="deviceId" placeholder="Device ID">
      </div>
      <div class="input-group">
        <input class="di-input pw-input" v-model="password" placeholder="Password (create if new)">
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
            class="btn btn-primary btn-lg btn-single"
            @click="handleInput"
            :disabled="loading || !deviceId || !password"
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

export default {
  props: ['client'],
  data () {
    return {
      errMsg: '',
      loading: false,
      deviceId: '',
      password: ''
    }
  },
  components: {
    SpinnerIcon
  },
  methods: {
    handleInput () {
      try {
        this.loading = true
        const clientInfo = {
          name: 'Liquality',
          deviceID: this.deviceId,
          password: this.password
        }
        this.$emit('on-client-info', { clientInfo })
      } catch (err) {
        this.errMsg = err.message
      }
    },
    cancel () {
      this.loading = false
      this.inputCode = ''
      if (this.client) {
        this.client.pair('', () => {})
      }
      // TODO: Make sure we really want to 'remove client'...
      this.$emit('on-remove-client')
      this.$router.replace('/wallet')
    }
  }
}
</script>

<style lang="scss">
  .btn-single {
    width: 50%
  }
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
