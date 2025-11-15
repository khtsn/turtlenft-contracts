<template>
  <div>
    <h2>Turtle Redemption Vault</h2>
    
    <div v-if="!account">
      <button @click="connectWallet">Connect Wallet</button>
    </div>

    <div v-if="account">
      <p><strong>Connected:</strong> {{ account }}</p>
      <button @click="getVaultInfo">Refresh Vault Info</button>
    </div>

    <div v-if="vaultInfo">
      <h3>Vault Information</h3>
      <div>
        <p><strong>Contract Address:</strong> {{ contractAddress }}</p>
        <p><strong>Pool Balance:</strong> {{ vaultInfo.poolBalance }} TURTLE</p>
        <p><strong>Per NFT:</strong> {{ vaultInfo.perNFT }} TURTLE</p>
        <p><strong>Vault NFT Count:</strong> {{ vaultInfo.nftCount }}</p>
        <p><strong>Swap Fee:</strong> {{ vaultInfo.swapFee }} TURTLE</p>
        <p><strong>Purchase Fee:</strong> {{ vaultInfo.purchaseFee }} CRO</p>
      </div>
    </div>

    <div v-if="account">
      <h3>Your NFTs ({{ userNFTs.length }})</h3>
      <div v-if="userNFTs.length > 0" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 10px; margin: 20px 0;">
        <div 
          v-for="tokenId in userNFTs" 
          :key="tokenId"
          @click="toggleNFTSelection(tokenId)"
          :class="{ selected: selectedNFTs.includes(tokenId) }"
          style="border: 2px solid #ccc; padding: 10px; text-align: center; cursor: pointer; border-radius: 8px;"
        >
          <div>NFT #{{ tokenId }}</div>
          <div v-if="selectedNFTs.includes(tokenId)" style="color: green; font-weight: bold;">✓ Selected</div>
        </div>
      </div>
      <div v-else>
        <p>No NFTs found in your wallet</p>
      </div>
    </div>

    <div v-if="account">
      <h3>Vault NFTs ({{ vaultNFTs.length }})</h3>
      <div v-if="vaultNFTs.length > 0" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 10px; margin: 20px 0;">
        <div 
          v-for="tokenId in vaultNFTs" 
          :key="tokenId"
          @click="toggleVaultNFTSelection(tokenId)"
          :class="{ selected: selectedVaultNFTs.includes(tokenId) }"
          style="border: 2px solid #ccc; padding: 10px; text-align: center; cursor: pointer; border-radius: 8px;"
        >
          <div>NFT #{{ tokenId }}</div>
          <div v-if="selectedVaultNFTs.includes(tokenId)" style="color: green; font-weight: bold;">✓ Selected</div>
        </div>
      </div>
      <div v-else>
        <p>No NFTs in vault</p>
      </div>
    </div>

    <div v-if="account">
      <h3>Deposit NFTs</h3>
      <div style="margin: 10px 0;">
        <button @click="selectBatch(userNFTs, selectedNFTs, 0, 10)" style="margin-right: 5px;">Select First 10</button>
        <button @click="selectBatch(userNFTs, selectedNFTs, 10, 20)" style="margin-right: 5px;">Select Next 10</button>
        <button @click="clearSelection()">Clear All</button>
      </div>
      <div v-if="selectedNFTs.length > 0" style="margin: 10px 0;">
        <button @click="depositByTokenIds" style="margin-right: 10px;">
          Deposit Selected ({{ selectedNFTs.length }})
        </button>
      </div>
      <div v-else>
        <p>Select NFTs from your collection above to deposit</p>
      </div>
    </div>

    <div v-if="account">
      <h3>Get NFTs from Vault</h3>
      <div style="margin: 10px 0;">
        <button @click="selectBatch(vaultNFTs, selectedVaultNFTs, 0, 10)" style="margin-right: 5px;">Select First 10</button>
        <button @click="selectBatch(vaultNFTs, selectedVaultNFTs, 10, 20)" style="margin-right: 5px;">Select Next 10</button>
        <button @click="clearVaultSelection()">Clear All</button>
      </div>
      <div v-if="selectedVaultNFTs.length > 0" style="margin: 10px 0;">
        <div style="background: #f5f5f5; padding: 10px; border-radius: 8px; margin-bottom: 10px;">
          <p><strong>Cost Estimation:</strong></p>
          <p>Swap Cost: {{ getSwapCost() }} TURTLE ({{ vaultInfo.perNFT }} per NFT + {{ vaultInfo.swapFee }} fee each)</p>
          <p>Purchase Cost: {{ getPurchaseCost() }} CRO ({{ vaultInfo.purchaseFee }} per NFT)</p>
        </div>
        <button @click="swapForNFTs" style="margin-right: 10px;">
          Swap TURTLE for Selected ({{ selectedVaultNFTs.length }})
        </button>
        <button @click="purchaseWithCRO" style="margin-right: 10px;">
          Purchase with CRO ({{ selectedVaultNFTs.length }})
        </button>
      </div>
      <div v-else>
        <p>Select NFTs from vault above to swap/purchase</p>
      </div>
    </div>

    <div v-if="isOwner">
      <h3>Owner Functions</h3>
      <div style="margin: 10px 0;">
        <input v-model="newSwapFee" type="number" placeholder="New swap fee" style="margin-right: 10px;" />
        <button @click="setSwapFee">Set Swap Fee</button>
      </div>
      <div style="margin: 10px 0;">
        <input v-model="newPurchaseFee" type="number" placeholder="New purchase fee" style="margin-right: 10px;" />
        <button @click="setPurchaseFee">Set Purchase Fee</button>
      </div>
      <div style="margin: 10px 0;">
        <input v-model="withdrawAmount" type="number" placeholder="CRO amount" style="margin-right: 10px;" />
        <button @click="withdrawCRO">Withdraw CRO</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ethers } from 'ethers'

const account = ref('')
const vaultInfo = ref(null)
const userNFTs = ref([])
const vaultNFTs = ref([])
const selectedNFTs = ref([])
const selectedVaultNFTs = ref([])
const isOwner = ref(false)
const newSwapFee = ref('')
const newPurchaseFee = ref('')
const withdrawAmount = ref('')

const contractAddress = import.meta.env.VITE_VAULT_ADDRESS
const nftContractAddress = import.meta.env.VITE_NFT_ADDRESS
const tokenContractAddress = import.meta.env.VITE_TOKEN_ADDRESS
const chainId = import.meta.env.VITE_CHAIN_ID || 25

function getVaultContract() {
  if (!window.ethereum) return null
  const provider = new ethers.providers.Web3Provider(window.ethereum)
  const signer = provider.getSigner()
  
  const abi = [
    "function turtlePerNFT() external view returns (uint256)",
    "function getVaultNFTs() external view returns (uint256[])",
    "function swapFeeTurtle() external view returns (uint256)",
    "function purchaseFeeCRO() external view returns (uint256)",
    "function owner() external view returns (address)",
    "function depositByIds(uint256[] calldata tokenIds) external",
    "function swapForNFTs(uint256[] calldata tokenIds) external",
    "function purchaseNFTsWithCRO(uint256[] calldata tokenIds) external payable",
    "function setSwapFeeTurtle(uint256 _newFee) external",
    "function setPurchaseFeeCRO(uint256 _newFee) external",
    "function withdrawCRO(uint256 amount) external"
  ]
  
  return new ethers.Contract(contractAddress, abi, signer)
}

function getNFTContract() {
  if (!window.ethereum) return null
  const provider = new ethers.providers.Web3Provider(window.ethereum)
  const signer = provider.getSigner()
  
  const abi = [
    "function balanceOf(address owner) external view returns (uint256)",
    "function setApprovalForAll(address operator, bool approved) external",
    "function isApprovedForAll(address owner, address operator) external view returns (bool)"
  ]
  
  return new ethers.Contract(nftContractAddress, abi, signer)
}

function getTurtleContract() {
  if (!window.ethereum) return null
  const provider = new ethers.providers.Web3Provider(window.ethereum)
  const signer = provider.getSigner()
  
  const abi = [
    "function balanceOf(address account) external view returns (uint256)",
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function allowance(address owner, address spender) external view returns (uint256)"
  ]
  
  return new ethers.Contract(tokenContractAddress, abi, signer)
}

async function connectWallet() {
  if (window.ethereum) {
    await window.ethereum.request({ method: 'eth_requestAccounts' })
    const provider = new ethers.providers.Web3Provider(window.ethereum)
    const signer = provider.getSigner()
    account.value = await signer.getAddress()
    await checkOwnership()
    await loadUserNFTs()
    await loadVaultNFTs()
    await getVaultInfo()
  } else {
    alert('Please install MetaMask!')
  }
}

async function loadUserNFTs() {
  if (!account.value) return
  try {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'
    const apiUrl = `${apiBaseUrl}/api/${nftContractAddress}/${chainId}/tokens?owner=${account.value}`
    
    const response = await fetch(apiUrl)
    const data = await response.json()
    
    userNFTs.value = data.tokens ? data.tokens.map(t => t.toString()) : []
    selectedNFTs.value = []
  } catch (error) {
    console.error('Error loading user NFTs:', error)
    userNFTs.value = []
    selectedNFTs.value = []
  }
}

async function loadVaultNFTs() {
  try {
    const contract = getVaultContract()
    const tokens = await contract.getVaultNFTs()
    vaultNFTs.value = tokens.map(t => t.toString())
    selectedVaultNFTs.value = []
    
    // Remove vault NFTs from user's collection to handle API delays
    vaultNFTs.value.forEach(tokenId => {
      const index = userNFTs.value.indexOf(tokenId)
      if (index > -1) {
        userNFTs.value.splice(index, 1)
      }
    })
  } catch (error) {
    console.error('Error loading vault NFTs:', error)
  }
}

function toggleNFTSelection(tokenId) {
  const index = selectedNFTs.value.indexOf(tokenId)
  if (index > -1) {
    selectedNFTs.value.splice(index, 1)
  } else {
    if (selectedNFTs.value.length < 20) {
      selectedNFTs.value.push(tokenId)
    } else {
      alert('Maximum 20 NFTs can be selected')
    }
  }
}

function toggleVaultNFTSelection(tokenId) {
  const index = selectedVaultNFTs.value.indexOf(tokenId)
  if (index > -1) {
    selectedVaultNFTs.value.splice(index, 1)
  } else {
    if (selectedVaultNFTs.value.length < 20) {
      selectedVaultNFTs.value.push(tokenId)
    } else {
      alert('Maximum 20 NFTs can be selected')
    }
  }
}

function clearSelection() {
  selectedNFTs.value = []
}

function clearVaultSelection() {
  selectedVaultNFTs.value = []
}

function selectBatch(nftList, selectedList, start, end) {
  const batch = nftList.slice(start, end)
  batch.forEach(tokenId => {
    if (!selectedList.includes(tokenId) && selectedList.length < 20) {
      selectedList.push(tokenId)
    }
  })
}

function getSwapCost() {
  if (!vaultInfo.value || selectedVaultNFTs.value.length === 0) return '0'
  const perNFT = parseFloat(vaultInfo.value.perNFT)
  const swapFee = parseFloat(vaultInfo.value.swapFee)
  const totalCost = (perNFT + swapFee) * selectedVaultNFTs.value.length
  return totalCost.toFixed(4)
}

function getPurchaseCost() {
  if (!vaultInfo.value || selectedVaultNFTs.value.length === 0) return '0'
  const purchaseFee = parseFloat(vaultInfo.value.purchaseFee)
  const totalCost = purchaseFee * selectedVaultNFTs.value.length
  return totalCost.toFixed(4)
}



async function checkOwnership() {
  if (!account.value) return
  try {
    const contract = getVaultContract()
    const owner = await contract.owner()
    isOwner.value = owner.toLowerCase() === account.value.toLowerCase()
  } catch (error) {
    console.error('Error checking ownership:', error)
  }
}

async function getVaultInfo() {
  try {
    const contract = getVaultContract()
    const turtleContract = getTurtleContract()
    
    const poolBalance = await turtleContract.balanceOf(contractAddress)
    const perNFT = await contract.turtlePerNFT()
    const swapFee = await contract.swapFeeTurtle()
    const purchaseFee = await contract.purchaseFeeCRO()
    
    vaultInfo.value = {
      poolBalance: ethers.utils.formatEther(poolBalance),
      perNFT: ethers.utils.formatEther(perNFT),
      nftCount: vaultNFTs.value.length,
      swapFee: ethers.utils.formatEther(swapFee),
      purchaseFee: ethers.utils.formatEther(purchaseFee)
    }
  } catch (error) {
    console.error('Error fetching vault info:', error)
  }
}

async function depositByTokenIds() {
  if (!account.value) return alert('Connect wallet first')
  if (selectedNFTs.value.length === 0) return alert('Select NFTs first')
  try {
    const contract = getVaultContract()
    const nftContract = getNFTContract()
    
    const isApproved = await nftContract.isApprovedForAll(account.value, contractAddress)
    if (!isApproved) {
      const approveTx = await nftContract.setApprovalForAll(contractAddress, true)
      await approveTx.wait()
    }
    
    const depositedTokens = [...selectedNFTs.value]
    const tx = await contract.depositByIds(selectedNFTs.value)
    await tx.wait()
    
    // Remove deposited NFTs from user's collection immediately
    depositedTokens.forEach(tokenId => {
      const index = userNFTs.value.indexOf(tokenId)
      if (index > -1) {
        userNFTs.value.splice(index, 1)
      }
    })
    
    selectedNFTs.value = []
    alert(`${depositedTokens.length} NFT(s) deposited successfully`)
    await loadVaultNFTs()
    await getVaultInfo()
  } catch (error) {
    alert('Deposit failed: ' + error.message)
  }
}

async function swapForNFTs() {
  if (!account.value) return alert('Connect wallet first')
  if (selectedVaultNFTs.value.length === 0) return alert('Select vault NFTs first')
  try {
    const contract = getVaultContract()
    const turtleContract = getTurtleContract()
    
    // Calculate total cost
    const perNFT = await contract.turtlePerNFT()
    const swapFee = await contract.swapFeeTurtle()
    const costPer = perNFT.add(swapFee)
    const totalCost = costPer.mul(selectedVaultNFTs.value.length)
    
    // Check and approve TURTLE tokens
    const allowance = await turtleContract.allowance(account.value, contractAddress)
    if (allowance < totalCost) {
      const approveTx = await turtleContract.approve(contractAddress, totalCost)
      await approveTx.wait()
    }
    
    const swappedTokens = [...selectedVaultNFTs.value]
    const tx = await contract.swapForNFTs(selectedVaultNFTs.value)
    await tx.wait()
    
    // Add swapped NFTs to user's collection immediately
    swappedTokens.forEach(tokenId => {
      if (!userNFTs.value.includes(tokenId)) {
        userNFTs.value.push(tokenId)
      }
    })
    
    selectedVaultNFTs.value = []
    alert(`${swappedTokens.length} NFT(s) swapped successfully`)
    await loadVaultNFTs()
    await getVaultInfo()
  } catch (error) {
    alert('Swap failed: ' + error.message)
  }
}

async function purchaseWithCRO() {
  if (!account.value) return alert('Connect wallet first')
  if (selectedVaultNFTs.value.length === 0) return alert('Select vault NFTs first')
  try {
    const contract = getVaultContract()
    const purchaseFee = await contract.purchaseFeeCRO()
    const totalCost = purchaseFee.mul(selectedVaultNFTs.value.length)
    
    const purchasedTokens = [...selectedVaultNFTs.value]
    const tx = await contract.purchaseNFTsWithCRO(selectedVaultNFTs.value, { value: totalCost })
    await tx.wait()
    
    // Add purchased NFTs to user's collection immediately
    purchasedTokens.forEach(tokenId => {
      if (!userNFTs.value.includes(tokenId)) {
        userNFTs.value.push(tokenId)
      }
    })
    
    selectedVaultNFTs.value = []
    alert(`${purchasedTokens.length} NFT(s) purchased successfully`)
    await loadVaultNFTs()
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
    alert('CRO withdrawn successfully!')
    withdrawAmount.value = ''
  } catch (error) {
    alert('Withdrawal failed: ' + error.message)
  }
}

onMounted(() => {
  if (window.ethereum) {
    window.ethereum.on('accountsChanged', () => {
      window.location.reload()
    })
  }
})
</script>

<style scoped>
.selected {
  border-color: #4CAF50 !important;
  background-color: #f0f8f0;
}

button {
  padding: 8px 16px;
  margin: 4px;
  border: none;
  border-radius: 4px;
  background-color: #007bff;
  color: white;
  cursor: pointer;
}

button:hover {
  background-color: #0056b3;
}

input {
  padding: 8px;
  margin: 4px;
  border: 1px solid #ccc;
  border-radius: 4px;
}
</style>