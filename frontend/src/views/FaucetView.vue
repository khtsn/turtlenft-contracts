<template>
  <div>
    <h1>Token Faucet</h1>
    <p><strong>Contract Address:</strong> {{ contractAddress }}</p>
    <button @click="connectWallet">Connect Wallet</button>
    <p v-if="account">Connected: {{ account }}</p>

    <div>
      <button @click="getRewardAmount">Get Reward Amount</button>
      <p v-if="rewardAmount !== null">Reward per Claim: {{ rewardAmount }} tokens</p>
    </div>

    <div>
      <button @click="checkCooldown">Check Cooldown</button>
      <p v-if="cooldownTime !== null">
        {{ cooldownTime === 0 ? 'Ready to claim!' : `Wait ${Math.ceil(cooldownTime / 60)} minutes` }}
      </p>
    </div>

    <div>
      <button @click="claimTokens" :disabled="cooldownTime > 0">Claim Tokens</button>
    </div>

    <div v-if="isOwner">
      <h3>Owner Functions</h3>
      <div>
        <input v-model="newRewardAmount" type="number" placeholder="New reward amount" />
        <button @click="setRewardAmount">Set Reward Amount</button>
      </div>
      <div>
        <input v-model="withdrawAmount" type="number" placeholder="Withdraw amount" />
        <button @click="withdrawTokens">Withdraw Tokens</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ethers } from 'ethers'

const account = ref('')
const rewardAmount = ref(null)
const cooldownTime = ref(null)
const isOwner = ref(false)
const newRewardAmount = ref('')
const withdrawAmount = ref('')
const contractAddress = import.meta.env.VITE_FAUCET_ADDRESS

async function connectWallet() {
  if (window.ethereum) {
    await window.ethereum.request({ method: 'eth_requestAccounts' })
    const provider = new ethers.providers.Web3Provider(window.ethereum)
    account.value = await provider.getSigner().getAddress()
    await checkOwnership()
  } else {
    alert('Please install MetaMask!')
  }
}

function getFaucetContract() {
  if (!window.ethereum) return null
  const provider = new ethers.providers.Web3Provider(window.ethereum)
  const signer = provider.getSigner()
  
  const abi = [
    "function claim() external",
    "function rewardAmount() external view returns (uint256)",
    "function getTimeUntilNextClaim(address user) external view returns (uint256)",
    "function setRewardAmount(uint256 _rewardAmount) external",
    "function withdraw(uint256 amount) external",
    "function owner() external view returns (address)",
    "event Claimed(address indexed user, uint256 amount)"
  ]
  
  return new ethers.Contract(contractAddress, abi, signer)
}

async function checkOwnership() {
  if (!account.value) return
  const contract = getFaucetContract()
  const owner = await contract.owner()
  isOwner.value = owner.toLowerCase() === account.value.toLowerCase()
}

async function getRewardAmount() {
  const contract = getFaucetContract()
  const amount = await contract.rewardAmount()
  rewardAmount.value = ethers.utils.formatEther(amount)
}

async function checkCooldown() {
  if (!account.value) return alert('Connect wallet first')
  const contract = getFaucetContract()
  const time = await contract.getTimeUntilNextClaim(account.value)
  cooldownTime.value = time.toNumber()
}

async function claimTokens() {
  if (!account.value) return alert('Connect wallet first')
  const contract = getFaucetContract()
  
  try {
    const tx = await contract.claim()
    await tx.wait()
    alert('Tokens claimed successfully!')
    await checkCooldown()
  } catch (error) {
    alert('Claim failed: ' + error.message)
  }
}

async function setRewardAmount() {
  if (!account.value || !isOwner.value) return alert('Owner access required')
  const contract = getFaucetContract()
  
  try {
    const amount = ethers.utils.parseEther(newRewardAmount.value)
    const tx = await contract.setRewardAmount(amount)
    await tx.wait()
    alert('Reward amount updated!')
    newRewardAmount.value = ''
    await getRewardAmount()
  } catch (error) {
    alert('Update failed: ' + error.message)
  }
}

async function withdrawTokens() {
  if (!account.value || !isOwner.value) return alert('Owner access required')
  const contract = getFaucetContract()
  
  try {
    const amount = ethers.utils.parseEther(withdrawAmount.value)
    const tx = await contract.withdraw(amount)
    await tx.wait()
    alert('Tokens withdrawn!')
    withdrawAmount.value = ''
  } catch (error) {
    alert('Withdrawal failed: ' + error.message)
  }
}
</script>

<style scoped>
button {
  margin-right: 0.5rem;
  margin-bottom: 0.5rem;
}

input {
  margin-right: 0.5rem;
  padding: 0.25rem;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

h3 {
  margin-top: 2rem;
  color: #666;
}
</style>