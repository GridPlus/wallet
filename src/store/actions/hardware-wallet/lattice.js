export const setLatticeClientInfo = async ({ commit }, { clientInfo }) => {
  console.log('setting lattice client info', clientInfo)
  commit('SET_LATTICE_CLIENT_INFO', { clientInfo })
}

export const setLatticeAsset = async ({ commit }, { asset }) => {
  commit('SET_LATTICE_ASSET', { asset })
}

export const latticeDebugMsg = async ({ commit }, { msg }) => {
  console.log('lattice msg', msg)
}
