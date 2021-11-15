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
import { mapActions, mapState, mapGetters } from 'vuex'
import { Client } from 'gridplus-sdk'
import NavBar from '@/components/NavBar'
import GetLatticeClient from './GetLatticeClient'
import Loading from './Loading'
import PairWithLattice from './PairWithLattice'
import SelectAsset from './SelectAsset'
import SetupDone from './SetupDone'
import LatticePairingModal from '@/components/LatticePairingModal'
import LatticeClientInfoModal from '@/components/LatticeClientInfoModal'
import LatticeDeviceErrorModal from '@/components/LatticeDeviceErrorModal'
import { getNextAccountColor } from '@/utils/accounts'
import { getDerivationPath } from '@/utils/derivationPath'
import { LATTICE_OPTIONS } from '@/utils/lattice'
import cryptoassets from '@/utils/cryptoassets'
import { BitcoinNetworks } from '@liquality/bitcoin-networks'
import { EthereumNetworks } from '@liquality/ethereum-networks'

import { BitcoinLatticeProvider } from '@liquality/bitcoin-lattice-provider'
import { EthereumLatticeProvider } from '@liquality/ethereum-lattice-provider'
import add from 'date-fns/fp/add/index'
import { format } from 'date-fns/fp'

// We will only support one account per current for now
const FIXED_ACCOUNT_IDX = 0

export default {
  components: {
    NavBar,
    GetLatticeClient,
    Loading,
    PairWithLattice,
    SelectAsset,
    SetupDone,
    LatticeClientInfoModal,
    LatticeDeviceErrorModal,
    LatticePairingModal
  },
  data () {
    return {
      currentStep: "selectLatticeAsset",
      selectedAsset: LATTICE_OPTIONS[0],
      pairingCode: null,
      // 'client' may need to be set prior to 
      // displaying the 'LatticePairingModel'.
      //
      // See: 'connectToLattice'.
      client: null,
      clientInfo: null,
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
    ]),
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
    async hasClientInfo() {
      const clientInfo = await this.latticeClientInfo()
      if (!clientInfo || !clientInfo.name || !clientInfo.deviceID || !clientInfo.password) {
        return false
      }
      return true
    },
    async handleRefreshConnection() {
      const clientInfo = await this.latticeClientInfo()
      await this.connectToLattice(clientInfo.deviceID, clientInfo.password)
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
    displayErrorModal(error) {
      this.deviceError = error
      this.deviceErrorModalIsOpen = true
    },
    deviceErrorModalDidClose() {
      this.deviceErrorModalIsOpen = false
      this.deviceError = null
    },
    didCancelSelectAsset() {
      this.$router.replace('/wallet')
    },
    didUpdateAsset(asset) {
      this.selectedAsset = asset
    },
    didConfirmAsset(asset) {
      return new Promise(async (resolved, rejected) => {
        this.loading = true
        const hasClientInfo = await this.hasClientInfo()
        if (hasClientInfo === false) {
          await this.clearLatticeData()
          this.clientInfoModalIsOpen = true
        } else {
          await this.handleRefreshConnection()
          this.didUpdateAsset(asset)

          //-----------------------------------------------------------------------
          // GATHER ASSET KEYS
          //-----------------------------------------------------------------------
          const assetKeys = this.enabledAssets[this.activeNetwork]?.[this.activeWalletId] || []

          //-----------------------------------------------------------------------
          // DETERMINE AVAILABLE ASSETS
          //-----------------------------------------------------------------------
          if (this.selectedAsset.name === "ETH") {
            const ethAssets = assetKeys.filter(asset => cryptoassets[asset].chain === 'ethereum')
            const ethAccounts = await this._ethereumAccounts(ethAssets, EthereumNetworks.ethereum_mainnet)
            try {
              for (var i = 0; i < ethAccounts.length; i++) {
                console.log(`[A]: ${i}; ${JSON.stringify(ethAccounts[i], null, 2)}`)
                const account = await this._createAccount(ethAccounts[i], this.activeNetwork)
              }
            } catch (e) {
              return rejected(e)
            }
          } else if (this.selectedAsset.name === "BTC") {
            const isTestnet = this.activeNetwork === 'testnet'
            const btcAssets = assetKeys.filter(asset => cryptoassets[asset].chain === 'bitcoin')
            const btcAccounts = await this._bitcoinAccounts(btcAssets, isTestnet ? BitcoinNetworks.bitcoin_testnet : BitcoinNetworks.bitcoin)
            try {
              for (var i = 0; i < btcAccounts.length; i++) {
                const account = await this._createAccount(btcAccounts[i], this.activeNetwork)
              }
            } catch (e) {
              return rejected(e)
            }
          }
        }
        this.loading = false
        resolved()
      })
    },
    clientInfoModalDidClose() {
      return new Promise(async (resolved) => {
        this.clientInfoModalIsOpen = false
        await this.clearLatticeData()
        resolved()
      })
    },
    //---------------------------------------------------------------------------
    // See: 'LatticeClientInfoModal.vue'
    //---------------------------------------------------------------------------
    connectToLattice(deviceID, password) {
      return new Promise(async (resolved) => {
        //-----------------------------------------------------------------------
        // PREPARE THE UI
        //-----------------------------------------------------------------------
        this.clientInfoModalIsOpen = false
        this.loading = true

        //-----------------------------------------------------------------------
        // UPDATE 'CLIENTINFO' (IMPORTANT)
        //-----------------------------------------------------------------------
        const { client, name } = this._createNewClient(deviceID, password)
        this.client = client
        this.clientInfo = { name, deviceID, password }

        //-----------------------------------------------------------------------
        // PAIR CLIENT (IF NECESSARY)
        //-----------------------------------------------------------------------
        try {
          const isClientPaired = await this.isClientPaired(client, deviceID)
          if (!isClientPaired) {
            this.pairingModalIsOpen = true
          } else {
            this.pairingModalDidPair(client)
          }
        } catch(err) {
          this.client = null
          this.displayErrorModal(err)
        } finally {
          this.loading = false
          resolved()
        }
      })
    },
    pairingModalDidClose(error) {
      this.pairingModalIsOpen = false
      if (error) {
        console.error(error)
      }
    },
    async pairingModalDidPair(pairingCode) {
      this.pairingModalIsOpen = false
      this.currentStep = "latticeIsPaired"
      const clientInfo = {
        name: this.clientInfo.name,
        deviceID: this.clientInfo.deviceID,
        password: this.clientInfo.password
      }
      await this.setLatticeClientInfo({clientInfo})
    },
    isClientPaired(client, deviceID) {
      return new Promise((resolved, rejected) => {
        client.connect(deviceID, (err, isPaired) => {
          if (err) {
            rejected(err)
          }
          else {
            resolved(!isPaired ? false : isPaired)
          }
        })
      })
    },
    async handleClientInfo ({ clientInfo }) {
      await this.setLatticeClientInfo({ clientInfo })
      await this._connect(clientInfo)
    },
    async handlePairingSuccess () {
      this.currentStep = 'selectLatticeAsset'
    },
    async handleRemoveClient () {
      await this.clearLatticeData()
      this.currentStep = "selectLatticeAsset"
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
    _walletAssetsEnabledForChain(chain) {
      const assetKeys = this.enabledAssets[this.activeNetwork]?.[this.activeWalletId] || []
      const ethAssets = assetKeys.filter(asset => cryptoassets[asset].chain === chain)
      return ethAssets
    },
    _walletAccountsEnabled(filteredBy) {
      const accounts = this.accounts()[this.activeWalletId][this.activeNetwork].filter(account => account.enabled)
      if (!filteredBy) {
        return accounts
      }
      return filteredBy
        .flatMap(filter => accounts.filter(filter))
        .reduce((previous, current) => {
          return current
        })
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
      const { deviceID, password } = this.clientInfo
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
      const { deviceID, password } = this.clientInfo
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
      const compareETHAddresses = ((addrs1, addrs2) => {
        const formatAddress = ((addr) => {
          return addr.slice(0, 2) === "0x" ? 
            (addr.slice(2)).toLowerCase() : 
            (addr.toLowerCase())
        })
        const formatted1 = addrs1.map(formatAddress)
        const formatted2 = addrs2.map(formatAddress)

        console.log(`${JSON.stringify(formatted1)}`)
        console.log(`${JSON.stringify(formatted2)}`)
        return formatted1.sort().join(',') === formatted2.sort().join(',')
      })
      const existingAccounts = this._walletAccountsEnabled([
        (existingAccount => existingAccount.type === account.type),
        (existingAccount => existingAccount.derivationPath === account.derivationPath),
        (existingAccount => compareETHAddresses(existingAccount.addresses, account.addresses)),
      ])
      console.log(`[B]: ${JSON.stringify(existingAccounts, null, 2)}`)
      if (existingAccounts.length > 0) {
        return account
      }
      console.log(`[C]: Creating account....`)
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
    _createNewClient(deviceID, password) {
      //-----------------------------------------------------------------------
      // CREATE A CLIENT
      //-----------------------------------------------------------------------
      const name = "Liquality"
      const client = (() => {
        const ReactCrypto = require('gridplus-react-crypto').default
        const crypto = new ReactCrypto()
        const privKey = crypto.createHash('sha256').update(`${deviceID}${password}${name}`).digest()
        return new Client({ name, crypto, privKey })
      })()
      return { client: client, name: name }
    }
  },
}
</script>
<style lang="scss">
</style>
