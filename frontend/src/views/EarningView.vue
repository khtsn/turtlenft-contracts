<template>
  <div>
    <h1>Earning Interaction</h1>
    <p><strong>Contract Address:</strong> {{ contractAddress }}</p>
    <button @click="connectWallet">Connect Wallet</button>
    <p v-if="account">Connected: {{ account }}</p>

    <div>
      <button @click="fetchDailyRate">Get Daily Earning Rate</button>
      <p v-if="dailyRate !== null">Daily Earning Rate: {{ dailyRate }}</p>
    </div>

    <div>
      <button @click="fetchRequiredTurtle">Get Required Turtle Per NFT</button>
      <p v-if="requiredTurtle !== null">Required Turtle Per NFT: {{ requiredTurtle }}</p>
    </div>

    <div>
      <button @click="fetchStakeInfo">Get Stake Info</button>
      <div v-if="stakeInfo">
        <p>NFTs Staked: {{ stakeInfo.nftCount }}</p>
        <p>Staked At: {{ stakeInfo.stakedAt }}</p>
        <p>Last Claim At: {{ stakeInfo.lastClaimAt }}</p>
        <p>Withdrawal Fee: {{ stakeInfo.withdrawalFee }}</p>
      </div>
    </div>

    <div>
      <button @click="stakeNFTs">Stake NFTs</button>
      <button @click="unstakeNFTs">Unstake NFTs</button>
    </div>

    <div>
      <button @click="claimEarnings">Claim Earnings</button>
    </div>

    <div>
      <button @click="getEarningsBalance">Get Earnings Balance</button>
      <p v-if="earnings !== null">Earnings: {{ earnings }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ethers } from 'ethers'
import { getEarningContract, getNFTContract } from '../services/contractService'

const account = ref('')
const earnings = ref(null)
const dailyRate = ref(null)
const requiredTurtle = ref(null)
const stakeInfo = ref(null)
const contractAddress = import.meta.env.VITE_EARNING_ADDRESS

async function connectWallet() {
  if (window.ethereum) {
    await window.ethereum.request({ method: 'eth_requestAccounts' })
    const provider = new ethers.providers.Web3Provider(window.ethereum)
    account.value = await provider.getSigner().getAddress()
  } else {
    alert('Please install MetaMask!')
  }
}

async function fetchDailyRate() {
  if (!account.value) return alert('Connect wallet first')
  const contract = getEarningContract()
  const rate = await contract.dailyEarningRate()
  dailyRate.value = ethers.utils.formatEther(rate)
}

async function fetchRequiredTurtle() {
  if (!account.value) return alert('Connect wallet first')
  const contract = getEarningContract()
  const req = await contract.requiredTurtlePerNFT()
  requiredTurtle.value = ethers.utils.formatEther(req)
}

async function fetchStakeInfo() {
  if (!account.value) return alert('Connect wallet first')
  const contract = getEarningContract()
  const [nftCount, stakedAt, lastClaimAt] = await contract.getStakeInfo(account.value)
  const fee = await contract.calculateWithdrawalFee(stakedAt)
  stakeInfo.value = {
    nftCount: nftCount.toNumber(),
    stakedAtUnix: stakedAt.toNumber(),
    lastClaimAtUnix: lastClaimAt.toNumber(),
    stakedAt: new Date(stakedAt.toNumber() * 1000).toLocaleString(),
    lastClaimAt: new Date(lastClaimAt.toNumber() * 1000).toLocaleString(),
    withdrawalFee: ethers.utils.formatEther(fee)
  }
}

async function stakeNFTs() {
  if (!account.value) return alert('Connect wallet first')
  const contract = getEarningContract()
  const nftContract = getNFTContract()
  const { getTokenContract } = await import('../services/contractService')
  const tokenContract = getTokenContract()
  
  // Get NFT balance and required turtle per NFT
  const nftBalance = await nftContract.balanceOf(account.value)
  const requiredPerNFT = await contract.requiredTurtlePerNFT()
  const exactAmount = nftBalance.mul(requiredPerNFT)
  
  // Set exact approval amount for turtle tokens
  const approveTx = await tokenContract.approve(contract.address, exactAmount)
  await approveTx.wait()
  
  const tx = await contract.stake()
  await tx.wait()
  alert('NFTs staked')
}

async function unstakeNFTs() {
  if (!account.value) return alert('Connect wallet first')
  if (!stakeInfo.value) await fetchStakeInfo()
  const contract = getEarningContract()
  const fee = await contract.calculateWithdrawalFee(stakeInfo.value.stakedAtUnix)
  const tx = await contract.unstake({ value: fee })
  await tx.wait()
  alert('NFTs unstaked')
}

async function claimEarnings() {
  if (!account.value) return alert('Connect wallet first')
  const contract = getEarningContract()
  const tx = await contract.claim()
  await tx.wait()
  alert('Earnings claimed')
}

async function getEarningsBalance() {
  if (!account.value) return alert('Connect wallet first')
  const contract = getEarningContract()
  const bal = await contract.calculateEarnings(account.value)
  earnings.value = ethers.utils.formatEther(bal)
}
</script>

<style scoped>
button {
  margin-right: 0.5rem;
}
</style>
