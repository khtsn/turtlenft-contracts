# Turtle NFT Contracts - Project Structure

## Directory Organization

### Root Level
```
turtlenft-contracts/
├── contracts/          # Solidity smart contracts
├── test/              # Test suite files
├── scripts/           # Deployment and verification scripts
├── frontend/          # Vue.js web application
├── artifacts/         # Compiled contract artifacts
├── cache/            # Hardhat compilation cache
├── hardhat.config.js # Hardhat configuration
└── package.json      # Node.js dependencies
```

### Smart Contracts (`/contracts/`)
- **Token.sol**: ERC-20 Turtle token implementation
- **TurtlesNFT.sol**: ERC-721 NFT collection with minting controls
- **Earning.sol**: Staking contract for NFT-to-token rewards
- **Faucet.sol**: Token distribution system with cooldowns
- **TurtleRedemptionVault.sol**: NFT/token exchange mechanism

### Test Suite (`/test/`)
- **Token.js**: ERC-20 token functionality tests
- **NFT.js**: NFT minting, burning, and access control tests
- **Earning.js**: Staking, unstaking, and reward calculation tests
- **Faucet.js**: Faucet claiming and cooldown mechanism tests

### Deployment Scripts (`/scripts/`)
- **deploy-token.js**: Token contract deployment
- **deploy-nft.js**: NFT contract deployment
- **deploy-earning.js**: Earning contract deployment
- **deploy-faucet.js**: Faucet contract deployment
- **verify-*.js**: Contract verification scripts

### Frontend Application (`/frontend/`)
```
frontend/
├── src/
│   ├── views/          # Vue.js page components
│   ├── services/       # Contract interaction services
│   ├── abis/          # Contract ABI files
│   ├── router/        # Vue Router configuration
│   ├── App.vue        # Main application component
│   └── main.js        # Application entry point
├── package.json       # Frontend dependencies
└── vite.config.js     # Vite build configuration
```

## Core Components & Relationships

### Contract Architecture
```
Token (ERC-20) ←→ Earning Contract ←→ TurtlesNFT (ERC-721)
     ↑                                        ↑
     └── Faucet Contract              TurtleRedemptionVault
```

### Component Interactions
1. **Token ↔ Earning**: Users stake tokens to earn rewards from NFT staking
2. **NFT ↔ Earning**: NFTs are staked to generate token rewards
3. **Token ↔ Faucet**: Faucet distributes tokens to users with cooldown
4. **NFT ↔ Vault**: Vault enables NFT/token exchanges and CRO purchases
5. **Token ↔ Vault**: Vault manages token pools for NFT redemption

### Frontend Architecture
- **Views**: Separate pages for each contract interaction (Token, NFT, Earning, Faucet, Vault)
- **Services**: Centralized contract interaction logic via contractService.js
- **ABIs**: Contract interfaces for frontend-blockchain communication
- **Router**: Navigation between different contract interfaces

## Architectural Patterns

### Smart Contract Patterns
- **Access Control**: Ownable pattern for administrative functions
- **Security**: ReentrancyGuard for state-changing operations
- **Token Standards**: ERC-20 and ERC-721A implementations
- **Event Logging**: Comprehensive event emission for off-chain tracking

### Frontend Patterns
- **Component-Based**: Vue.js single-file components
- **Service Layer**: Abstracted contract interactions
- **Reactive State**: Vue.js reactivity for real-time updates
- **Modular Routing**: Separate routes for each contract interface

### Development Patterns
- **Test-Driven**: Comprehensive test coverage for all contracts
- **Deployment Automation**: Scripted deployment and verification
- **Environment Configuration**: Separate configs for testnet/mainnet
- **Build Optimization**: Hardhat compilation with optimizer enabled