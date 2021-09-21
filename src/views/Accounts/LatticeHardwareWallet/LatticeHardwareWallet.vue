<template>
  <div class="account-container">
    <NavBar :showMenu="false">
      <span class="account-title">
        Add Lattice Accounts
      </span>
    </NavBar>
    <GetLatticeClient v-if="currentStep === 'getLatticeClient'"
                      @on-lattice-client="setLatticeClient"
    />
    <PairWithLattice  v-else-if="currentStep === 'pairWithLattice'"
                      :client="client"
                      @on-pairing-success="handlePairingSuccess"
    />
  </div>
</template>

<script>
import NavBar from '@/components/NavBar'
import GetLatticeClient from './GetLatticeClient'
import PairWithLattice from './PairWithLattice'
import { getAssetIcon } from '@/utils/asset'
export default {
  props: ['client'],
  components: {
    NavBar,
    GetLatticeClient,
    PairWithLattice
  },
  data () {
    return {
      currentStep: 'getLatticeClient'
    }
  },
  methods: {
    getAssetIcon,
    async setLatticeClient (data) {
      const { client, isPaired } = data
      if (!isPaired) {
        this.client = client
        this.currentStep = 'pairWithLattice'
      } else {
        console.log('we are paired!')
      }
    },
    async handlePairingSuccess () {
      console.log('paired!')
    }
  }
}
</script>
<style lang="scss">
</style>
