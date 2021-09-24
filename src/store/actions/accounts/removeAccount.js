export const removeAccount = async ({ commit }, { walletId, id, network }) => {
  commit('REMOVE_ACCOUNT', { walletId, id, network })
  return id
}
