<template>
   <Modal v-if="open" @close="onClose">
      <template #header>
        <div class="text-center text-danger">
          Oooops...
        </div>
      </template>
      <div class="justify-content-center">
        <p class="text-center text-break">
            {{ error }}
          </p>
      </div>
      <template #footer>
       <button class="btn btn-outline-clear" @click="onClose">
         Ok
       </button>
      </template>
    </Modal>
</template>

<script>
import Modal from '@/components/Modal'
import LedgerIcon from '@/assets/icons/ledger_icon.svg'

export default {
  components: {
    Modal,
    LedgerIcon
  },
  props: {
    open: {
      type: Boolean,
      default: false
    },
    error: {
      type: String,
      default: null 
    }
  },
  methods: {
    onClose () {
      this.$emit('close')
    }
  }
}
</script>

<style lang="scss">
</style>
