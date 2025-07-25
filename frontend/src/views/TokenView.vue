<template>
  <div>
    <h1>Token Interaction</h1>
    <p><strong>Contract Address:</strong> {{ contractAddress }}</p>
    <button @click="connectWallet">Connect Wallet</button>
    <p v-if="account">Connected: {{ account }}</p>

    <div>
      <button @click="getBalance">Get Balance</button>
      <p v-if="balance !== null">Token Balance: {{ balance }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ethers } from 'ethers'
import { getTokenContract } from '../services/contractService'

const account = ref('')
const mintAmount = ref('')
const balance = ref(null)
const contractAddress = import.meta.env.VITE_TOKEN_ADDRESS

async function connectWallet() {
  if (window.ethereum) {
    await window.ethereum.request({ method: 'eth_requestAccounts' })
    const provider = new ethers.providers.Web3Provider(window.ethereum)
    account.value = await provider.getSigner().getAddress()
  } else {
    alert('Please install MetaMask!')
  }
}

async function getBalance() {
  if (!account.value) return alert('Connect wallet first')
  const contract = getTokenContract()
  const bal = await contract.balanceOf(account.value)
  const decimals = await contract.decimals()
  balance.value = ethers.utils.formatUnits(bal, decimals)
}
</script>

<style scoped>
input {
  margin-right: 0.5rem;
}
</style>
