export const removeAccount = async ({ commit }, { walletId, id, network }) => {
  console.log('removing account', id, walletId)
  commit('REMOVE_ACCOUNT', { walletId, id, network })
  return id
}
