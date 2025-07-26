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
        <p>Current NFT Balance: {{ stakeInfo.currentNFTBalance }}</p>
        <p>Can Stake: {{ stakeInfo.canStake ? 'Yes' : 'No' }}</p>
        <p v-if="stakeInfo.additionalNFTs > 0">Additional NFTs to Stake: {{ stakeInfo.additionalNFTs }}</p>
        <p v-if="stakeInfo.tokensNeeded > 0">Turtle Tokens Needed: {{ stakeInfo.tokensNeeded }}</p>
        <p v-if="stakeInfo.warning">⚠️ {{ stakeInfo.warning }}</p>
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
  const nftContract = getNFTContract()
  
  const [nftCount, stakedAt, lastClaimAt] = await contract.getStakeInfo(account.value)
  const currentNFTBalance = await nftContract.balanceOf(account.value)
  const requiredPerNFT = await contract.requiredTurtlePerNFT()
  const fee = await contract.calculateWithdrawalFee(stakedAt)
  
  const stakedCount = nftCount.toNumber()
  const nftBalance = currentNFTBalance.toNumber()
  
  let canStake = false
  let additionalNFTs = 0
  let tokensNeeded = 0
  let warning = ''
  
  if (stakedCount > nftBalance) {
    warning = `You have ${stakedCount} NFTs staked but only ${nftBalance} NFTs in wallet. Acquire more NFTs to stake.`
  } else if (nftBalance > stakedCount) {
    canStake = true
    additionalNFTs = nftBalance - stakedCount
    tokensNeeded = parseFloat(ethers.utils.formatEther(requiredPerNFT.mul(additionalNFTs)))
  }
  
  stakeInfo.value = {
    nftCount: stakedCount,
    currentNFTBalance: nftBalance,
    canStake,
    additionalNFTs,
    tokensNeeded,
    warning,
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
  
  // Get current NFT balance and staked count
  const nftBalance = await nftContract.balanceOf(account.value)
  const [currentStakedCount] = await contract.getStakeInfo(account.value)
  
  // Check if staked amount is larger than current NFT balance
  if (currentStakedCount.gt(nftBalance)) {
    return alert(`Cannot stake: You have ${currentStakedCount.toString()} NFTs staked but only ${nftBalance.toString()} NFTs in your wallet. Please acquire more NFTs before staking.`)
  }
  
  const additionalNFTs = nftBalance.sub(currentStakedCount)
  
  // Check if there are additional NFTs to stake
  if (additionalNFTs.eq(0)) {
    return alert('No additional NFTs to stake. Your current NFT balance matches your staked amount.')
  }
  
  // Calculate approval amount for additional NFTs only
  const requiredPerNFT = await contract.requiredTurtlePerNFT()
  const exactAmount = additionalNFTs.mul(requiredPerNFT)
  
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
  
  // Check if user has any stakes
  if (!stakeInfo.value || stakeInfo.value.nftCount === 0) {
    return alert('No NFTs staked. You must stake NFTs before you can unstake them.')
  }
  
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
