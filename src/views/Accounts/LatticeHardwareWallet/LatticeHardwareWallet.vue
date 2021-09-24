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
                      @on-refresh-connection="handleRefreshConnection"
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
import { getNextAccountColor } from '@/utils/accounts'
import { getDerivationPath } from '@/utils/derivationPath'
import { LATTICE_OPTIONS } from '@/utils/lattice'

// We will only support one account per current for now
const FIXED_ACCOUNT_IDX = 0

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
      currentStep: null,
      selectedAsset: LATTICE_OPTIONS[0],
      client: null,
      loading: false
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
      'clearLatticeData',
      'setLatticeClientInfo',
      'setLatticeAsset',
      'latticeDebugMsg',
      'removeAccount'
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
      this.currentStep = null
      await this.clearLatticeData()
      await this._removeSavedAccounts()
      // TODO: change active wallet to default one
    },
    async handleConfirmLatticeAsset () {
      this.setLatticeAsset({ asset: this.selectedAsset })
      this.currentStep = null
      await this._connect(this.latticeClientInfo())
      await this._createAccountIfNeeded()
    },
    handleSetLatticeAsset (asset) {
      this.selectedAsset = asset
    },
    async handleRefreshConnection () {
      await this._connect(this.latticeClientInfo())
      await this._createAccountIfNeeded()
    },

    // Internal state-altering functions
    async _connect (clientInfo) {
      return new Promise((resolve, reject) => {
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
              return resolve()
            }
            // If we are paired, determine if the user has already selected an asset
            if (!this.latticeAsset()) {
              this.currentStep = 'selectLatticeAsset'
            }
            return resolve()
          })
        } catch (err) {
          // If there is an error connecting, clear the client info
          // TODO: Convert this into a component that displays the error and lets the user
          // either retry the connection or wipe the credentials and go through the setup process again
          this.clearLatticeData()
          return reject(new Error('Failed to connect'))
        }
      })
    },
    // Add an account to state if none exists. This account will be associated with the active
    // wallet UID, asset type, and the current network (mainnet or testnet)
    async _createAccountIfNeeded () {
      return new Promise((resolve, reject) => {
        if (!this.latticeAsset() || !this.client) {
          return reject(new Error('Connection not set up.'))
        }
        // Get options and config needed to create the account
        const options = this._getWalletOptions()
        const walletUID = this._getCurrentWalletUID()
        /// Check on the existing wallet accounts to see if this account has already been
        // saved to state (if so we will return early)
        const existingAccounts = this._getExistingAccounts()
        if (existingAccounts.length > 0) {
          this.changeActiveWalletId({ walletId: walletUID })
          return resolve()
        }
        // If this is a new account, get the first address and save the data
        const startPath = getDerivationPath(options.chain, this.activeNetwork, 0, options.type)
        this.loading = true
        this._getAddress(startPath)
          .then((firstAddress) => {
            this.loading = false
            // If this is an unrecognized address, re-create the account with it as the only address
            const account = {
              name: `Lattice ${options.name}`,
              alias: '',
              chain: options.chain,
              index: FIXED_ACCOUNT_IDX,
              addresses: [firstAddress],
              type: options.types,
              color: getNextAccountColor(options.chain, 1)
            }
            this.latticeDebugMsg('creating account')
            // If this wallet UID *does* exist in state, update it
            this.createAccount({ walletId: walletUID, network: this.activeNetwork, account })
            // Change the active wallet UID
            this.changeActiveWalletId({ walletId: walletUID })
            return resolve()
          })
          .catch((err) => {
            return reject(err)
          })
      })
    },
    // Get an address from the Lattice given a derviation path string (e.g. m/44'/60'/0'/0/0)
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
        this.client.getAddresses(req, (err, res) => {
          if (err) {
            return reject(new Error(err.message))
          } else if (res.length < 1) {
            return reject(new Error('No addresses returned from device'))
          }
          return resolve(res[0])
        })
      })
    },
    async _removeSavedAccounts () {
      return new Promise((resolve, reject) => {
        const existingAccounts = this._getExistingAccounts()
        existingAccounts.forEach((account) => {
          this.removeAccount({ walletId: account.walletId, id: account.id, network: this.activeNetwork })
        })
      })
    },
    // Get all accounts associated with this wallet, network, and asset
    // This should only return either 0 or 1 account
    _getExistingAccounts () {
      if (!this.client) {
        return []
      }
      const walletUID = this._getCurrentWalletUID()
      if (!walletUID) {
        return []
      }
      const options = this._getWalletOptions()
      if (!options) {
        return []
      }
      const existingWallet = this.accounts()[walletUID]
      const existingAccounts = []
      if (existingWallet && Object.keys(existingWallet[this.activeNetwork]).length > 0) {
        existingWallet[this.activeNetwork].forEach((account) => {
          if (account.type === options.type && account.chain === options.chain && account.index === FIXED_ACCOUNT_IDX) {
            existingAccounts.push(account)
          }
        })
      }
      return existingAccounts
    },
    // Get the options associated with this account (asset, network, etc)
    _getWalletOptions () {
      const options = LATTICE_OPTIONS.filter((x) => { return x.name === this.selectedAsset.name })
      if (options.length < 1) {
        return null
      }
      const option = options[0]
      // This should be dynamic but I don't know how they allow the user to change the version type
      const accountType = option.types[0]
      return {
        name: option.name,
        chain: option.chain,
        type: accountType
      }
    },
    // Determine the wallet UID of the current active wallet (i.e. what is being used in the Lattice right now)
    _getCurrentWalletUID () {
      if (!this.client) {
        return null
      }
      const wallet = this.client.getActiveWallet()
      if (!wallet) {
        return null
      }
      return wallet.uid.toString('hex')
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
    await this._createAccountIfNeeded()
  }
}
</script>
<style lang="scss">
</style>
