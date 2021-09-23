<template>
  <div class="account-container">
    <NavBar :showMenu="false">
      <span class="account-title">
        Add Lattice Accounts
      </span>
    </NavBar>
    <GetLatticeClient v-if="!latticeClientInfo()"
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
import { getNextAccountColor } from '@/utils/accounts'
import { getDerivationPath } from '@/utils/derivationPath'
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
  computed: {
    ...mapState([
      'activeNetwork',
      'activeWalletId'
    ])
  },
  methods: {
    ...mapActions([
      'changeActiveWalletId',
      'createAccount',
      'setLatticeClientInfo',
      'setLatticeAsset',
      'updateAccount',
      'latticeDebugMsg'
    ]),
    ...mapState({
      latticeClientInfo: state => state.lattice.clientInfo,
      latticeAsset: state => state.lattice.asset,
      accounts: state => state.accounts
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
      await this.setLatticeClientInfo({ clientInfo: null })
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
        this.debugLatticeMsg({ msg: `_connect: ${clientInfo}` })
        // Given client info, create (or rehydrate) a Lattice client and then attempt to connect
        // to the user's device
        const ReactCrypto = require('gridplus-react-crypto').default
        const crypto = new ReactCrypto()
        const { name, deviceID, password } = clientInfo
        const privKey = crypto.createHash('sha256').update(`${deviceID}${password}${name}`).digest()
        this.client = new Client({ name, crypto, privKey })
        this.debugLatticeMsg({ msg: '1' })
        this.client.connect(clientInfo.deviceID, (err, isPaired) => {
          this.debugLatticeMsg({ msg: '2' })
          if (err) {
            throw new Error(err)
          }
          // If we are not paired yet, move the UI to that component. The user's device should be
          // displaying a pairing secret.
          if (!isPaired) {
            this.currentStep = 'pairWithLattice'
            return
          }
          this.debugLatticeMsg({ msg: '3' })
          // If we are paired, determine if the user has already selected an asset
          if (!this.latticeAsset()) {
            this.currentStep = 'selectLatticeAsset'
            return
          }
          // If we have already selected an asset, check for the account
          this.currentStep = 'setupFinished'
          this.debugLatticeMsg({ msg: `ugh cmon man... ${this.currentStep}`})
        })
      } catch (err) {
        this.debugLatticeMsg({ msg: `error connecting: ${err.message}` })
        // If there is an error connecting, clear the client info
        // TODO: Convert this into a component that displays the error and lets the user
        // either retry the connection or wipe the credentials and go through the setup process again
        this.setLatticeClientInfo({ clientInfo: null })
      }
    },

    async _createOrUpdateAccount () {
      this.latticeDebugMsg({ msg: 'createorupdateaccount'})
      if (!this.latticeAsset() || !this.client) {
        return
      }
      const wallet = this.client.getActiveWallet()
      if (!wallet) {
        return
      }
      const walletUID = wallet.uid.toString('hex')
      this.latticeDebugMsg({ msg: walletUID })
      this.latticeDebugMsg({ msg: this.accounts() })
      // Fetch the first address for each supported account type and update state
      const options = LATTICE_OPTIONS.filter((x) => { return x.name === this.selectedAsset.name})
      if (options.length < 1) {
        return
      }
      const option = options[0]
      const account = {
        name: `Lattice ${option.name}`,
        alias: '',
        chain: option.chain,
        index: 0,
        // This should be dynamic but I don't know how they allow the user to change the version type
        type: option.types[0],
        color: getNextAccountColor(option.chain, 1)
      }
      this.latticeDebugMsg({ msg: account })
      // Get the first address and save it to the account
      const startPath = getDerivationPath(option.chain, this.activeNetwork, 0, account.type)
      this.latticeDebugMsg({ msg: startPath })
      const firstAddress = await this._getAddress(startPath)
      this.latticeDebugMsg({ msg: firstAddress })
      account.addresses = [firstAddress]
      // Update state with this account info
      if (this._walletIdExists(walletUID)) {
        this.latticeDebugMsg({ msg: 'creating account' })
        // If this wallet UID does not exist in state, create it
        this.createAccount({ walletId: walletUID, network: this.activeNetwork, account })
      } else {
        this.latticeDebugMsg({ msg: 'updating account' })
        // If this wallet UID *does* exist in state, update it
        this.updateAccount({ walletId: walletUID, network: this.activeNetwork, account })
      }
      // Change the active wallet UID
      this.changeActiveWalletId({ walletId: walletUID })
    },

    async _getAddress (path) {
      return new Promise((resolve, reject) => {
        if (!this.client) {
          return reject(new Error('No client present'))
        }
        if (!this.client.getActiveWallet()) {
          return reject(new Error('Client has no active wallet'))
        }
        const pathIndices = []
        path.split('/').forEach((i) => {
          const hardIdx = i.indexOf('\'')
          const isHard = hardIdx > -1
          const iNum = isHard ? i.slice(0, i) : i
          if (!isNaN(Number(iNum))) {
            pathIndices.push(isHard ? Number(iNum) + 0x80000000 : Number(iNum))
          }
        })
        const req = { startPath: pathIndices, n: 1, skipCache: true }
        this.latticeDebugMsg({ msg: 'getting addresses' })
        this.client.getAddresses(req, (err, res) => {
          this.latticeDebugMsg({ msg: 'got addresses'})
          this.latticeDebugMsg({msg: res})
          if (err) {
            return reject(new Error(err.message))
          }
          this.latticeDebugMsg({ msg: res[0]})
          return resolve(res[0])
        })
      })
    },
    _walletIdExists (walletId) {
      this.accounts.forEach((account) => {
        if (account[walletId]) {
          return true
        }
      })
      return false
    }
  },

  // Lifecycle hooks
  async mounted () {
    // Once we mount, get the data we need to create a new instance of the Lattice client
    const clientInfo = this.latticeClientInfo()
    const { name, deviceID, password } = clientInfo
    if (!name || !deviceID || !password) {
      this.setLatticeClientInfo({ clientInfo: null })
      return
    }
    await this._connect(clientInfo)
    this.latticeDebugMsg({ msg: `currentStep: ${this.currentStep}`})
    // if (this.currentStep === 'setupFinished') {
    //   await this._createOrUpdateAccount()
    // }
  }
}
</script>
<style lang="scss">
</style>
