<template>
  <div class="account-container">
    <NavBar :showMenu="false">
      <span class="account-title">
        Add Lattice Accounts
      </span>
    </NavBar>
    <GetDeviceInfo  v-if="currentStep === 'getInfo'"
                    :loading="loading"
                    @on-get-info="setDeviceInfo"
    />
  </div>
</template>

<script>
import NavBar from '@/components/NavBar'
import GetDeviceInfo from './GetDeviceInfo'
import { getAssetIcon } from '@/utils/asset'
export default {
  components: {
    NavBar,
    GetDeviceInfo
  },
  data () {
    return {
      currentStep: 'getInfo',
      deviceInfo: {},
      loading: false,
      selectedAsset: null,
      accounts: [],
      selectedAccounts: {},
      ledgerError: null,
      ledgerPage: 0,
      selectedWalletType: null
    }
  },
  methods: {
    getAssetIcon,
    closeBridgeModal () {
      this.loading = false
    },
    async setDeviceInfo (deviceInfo) {
      this.deviceInfo = deviceInfo
      this.currentStep = 'connect'
    }
  }
}
</script>
<style lang="scss">
</style>
