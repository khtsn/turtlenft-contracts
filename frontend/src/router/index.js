import { createRouter, createWebHistory } from 'vue-router'
import TokenView from '../views/TokenView.vue'
import NFTView from '../views/NFTView.vue'
import EarningView from '../views/EarningView.vue'
import FaucetView from '../views/FaucetView.vue'

const routes = [
  {
    path: '/',
    redirect: '/token'
  },
  {
    path: '/token',
    name: 'Token',
    component: TokenView
  },
  {
    path: '/nft',
    name: 'NFT',
    component: NFTView
  },
  {
    path: '/earning',
    name: 'Earning',
    component: EarningView
  },
  {
    path: '/faucet',
    name: 'Faucet',
    component: FaucetView
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
