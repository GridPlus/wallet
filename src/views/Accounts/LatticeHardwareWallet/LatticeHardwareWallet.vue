<template>
  <div class="account-container">
    <NavBar :showMenu="false">
      <span class="account-title">
        Add Lattice Accounts
      </span>
    </NavBar>
    <GetLatticeClient v-if="!latticeClientInfo()"
                      @on-client-info="onLatticeClientInfo"
    />
    <PairWithLattice  v-else-if="currentStep === 'pairWithLattice'"
                      :client="client"
                      @on-pairing-success="handlePairingSuccess"
                      @on-remove-client="removeClient"
    />
    <SelectAsset      v-else-if="currentStep === 'selectLatticeAsset'"
                      :selected-asset="selectedAsset"
                      @on-select-asset="setLatticeAsset"
                      @on-confirm-asset="confirmAsset"
                      @on-remove-client="removeClient"
    />
    <div              v-else>
      Connecting to Lattice...
    </div>
  </div>
</template>

<script>
import { mapActions, mapState } from 'vuex'
import { Client } from 'gridplus-sdk'
import NavBar from '@/components/NavBar'
import GetLatticeClient from './GetLatticeClient'
import PairWithLattice from './PairWithLattice'
import SelectAsset from './SelectAsset'
import { getAssetIcon } from '@/utils/asset'
import { LATTICE_OPTIONS } from '@/utils/lattice'

export default {
  components: {
    NavBar,
    GetLatticeClient,
    PairWithLattice,
    SelectAsset
  },
  data () {
    return {
      currentStep: '',
      selectedAsset: LATTICE_OPTIONS[0],
      client: null
    }
  },
  methods: {
    ...mapActions([
      'setLatticeClientInfo',
      'latticeDebugMsg'
    ]),
    ...mapState({
      latticeClientInfo: state => state.lattice.clientInfo,
      latticeAsset: state => state.lattice.asset
    }),
    getAssetIcon,
    async onLatticeClientInfo ({ clientInfo }) {
      await this.setLatticeClientInfo({ clientInfo })
      await this._connect(clientInfo)
    },
    async handlePairingSuccess () {
      this.currentStep = 'selectLatticeAsset'
    },
    async removeClient () {
      this.client = null
      this.currentStep = 'getLatticeClient'
      await this.setLatticeClientInfo({ clientInfo: null })
    },
    setLatticeAsset (asset) {
      this.selectedAsset = asset
    },
    async confirmAsset () {
      this.setLatticeAsset(this.selectedAsset)
    },
    async _connect (clientInfo) {
      try {
        const ReactCrypto = require('gridplus-react-crypto').default
        const crypto = new ReactCrypto()
        const { name, deviceID, password } = clientInfo
        const privKey = crypto.createHash('sha256').update(`${deviceID}${password}${name}`).digest()
        this.client = new Client({ name, crypto, privKey })
        if (this.client.connect) {
          this.client.connect(clientInfo.deviceID, (err, isPaired) => {
            if (err) {
              return
            }
            if (!isPaired) {
              this.currentStep = 'pairWithLattice'
            } else {
              this.currentStep = 'selectLatticeAsset'
            }
          })
        }
      } catch (err) {
        this.setLatticeClientInfo({ clientInfo: null })
      }
    }
  },
  async mounted () {
    const clientInfo = this.latticeClientInfo()
    const { name, deviceID, password } = clientInfo
    if (!name || !deviceID || !password) {
      this.setLatticeClientInfo({ clientInfo: null })
      return
    }
    await this._connect(clientInfo)
  }
}
</script>
<style lang="scss">
</style>
