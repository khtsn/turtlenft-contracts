<template>
  <div>
    <h1>NFT Interaction</h1>
    <p><strong>Contract Address:</strong> {{ contractAddress }}</p>
    <button @click="connectWallet">Connect Wallet</button>
    <p v-if="account">Connected: {{ account }}</p>

    <div>
      <input v-model="mintWallet" placeholder="Wallet address" />
      <input v-model="mintAmount" type="number" placeholder="Amount" />
      <button @click="mintNFT">Mint NFT (Contract owner only)</button>
    </div>

    <div>
      <input v-model="publicMintAmount" type="number" placeholder="Amount" />
      <button @click="publicMintWithERC20">Public Mint with ERC20</button>
    </div>

    <div>
      <button @click="getTotalSupply">Get Total Supply</button>
      <p v-if="totalSupply !== null">Total Supply: {{ totalSupply }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ethers } from 'ethers'
import { getNFTContract, getTokenContract } from '../services/contractService'

const account = ref('')
const totalSupply = ref(null)
const mintWallet = ref('')
const mintAmount = ref(1)
const publicMintAmount = ref(1)
const contractAddress = import.meta.env.VITE_NFT_ADDRESS

async function connectWallet() {
  if (window.ethereum) {
    await window.ethereum.request({ method: 'eth_requestAccounts' })
    const provider = new ethers.providers.Web3Provider(window.ethereum)
    account.value = await provider.getSigner().getAddress()
    mintWallet.value = account.value // Set default mint wallet to connected account
  } else {
    alert('Please install MetaMask!')
  }
}

async function mintNFT() {
  if (!account.value) return alert('Connect wallet first')
  const targetWallet = mintWallet.value || account.value
  const amount = mintAmount.value || 1
  const contract = getNFTContract()
  const tx = await contract.adminMint(targetWallet, amount)
  await tx.wait()
  alert(`${amount} NFT(s) minted to ${targetWallet}`)
}

async function publicMintWithERC20() {
  if (!account.value) return alert('Connect wallet first')
  const amount = publicMintAmount.value || 1
  const nftContract = getNFTContract()
  const tokenContract = getTokenContract()
  
  // Get ERC20 fee and calculate total cost
  const erc20Fee = await nftContract.erc20TokenFee()
  const totalCost = erc20Fee.mul(amount)
  
  // Approve tokens
  const approveTx = await tokenContract.approve(nftContract.address, totalCost)
  await approveTx.wait()
  
  // Mint NFTs
  const tx = await nftContract.publicMintWithERC20Token(amount)
  await tx.wait()
  alert(`${amount} NFT(s) minted successfully`)
}

async function getTotalSupply() {
  const contract = getNFTContract()
  const supply = await contract.totalSupply()
  totalSupply.value = supply.toString()
}
</script>

<style scoped>
button {
  margin-right: 0.5rem;
}
</style>
