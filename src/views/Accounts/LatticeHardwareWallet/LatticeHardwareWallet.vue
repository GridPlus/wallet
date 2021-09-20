<template>
  <div class="account-container">
    <NavBar :showMenu="false">
      <span class="account-title">
        Connect to Lattice
      </span>
    </NavBar>
    <Loading          v-if="loading"
    />
    <GetLatticeClient v-else-if="!latticeClientInfo()"
                      @on-client-info="handleClientInfo"
    />
    <PairWithLattice  v-else-if="currentStep === 'pairWithLattice'"
                      :client="client"
                      @on-pairing-success="handlePairingSuccess"
                      @on-remove-client="handleRemoveClient"
    />
    <SelectAsset      v-else-if="currentStep === 'selectLatticeAsset'"
                      :selected-asset="selectedAsset"
                      @on-select-asset="handleSetLatticeAsset"
                      @on-confirm-asset="handleConfirmLatticeAsset"
                      @on-remove-client="handleRemoveClient"
    />
    <SetupDone        v-else
                      :client="client"
                      @on-remove-client="handleRemoveClient"
    />
  </div>
</template>

<script>
import { mapActions, mapState } from 'vuex'
import { Client } from 'gridplus-sdk'
import NavBar from '@/components/NavBar'
import GetLatticeClient from './GetLatticeClient'
import Loading from './Loading'
import PairWithLattice from './PairWithLattice'
import SelectAsset from './SelectAsset'
import SetupDone from './SetupDone'
import { LATTICE_OPTIONS } from '@/utils/lattice'

export default {
  components: {
    NavBar,
    GetLatticeClient,
    Loading,
    PairWithLattice,
    SelectAsset,
    SetupDone
  },
  data () {
    return {
      currentStep: '',
      selectedAsset: LATTICE_OPTIONS[0],
      client: null,
      loading: false
    }
  },
  methods: {
    ...mapActions([
      'clearLatticeData',
      'setLatticeClientInfo',
      'setLatticeAsset',
      'latticeDebugMsg'
    ]),
    ...mapState({
      latticeClientInfo: state => state.lattice.clientInfo,
      latticeAsset: state => state.lattice.asset
    }),

    // Component callback handlers
    async handleClientInfo ({ clientInfo }) {
      await this.setLatticeClientInfo({ clientInfo })
      await this._connect(clientInfo)
    },
    async handlePairingSuccess () {
      this.currentStep = 'selectLatticeAsset'
    },
    async handleRemoveClient () {
      this.client = null
      this.currentStep = 'getLatticeClient'
      await this.clearLatticeData()
    },
    async handleConfirmLatticeAsset () {
      this.setLatticeAsset({ asset: this.selectedAsset })
      this.currentStep = 'getLatticeAccounts'
    },
    handleSetLatticeAsset (asset) {
      this.selectedAsset = asset
    },

    // Internal state-altering functions
    async _connect (clientInfo) {
      try {
        // Given client info, create (or rehydrate) a Lattice client and then attempt to connect
        // to the user's device
        this.loading = true
        const ReactCrypto = require('gridplus-react-crypto').default
        const crypto = new ReactCrypto()
        const { name, deviceID, password } = clientInfo
        const privKey = crypto.createHash('sha256').update(`${deviceID}${password}${name}`).digest()
        this.client = new Client({ name, crypto, privKey })
        this.client.connect(clientInfo.deviceID, (err, isPaired) => {
          this.loading = false
          if (err) {
            throw new Error(err)
          }
          // If we are not paired yet, move the UI to that component. The user's device should be
          // displaying a pairing secret.
          if (!isPaired) {
            this.currentStep = 'pairWithLattice'
            return
          }
          // If we are paired, determine if the user has already selected an asset
          if (!this.latticeAsset()) {
            this.currentStep = 'selectLatticeAsset'
          }
        })
      } catch (err) {
        // If there is an error connecting, clear the client info
        // TODO: Convert this into a component that displays the error and lets the user
        // either retry the connection or wipe the credentials and go through the setup process again
        await this.clearLatticeData()
      }
    }
  },

  // Lifecycle hooks
  async mounted () {
    // Once we mount, get the data we need to create a new instance of the Lattice client
    const clientInfo = this.latticeClientInfo()
    const { name, deviceID, password } = clientInfo
    if (!name || !deviceID || !password) {
      await this.clearLatticeData()
      return
    }
    await this._connect(clientInfo)
  }
}
</script>
<style lang="scss">
</style>
