<template>
  <WalletAccounts @item-selected="onAccountSelected"
                  :accounts="accountsData"/>
</template>

<script>
import { mapGetters, mapActions } from 'vuex'
import WalletAccounts from '@/components/WalletAccounts'

export default {
  computed: {
    ...mapGetters(['accountsData'])
  },
  components: {
    WalletAccounts
  },
  methods: {
    ...mapActions(['latticeDebugMsg']),
    onAccountSelected ({ account, asset }) {
      const _asset = asset || account.assets[0]
      this.latticeDebugMsg(`${_asset} account ${JSON.stringify(account)}`)
      this.$router.push(`/accounts/${account.id}/${_asset}`)
    }
  }
}
</script>
<style lang="scss">
</style>
