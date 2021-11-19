<template>
  <div class="account-container">
    <NavBar :showMenu="false">
      <span class="account-title">
        Connect to Lattice
      </span>
    </NavBar>
    <Loading          v-if="loading"
                      @on-cancel-loading="handleRemoveClient"
    />
    <SelectAsset      v-else-if="currentStep === 'selectLatticeAsset'"
                      :selected-asset="selectedAsset"
                      @on-cancel-select-asset="didCancelSelectAsset"
                      @on-select-asset="didUpdateAsset"
                      @on-confirm-asset="didConfirmAsset"
    />
    <SetupDone        v-else-if="currentStep === 'latticeIsPaired'"
                      :client="client"
                      @on-remove-client="handleRemoveClient"
                      @on-refresh-connection="handleRefreshConnection"
                      @on-go-to-wallet="handleGoToWallet"
    />
    <LatticeClientInfoModal :open="clientInfoModalIsOpen"
                         @close="clientInfoModalDidClose"
                         @submit="connectToLattice"
    />
    <LatticePairingModal :open="pairingModalIsOpen"
                         :client="client"
                         @close="pairingModalDidClose"
                         @submit="pairingModalDidPair"
    />
    <LatticeDeviceErrorModal :open="deviceErrorModalIsOpen"
                             @close="deviceErrorModalDidClose"
                             :error="deviceError"
    />
  </div>
</template>

<script>
import { mapActions, mapState } from 'vuex'
import { Client } from 'gridplus-sdk'
import NavBar from '@/components/NavBar'
import Loading from './Loading'
import SelectAsset from './SelectAsset'
import SetupDone from './SetupDone'
import LatticePairingModal from '@/components/LatticePairingModal'
import LatticeClientInfoModal from '@/components/LatticeClientInfoModal'
import LatticeDeviceErrorModal from '@/components/LatticeDeviceErrorModal'
import { getNextAccountColor } from '@/utils/accounts'
import { LATTICE_OPTIONS } from '@/utils/lattice'
import cryptoassets from '@/utils/cryptoassets'
import { BitcoinNetworks } from '@liquality/bitcoin-networks'
import { EthereumNetworks } from '@liquality/ethereum-networks'

import { BitcoinLatticeProvider } from '@liquality/bitcoin-lattice-provider'
import { EthereumLatticeProvider } from '@liquality/ethereum-lattice-provider'

export default {
  components: {
    NavBar,
    Loading,
    SelectAsset,
    SetupDone,
    LatticeClientInfoModal,
    LatticeDeviceErrorModal,
    LatticePairingModal
  },
  data () {
    return {
      currentStep: 'selectLatticeAsset',
      selectedAsset: LATTICE_OPTIONS[0],
      pairingCode: null,
      // 'client' may need to be set prior to
      // displaying the 'LatticePairingModel'.
      //
      // See: 'connectToLattice'.
      client: null,
      // `tmpClientInfo` is just needed while pairing. Client info is persisted in the store.
      tmpClientInfo: null,
      loading: false,
      deviceError: null,
      clientInfoModalIsOpen: false,
      deviceErrorModalIsOpen: false,
      pairingModalIsOpen: false
    }
  },
  computed: {
    ...mapState([
      'activeNetwork',
      'activeWalletId',
      'enabledAssets'
    ])
  },
  methods: {
    ...mapActions([
      'createAccount',
      'clearLatticeData',
      'setLatticeClientInfo',
      'setLatticeAsset',
      'removeAccount',
      'updateAccountBalance'
    ]),
    ...mapState({
      latticeClientInfo: state => state.lattice.clientInfo,
      latticeAsset: state => state.lattice.asset, // MARKED FOR DELETION
      accounts: state => state.accounts
    }),
    async hasClientInfo () {
      const clientInfo = await this.latticeClientInfo()
      if (!clientInfo || !clientInfo.name || !clientInfo.deviceID || !clientInfo.password) {
        return false
      }
      return true
    },
    async handleRefreshConnection () {
      const clientInfo = await this.latticeClientInfo()
      await this.connectToLattice(clientInfo.deviceID, clientInfo.password)
      await this.tryAddAccount()
      /* Prior code
      | // Remove saved accounts from the store
      | await this._removeSavedAccounts()
      | // Setup a new client and re-connect to the Lattice
      | // We should already be paired so this should be automatic
      | await this._connect(this.latticeClientInfo())
      | // Recreate the account
      | await this._createAccountIfNeeded()
      */
    },
    displayErrorModal (error) {
      this.deviceError = error
      this.deviceErrorModalIsOpen = true
    },
    deviceErrorModalDidClose () {
      this.deviceErrorModalIsOpen = false
      this.deviceError = null
    },
    didCancelSelectAsset () {
      this.$router.replace('/wallet')
    },
    didUpdateAsset (asset) {
      this.selectedAsset = asset
    },
    async didConfirmAsset (asset) {
      this.didUpdateAsset(asset)
      await this.tryAddAccount()
      this.currentStep = 'latticeIsPaired'
    },
    async tryAddAccount () {
      this.loading = true
      const hasClientInfo = await this.hasClientInfo()

      if (hasClientInfo === false) {
        await this.clearLatticeData()
        this.clientInfoModalIsOpen = true
      } else {
        // -----------------------------------------------------------------------
        // GATHER ASSET KEYS
        // -----------------------------------------------------------------------
        const assetKeys = this.enabledAssets[this.activeNetwork]?.[this.activeWalletId] || []

        // -----------------------------------------------------------------------
        // DETERMINE AVAILABLE ASSETS
        // -----------------------------------------------------------------------
        if (this.selectedAsset.name === 'ETH') {
          const ethAssets = assetKeys.filter(asset => cryptoassets[asset].chain === 'ethereum')
          const ethAccounts = await this._ethereumAccounts(ethAssets, EthereumNetworks.ethereum_mainnet)
          for (var ei = 0; ei < ethAccounts.length; ei++) {
            await this._createAccount(ethAccounts[ei], this.activeNetwork)
          }
        } else if (this.selectedAsset.name === 'BTC') {
          const isTestnet = this.activeNetwork === 'testnet'
          const btcAssets = assetKeys.filter(asset => cryptoassets[asset].chain === 'bitcoin')
          const btcAccounts = await this._bitcoinAccounts(btcAssets, isTestnet ? BitcoinNetworks.bitcoin_testnet : BitcoinNetworks.bitcoin)
          for (var bi = 0; bi < btcAccounts.length; bi++) {
            await this._createAccount(btcAccounts[bi], this.activeNetwork)
          }
        }
      }
      this.loading = false
    },
    async clientInfoModalDidClose () {
      this.clientInfoModalIsOpen = false
      await this.clearLatticeData()
    },
    // ---------------------------------------------------------------------------
    // See: 'LatticeClientInfoModal.vue'
    // ---------------------------------------------------------------------------
    async connectToLattice (deviceID, password) {
      // -----------------------------------------------------------------------
      // PREPARE THE UI
      // -----------------------------------------------------------------------
      this.clientInfoModalIsOpen = false
      this.loading = true

      // -----------------------------------------------------------------------
      // UPDATE 'CLIENTINFO' (IMPORTANT)
      // -----------------------------------------------------------------------
      const { client, name } = this._createNewClient(deviceID, password)
      this.client = client
      const clientInfo = { name, deviceID, password }
      this.tmpClientInfo = clientInfo
      // -----------------------------------------------------------------------
      // PAIR CLIENT (IF NECESSARY)
      // -----------------------------------------------------------------------
      try {
        const isClientPaired = await this.isClientPaired(client, deviceID)
        if (!isClientPaired) {
          // If we are not paired, set a flag to make the pairing component show
          this.pairingModalIsOpen = true
        } else {
          // If we are already paired, move credentials into the store and try
          // to add an account for the current asset
          await this.setLatticeClientInfo({ clientInfo })
          await this.tryAddAccount()
        }
      } catch (err) {
        this.client = null
        this.displayErrorModal(err)
      } finally {
        this.loading = false
      }
    },
    pairingModalDidClose (error) {
      this.pairingModalIsOpen = false
      if (error) {
        console.error(error)
      }
    },
    async pairingModalDidPair () {
      this.pairingModalIsOpen = false
      this.currentStep = 'latticeIsPaired'
      await this.setLatticeClientInfo({ clientInfo: this.tmpClientInfo })
      // Try to add an account for the currently selected asset
      await this.tryAddAccount()
    },
    isClientPaired (client, deviceID) {
      return new Promise((resolve, reject) => {
        client.connect(deviceID, (err, isPaired) => {
          if (err) {
            reject(err)
          } else {
            resolve(!isPaired ? false : isPaired)
          }
        })
      })
    },
    async handleClientInfo ({ clientInfo }) {
      await this.setLatticeClientInfo({ clientInfo })
      await this._connect(clientInfo)
    },
    async handlePairingSuccess () {
      this.currentStep = 'latticeIsPaired'
    },
    async handleRemoveClient () {
      await this.clearLatticeData()
      this.currentStep = 'selectLatticeAsset'
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
    async handleGoToWallet () {
      this.$router.replace('/wallet')
    },
    // ------------------------------------------------------------------------------
    // HELPER WALLET FUNCTIONS
    // ------------------------------------------------------------------------------
    _walletAssetsEnabledForChain (chain) {
      const assetKeys = this.enabledAssets[this.activeNetwork]?.[this.activeWalletId] || []
      const ethAssets = assetKeys.filter(asset => cryptoassets[asset].chain === chain)
      return ethAssets
    },
    _getFilteredExistingAccounts (filteredBy) {
      const accounts = this.accounts()[this.activeWalletId][this.activeNetwork].filter(account => account.enabled)
      return accounts.filter(filteredBy)
    },
    // ------------------------------------------------------------------------------
    // BITCOIN ASSETS
    // ------------------------------------------------------------------------------
    _bitcoinAssets () {
      return this._walletAssetsEnabledForChain('bitcoin')
    },
    // ------------------------------------------------------------------------------
    // BITCOIN ACCOUNTS
    // ------------------------------------------------------------------------------
    async _bitcoinAccounts (assets = this._bitcoinAssets(), network) {
      const clientInfo = await this.latticeClientInfo()
      const { deviceID, password } = clientInfo
      const provider = new BitcoinLatticeProvider(
        {
          pairingCodeProvider: (input) => '', /* Ignored */
          derivationPath: `m/49'/${network.coinType}'/0'/0/0`,
          deviceID: deviceID,
          devicePassword: password,
          network: network
        }
      )
      const addresses = await provider.getAddresses()
      return addresses.map((account, index) => {
        return {
          name: `Lattice BTC: #${index + 1}`,
          alias: '',
          chain: 'bitcoin',
          addresses: [account.address],
          assets: assets,
          index: index,
          type: this.selectedAsset.types[0],
          enabled: true,
          derivationPath: account.derivationPath,
          color: getNextAccountColor('bitcoin', index)
        }
      })
    },
    // ------------------------------------------------------------------------------
    // ETHEREUM ASSETS
    // ------------------------------------------------------------------------------
    _ethereumAssets () {
      return this._walletAssetsEnabledForChain('ethereum')
    },
    // ------------------------------------------------------------------------------
    // ETHEREUM ACCOUNTS
    // ------------------------------------------------------------------------------
    async _ethereumAccounts (assets = this._ethereumAssets(), network) {
      const clientInfo = await this.latticeClientInfo()
      const { deviceID, password } = clientInfo
      const provider = new EthereumLatticeProvider(
        {
          pairingCodeProvider: (input) => '', /* Ignored */
          derivationPath: `m/44'/${network.coinType}'/0'/0/0`,
          deviceID: deviceID,
          devicePassword: password,
          network: network
        }
      )
      const addresses = await provider.getAddresses()
      return addresses.map((account, index) => {
        return {
          name: `Lattice ETH: #${index + 1}`,
          alias: '',
          chain: 'ethereum',
          addresses: [account.address],
          assets: assets,
          index: index,
          type: this.selectedAsset.types[0],
          enabled: true,
          derivationPath: account.derivationPath,
          color: getNextAccountColor('ethereum', index)
        }
      })
    },
    // ------------------------------------------------------------------------------
    // CREATE ACCOUNT
    // ------------------------------------------------------------------------------
    async _createAccount (account, network) {
      const compareAddresses = (addrs1, addrs2) => {
        const formatAddress = (addr) => {
          // 0x prefixes are stripped in app state
          return addr.slice(0, 2) === '0x'
            ? (addr.slice(2)).toLowerCase()
            : (addr.toLowerCase())
        }
        const formatted1 = addrs1.map(formatAddress)
        const formatted2 = addrs2.map(formatAddress)
        return formatted1.sort().join(',') === formatted2.sort().join(',')
      }
      const filter = (x) => {
        return (
          (x.derivationPath === account.derivationPath) &&
          (x.chain === account.chain) &&
          (compareAddresses(x.addresses, account.addresses))
        )
      }
      const existingAccounts = this._getFilteredExistingAccounts(filter)
      if (existingAccounts.length > 0) {
        return existingAccounts[0]
      }
      const createdAccount = await this.createAccount({
        network: network,
        walletId: this.activeWalletId,
        account
      })
      await this.updateAccountBalance({
        network: network,
        walletId: this.activeWalletId,
        accountId: createdAccount.id
      })
      return createdAccount
    },
    _createNewClient (deviceID, password) {
      // -----------------------------------------------------------------------
      // CREATE A CLIENT
      // -----------------------------------------------------------------------
      const name = 'Liquality'
      const client = (() => {
        const ReactCrypto = require('gridplus-react-crypto').default
        const crypto = new ReactCrypto()
        const privKey = crypto.createHash('sha256').update(`${deviceID}${password}${name}`).digest()
        return new Client({ name, crypto, privKey })
      })()
      return { client: client, name: name }
    }
  }
}
</script>
<style lang="scss">
</style>
