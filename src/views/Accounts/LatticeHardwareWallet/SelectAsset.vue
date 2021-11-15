<template>
  <div class="wrapper">
    <div class="wrapper_top">
      <div class="step-detail">
        <div class="step-number">1</div>
        <div class="step-name">Select Asset</div>
      </div>
      <div class="options">
        <div class="options-text">
          <span>Select the same asset here</span>
        </div>
        <div class="dropdown" v-click-away="hideAssetList">
          <button class="btn dropdown-toggle lg" @click="toggleAssetList">
            <div class="form" v-if="selectedAsset">
              <div class="input-group">
                <img
                  :src="getAssetIcon(selectedAsset.name)"
                  class="asset-icon"
                />
                <span class="input-group-text">
                  {{ selectedAsset.label }}
                </span>
              </div>
            </div>
            <ChevronRightIcon :class="{ open: assetsDropdownOpen }" />
          </button>
          <ul class="dropdown-menu lg" :class="{ show: assetsDropdownOpen }">
            <li v-for="asset in assetList" :key="asset.name">
              <a class="dropdown-item" href="#" @click="selectAsset(asset)">
                 <div class="form">
              <div class="input-group">
                <img
                  :src="getAssetIcon(asset.name)"
                  class="asset-icon"
                />
                <span class="input-group-text">
                  {{ asset.label }}
                </span>
              </div>
            </div>
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>
    <div class="wrapper_bottom">
      <div class="button-group">
        <button
          class="btn btn-light btn-outline-primary btn-lg"
          @click="cancelSelection"
        >
          Cancel
        </button>
        <button
          class="btn btn-primary btn-lg btn-icon"
          @click="submitAsset"
          :disabled="loading || !selectedAsset"
        >
          <SpinnerIcon class="btn-loading" v-if="loading" />
          <template v-else>Select</template>
        </button>
      </div>
    </div>
  </div>
</template>
<script>

import SpinnerIcon from '@/assets/icons/spinner.svg'
import ChevronRightIcon from '@/assets/icons/chevron_right_gray.svg'
import { LATTICE_OPTIONS } from '@/utils/lattice'
import { getAssetIcon } from '@/utils/asset'
import clickAway from '@/directives/clickAway'

export default {
  props: ['selectedAsset', 'loading'],
  components: {
    SpinnerIcon,
    ChevronRightIcon
  },
  data () {
    return {
      assetsDropdownOpen: false
    }
  },
  directives: {
    clickAway
  },
  methods: {
    getAssetIcon,
    cancelSelection () {
      this.$emit('on-cancel-select-asset')
    },
    selectAsset (asset) {
      this.$emit('on-select-asset', asset)
      this.hideAssetList()
    },
    toggleAssetList () {
      this.assetsDropdownOpen = !this.assetsDropdownOpen
    },
    hideAssetList () {
      this.assetsDropdownOpen = false
    },
    submitAsset () {
      this.$emit('on-confirm-asset', this.selectedAsset)
    }
  },
  computed: {
    assetList () {
      return LATTICE_OPTIONS.filter(i => i.name !== this.selectedAsset?.name)
    }
  }
}
</script>

<style lang="scss">
  .wrapper_top {
    align-items: center;
  }
</style>
