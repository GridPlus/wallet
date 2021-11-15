export const LATTICE_BITCOIN_OPTIONS = [
  {
    name: 'bitcoin_lattice_wrapped_segwit',
    label: 'Segwit',
    addressType: 'p2sh-segwit'
  },
  {
    name: 'bitcoin_lattice_legacy',
    label: 'Legacy',
    addressType: 'legacy'
  }
]

export const LATTICE_OPTIONS = [
  {
    name: 'ETH',
    label: 'ETH',
    types: ['ethereum_lattice'],
    chain: 'ethereum'
  },
  {
    name: 'BTC',
    label: 'BTC',
    types: [
      'bitcoin_lattice_wrapped_segwit',
      'bitcoin_lattice_legacy'
    ],
    chain: 'bitcoin'
  }
]
