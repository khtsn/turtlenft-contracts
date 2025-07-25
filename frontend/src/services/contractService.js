import { ethers } from 'ethers'
import TokenABI from '../abis/Token.json'
import NFTABI from '../abis/NFT.json'
import EarningABI from '../abis/Earning.json'

// RPC provider for Cronos testnet
const rpcUrl = import.meta.env.VITE_CRONOS_RPC_URL
const provider = new ethers.providers.JsonRpcProvider(rpcUrl)

// Returns a signer if MetaMask (or another provider) is available, otherwise fallback provider
function getSigner() {
  if (window.ethereum) {
    const web3Provider = new ethers.providers.Web3Provider(window.ethereum)
    return web3Provider.getSigner()
  }
  return provider
}

// Contract instances
export function getTokenContract() {
  const address = import.meta.env.VITE_TOKEN_ADDRESS
  return new ethers.Contract(address, TokenABI, getSigner())
}

export function getNFTContract() {
  const address = import.meta.env.VITE_NFT_ADDRESS
  return new ethers.Contract(address, NFTABI, getSigner())
}

export function getEarningContract() {
  const address = import.meta.env.VITE_EARNING_ADDRESS
  return new ethers.Contract(address, EarningABI, getSigner())
}
