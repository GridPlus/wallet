<template>
   <Modal v-if="open" @close="onClose">
      <template v-slot:title>
        Connect Your Lattice
      </template>
      <form class="form" autocomplete="off" v-on:submit.prevent="generate">
        <div class="form-group">
          <label for="password">Device ID</label>
          <div class="input-group">
            <input type="text" class="form-control" id="deviceID" v-model="deviceID" autocomplete="off" required>
          </div>
        </div>
        <div class="form-group">
          <label for="password">Password</label>
          <div class="input-group">
            <input type="password" class="form-control" id="password" v-model="password" autocomplete="off" required>
          </div>
        </div>
      </form>
      <div class="footer-container">
        <div class="footer-content">
          <button class="btn btn-primary btn-lg btn-footer btn-icon" id="submit_button" :disabled="disableSubmit" @click="submit">
            Connect
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
      if (!this.password) return true
      if (this.deviceID.length < 6) return true
      return false
    }
  },
  data () {
    return {
      deviceID: '',
      password: ''
    }
  },
  props: {
    open: {
      type: Boolean,
      default: false
    }
  },
  methods: {
    submit () {
      this.$emit('submit', this.deviceID, this.password)
    },
    onClose () {
      this.deviceID = ''
      this.password = ''
      this.$emit('close')
    }
  }
}
</script>

<style lang="scss">

</style>
