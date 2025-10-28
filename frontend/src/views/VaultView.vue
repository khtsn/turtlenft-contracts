<template>
  <div>
    <h1>Turtle Redemption Vault</h1>
    <p><strong>Contract Address:</strong> {{ contractAddress }}</p>
    <button @click="connectWallet">Connect Wallet</button>
    <p v-if="account">Connected: {{ account }}</p>

    <div>
      <button @click="getVaultInfo">Get Vault Info</button>
      <div v-if="vaultInfo">
        <p><strong>Turtle Pool Balance:</strong> {{ vaultInfo.poolBalance }} TURTLE</p>
        <p><strong>Turtle per NFT:</strong> {{ vaultInfo.perNFT }} TURTLE</p>
        <p><strong>NFTs in Vault:</strong> {{ vaultInfo.nftCount }}</p>
        <p><strong>Swap Fee:</strong> {{ vaultInfo.swapFee }} TURTLE</p>
        <p><strong>Purchase Fee:</strong> {{ vaultInfo.purchaseFee }} CRO</p>
      </div>
    </div>

    <div>
      <h3>Deposit NFTs</h3>
      <input v-model="depositAmount" type="number" placeholder="Amount" />
      <button @click="depositByCount">Deposit by Count</button>
      <button @click="depositAllOwned">Deposit All Owned</button>
    </div>

    <div>
      <h3>Get NFTs</h3>
      <input v-model="swapAmount" type="number" placeholder="Amount" />
      <button @click="swapForNFTs">Swap TURTLE for NFTs</button>
      <button @click="purchaseWithCRO">Purchase with CRO</button>
    </div>

    <div v-if="isOwner">
      <h3>Owner Functions</h3>
      <div>
        <input v-model="newSwapFee" type="number" placeholder="New swap fee" />
        <button @click="setSwapFee">Set Swap Fee</button>
      </div>
      <div>
        <input v-model="newPurchaseFee" type="number" placeholder="New purchase fee" />
        <button @click="setPurchaseFee">Set Purchase Fee</button>
      </div>
      <div>
        <input v-model="withdrawAmount" type="number" placeholder="CRO amount" />
        <button @click="withdrawCRO">Withdraw CRO</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ethers } from 'ethers'
import { getNFTContract } from '../services/contractService'

const account = ref('')
const vaultInfo = ref(null)
const depositAmount = ref(1)
const swapAmount = ref(1)
const isOwner = ref(false)
const newSwapFee = ref('')
const newPurchaseFee = ref('')
const withdrawAmount = ref('')
const contractAddress = import.meta.env.VITE_VAULT_ADDRESS

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

function getVaultContract() {
  if (!window.ethereum) return null
  const provider = new ethers.providers.Web3Provider(window.ethereum)
  const signer = provider.getSigner()
  
  const abi = [
    "function turtlePoolBalance() external view returns (uint256)",
    "function turtlePerNFT() external view returns (uint256)",
    "function vaultNFTCount() external view returns (uint256)",
    "function swapFeeTurtle() external view returns (uint256)",
    "function purchaseFeeCRO() external view returns (uint256)",
    "function owner() external view returns (address)",
    "function depositByCount(uint256 amount) external",
    "function depositAllOwned() external",
    "function swapForNFTs(uint256 amount) external",
    "function purchaseNFTsWithCRO(uint256 amount) external payable",
    "function setSwapFeeTurtle(uint256 _newFee) external",
    "function setPurchaseFeeCRO(uint256 _newFee) external",
    "function withdrawCRO(uint256 amount) external"
  ]
  
  return new ethers.Contract(contractAddress, abi, signer)
}

async function checkOwnership() {
  if (!account.value) return
  const contract = getVaultContract()
  const owner = await contract.owner()
  isOwner.value = owner.toLowerCase() === account.value.toLowerCase()
}

async function getVaultInfo() {
  try {
    const contract = getVaultContract()
    
    const poolBalance = await contract.turtlePoolBalance()
    const perNFT = await contract.turtlePerNFT()
    const nftCount = await contract.vaultNFTCount()
    const swapFee = await contract.swapFeeTurtle()
    const purchaseFee = await contract.purchaseFeeCRO()
    
    vaultInfo.value = {
      poolBalance: ethers.utils.formatEther(poolBalance),
      perNFT: ethers.utils.formatEther(perNFT),
      nftCount: nftCount.toString(),
      swapFee: ethers.utils.formatEther(swapFee),
      purchaseFee: ethers.utils.formatEther(purchaseFee)
    }
  } catch (error) {
    alert('Error fetching vault info: ' + error.message)
  }
}

async function depositByCount() {
  if (!account.value) return alert('Connect wallet first')
  try {
    const contract = getVaultContract()
    const nftContract = getNFTContract()
    
    // Check if approval is already set
    const isApproved = await nftContract.isApprovedForAll(account.value, contractAddress)
    if (!isApproved) {
      const approveTx = await nftContract.setApprovalForAll(contractAddress, true)
      await approveTx.wait()
    }
    
    const tx = await contract.depositByCount(depositAmount.value)
    await tx.wait()
    alert(`${depositAmount.value} NFT(s) deposited successfully`)
    await getVaultInfo()
  } catch (error) {
    alert('Deposit failed: ' + error.message)
  }
}

async function depositAllOwned() {
  if (!account.value) return alert('Connect wallet first')
  try {
    const contract = getVaultContract()
    const nftContract = getNFTContract()
    
    // Check if approval is already set
    const isApproved = await nftContract.isApprovedForAll(account.value, contractAddress)
    if (!isApproved) {
      const approveTx = await nftContract.setApprovalForAll(contractAddress, true)
      await approveTx.wait()
    }
    
    const tx = await contract.depositAllOwned()
    await tx.wait()
    alert('All NFTs deposited successfully')
    await getVaultInfo()
  } catch (error) {
    alert('Deposit failed: ' + error.message)
  }
}

async function swapForNFTs() {
  if (!account.value) return alert('Connect wallet first')
  try {
    const contract = getVaultContract()
    const tx = await contract.swapForNFTs(swapAmount.value)
    await tx.wait()
    alert(`${swapAmount.value} NFT(s) swapped successfully`)
    await getVaultInfo()
  } catch (error) {
    alert('Swap failed: ' + error.message)
  }
}

async function purchaseWithCRO() {
  if (!account.value) return alert('Connect wallet first')
  try {
    const contract = getVaultContract()
    const purchaseFee = await contract.purchaseFeeCRO()
    const totalCost = purchaseFee.mul(swapAmount.value)
    
    const tx = await contract.purchaseNFTsWithCRO(swapAmount.value, { value: totalCost })
    await tx.wait()
    alert(`${swapAmount.value} NFT(s) purchased successfully`)
    await getVaultInfo()
  } catch (error) {
    alert('Purchase failed: ' + error.message)
  }
}

async function setSwapFee() {
  if (!account.value || !isOwner.value) return alert('Owner access required')
  try {
    const contract = getVaultContract()
    const fee = ethers.utils.parseEther(newSwapFee.value)
    const tx = await contract.setSwapFeeTurtle(fee)
    await tx.wait()
    alert('Swap fee updated!')
    newSwapFee.value = ''
    await getVaultInfo()
  } catch (error) {
    alert('Update failed: ' + error.message)
  }
}

async function setPurchaseFee() {
  if (!account.value || !isOwner.value) return alert('Owner access required')
  try {
    const contract = getVaultContract()
    const fee = ethers.utils.parseEther(newPurchaseFee.value)
    const tx = await contract.setPurchaseFeeCRO(fee)
    await tx.wait()
    alert('Purchase fee updated!')
    newPurchaseFee.value = ''
    await getVaultInfo()
  } catch (error) {
    alert('Update failed: ' + error.message)
  }
}

async function withdrawCRO() {
  if (!account.value || !isOwner.value) return alert('Owner access required')
  try {
    const contract = getVaultContract()
    const amount = ethers.utils.parseEther(withdrawAmount.value)
    const tx = await contract.withdrawCRO(amount)
    await tx.wait()
    alert('CRO withdrawn!')
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

h3 {
  margin-top: 2rem;
  color: #666;
}
</style>