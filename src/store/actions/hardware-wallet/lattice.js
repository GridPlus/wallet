export const setLatticeClientInfo = async ({ commit }, { clientInfo }) => {
  commit('SET_LATTICE_CLIENT_INFO', { clientInfo })
}

export const setLatticeAsset = async ({ commit }, { asset }) => {
  commit('SET_LATTICE_ASSET', { asset })
}

export const clearLatticeData = async ({ commit }) => {
  commit('CLEAR_LATTICE_DATA')
}

export const latticeDebugMsg = async ({ commit }, msg) => {
  console.log('lattice msg', msg)
}

export const getLatticeAccounts = async (
  { getters },
  { network, walletId, asset, accountType, startingIndex, numAccounts }
) => {
  const { client, networkAccounts } = getters
  const { chain } = assets[asset]
  const result = []

  return results
}
