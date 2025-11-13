# Turtle NFT Contracts - Technology Stack

## Programming Languages & Versions

### Smart Contracts
- **Solidity**: ^0.8.28
- **License**: MIT
- **Compiler Settings**: Optimizer enabled (200 runs)

### Frontend
- **JavaScript**: ES6+ with Vue.js framework
- **HTML/CSS**: Standard web technologies
- **JSON**: Configuration and ABI files

## Blockchain & Networks

### Target Networks
- **Cronos Mainnet**: Chain ID 25, RPC: https://evm.cronos.org/
- **Cronos Testnet**: Chain ID 338, RPC: https://evm-t3.cronos.org/
- **Gas Price**: 10100000000000 wei (configured)

### Contract Standards
- **ERC-20**: OpenZeppelin implementation for Turtle token
- **ERC-721A**: Azuki's gas-optimized NFT standard
- **Access Control**: OpenZeppelin Ownable pattern
- **Security**: OpenZeppelin ReentrancyGuard

## Build System & Dependencies

### Core Framework
- **Hardhat**: ^2.22.18 (Ethereum development environment)
- **Hardhat Toolbox**: ^5.0.0 (integrated testing, deployment, verification)

### Smart Contract Dependencies
```json
{
  "@openzeppelin/contracts": "^5.2.0",
  "erc721a": "^4.3.0"
}
```

### Development Dependencies
```json
{
  "@nomicfoundation/hardhat-toolbox": "^5.0.0",
  "dotenv": "^16.4.7",
  "hardhat": "^2.22.18"
}
```

### Frontend Dependencies
- **Vue.js**: Frontend framework
- **Vite**: Build tool and development server
- **Vue Router**: Client-side routing
- **Web3/Ethers**: Blockchain interaction libraries

## Development Commands

### Smart Contract Development
```bash
# Install dependencies
npm install

# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test

# Deploy to testnet
npx hardhat run scripts/deploy-token.js --network cronosTestnet
npx hardhat run scripts/deploy-nft.js --network cronosTestnet
npx hardhat run scripts/deploy-earning.js --network cronosTestnet
npx hardhat run scripts/deploy-faucet.js --network cronosTestnet

# Deploy to mainnet
npx hardhat run scripts/deploy-*.js --network cronos

# Verify contracts
npx hardhat run scripts/verify-*.js --network cronos
```

### Frontend Development
```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Development server
npm run dev

# Build for production
npm run build
```

### Testing & Verification
```bash
# Run all tests
npx hardhat test

# Run specific test file
npx hardhat test test/NFT.js

# Check accounts
npx hardhat accounts

# Verify deployed contracts
npx hardhat verify --network cronos <CONTRACT_ADDRESS>
```

## Configuration Files

### Environment Setup
- **.env**: Private keys, mnemonics, API keys
- **.env.example**: Template for environment variables
- **hardhat.config.js**: Network configurations, compiler settings

### Build Configuration
- **package.json**: Dependencies and scripts
- **vite.config.js**: Frontend build configuration
- **wrangler.jsonc**: Cloudflare deployment configuration

## Security & Best Practices

### Smart Contract Security
- ReentrancyGuard on state-changing functions
- Access control with Ownable pattern
- Input validation and error handling
- Event emission for transparency

### Development Security
- Environment variable management
- Private key protection
- Network-specific configurations
- Contract verification on explorers