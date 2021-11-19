<template>
   <Modal v-if="open" @close="onClose">
      <template v-slot:title>
        Pair Your Lattice
      </template>
      <form class="form" autocomplete="off" v-on:submit.prevent="generate">
        <div class="form-group">
          <label for="password">Pairing Code</label>
          <div class="input-group">
            <input type="text" class="form-control" id="deviceID" v-model="pairingCode" autocomplete="off" required>
          </div>
        </div>
      </form>
      <div class="footer-container">
        <div class="footer-content">
          <button class="btn btn-primary btn-lg btn-footer btn-icon" id="submit_button" :disabled="disableSubmit" @click="submit">
            Pair Lattice
          </button>
        </div>
      </div>
    </Modal>
</template>

<script>
import Modal from '@/components/Modal'

export default {
  components: {
    Modal
  },
  computed: {
    disableSubmit () {
      if (!this.pairingCode) return true
      return false
    }
  },
  data () {
    return {
      pairingCode: ''
    }
  },
  props: {
    client: {
      type: Object,
      default: null
    },
    open: {
      type: Boolean,
      default: false
    }
  },
  methods: {
    submit () {
      const pairingCode = this.pairingCode.toUpperCase()
      this.client.pair(pairingCode, (err, isActive) => {
        if (err || !isActive) {
          this.onClose(err || new Error('No active wallet found!'))
        } else {
          this.$emit('submit', pairingCode)
        }
      })
    },
    onClose (err) {
      this.pairingCode = ''
      this.$emit('close', err)
    }
  }
}
</script>

<style lang="scss">

</style>
