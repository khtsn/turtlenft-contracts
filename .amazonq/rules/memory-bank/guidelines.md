# Turtle NFT Contracts - Development Guidelines

## Code Quality Standards

### Smart Contract Formatting
- **Solidity Version**: Use `^0.8.28` consistently across all contracts
- **License**: MIT license header on all contract files
- **Import Organization**: Group imports by source (OpenZeppelin, external libraries, local contracts)
- **Contract Structure**: Constructor, events, modifiers, functions (public, external, internal, private)
- **Function Visibility**: Explicit visibility modifiers on all functions
- **Error Messages**: Descriptive revert messages for user-facing errors

### JavaScript/Node.js Formatting
- **ES6+ Syntax**: Use modern JavaScript features (const/let, arrow functions, destructuring)
- **Async/Await**: Prefer async/await over Promise chains
- **Template Literals**: Use backticks for string interpolation
- **Destructuring**: Extract multiple values from objects/arrays in single statements
- **Consistent Naming**: camelCase for variables and functions, PascalCase for contracts/classes

### Test Structure Conventions
- **Describe Blocks**: Organize tests by contract name and functionality groups
- **BeforeEach Setup**: Initialize contracts and test data in beforeEach hooks
- **Test Naming**: Descriptive test names starting with "Should" for positive cases
- **Fixture Pattern**: Use loadFixture for consistent test state setup
- **Error Testing**: Use expect().to.be.revertedWith() for error validation

## Architectural Patterns

### Smart Contract Patterns
- **Access Control**: Implement Ownable pattern for administrative functions
- **Security Guards**: Use ReentrancyGuard on state-changing external functions
- **Event Emission**: Emit events for all significant state changes
- **Input Validation**: Validate all function parameters with require statements
- **Gas Optimization**: Use ERC721A for batch minting efficiency
- **Modular Design**: Separate concerns into distinct contracts (Token, NFT, Earning, etc.)

### Frontend Integration Patterns
- **Service Layer**: Centralize contract interactions in dedicated service files
- **Environment Configuration**: Use environment variables for contract addresses and RPC URLs
- **Provider Management**: Support both MetaMask and fallback RPC providers
- **Component Separation**: Separate views for each contract interface
- **ABI Management**: Store contract ABIs in dedicated files for reusability

### Testing Patterns
- **Comprehensive Coverage**: Test happy paths, edge cases, and error conditions
- **Time Manipulation**: Use hardhat time helpers for testing time-dependent logic
- **State Verification**: Verify both successful operations and proper state changes
- **Gas Testing**: Include gas usage considerations in complex operations
- **Multi-User Testing**: Test interactions between different user accounts

## Development Standards

### Error Handling
- **Descriptive Messages**: Use clear, user-friendly error messages
- **Custom Errors**: Implement custom error types for specific failure cases
- **Validation First**: Validate inputs before performing operations
- **Graceful Degradation**: Handle missing dependencies (MetaMask, network issues)

### Security Practices
- **Reentrancy Protection**: Apply nonReentrant modifier to vulnerable functions
- **Access Control**: Restrict administrative functions to contract owner
- **Input Sanitization**: Validate all external inputs and user-provided data
- **Safe Math**: Use Solidity 0.8+ built-in overflow protection
- **External Call Safety**: Handle external contract calls with proper error checking

### Gas Optimization
- **Batch Operations**: Implement batch minting and processing where possible
- **Storage Efficiency**: Use packed structs and appropriate data types
- **Loop Optimization**: Minimize gas costs in loops with early exits
- **Event Usage**: Use events for off-chain data rather than storage when possible

### Configuration Management
- **Environment Variables**: Use .env files for sensitive configuration
- **Network Separation**: Separate configurations for testnet and mainnet
- **Deployment Scripts**: Automated deployment with verification
- **Contract Verification**: Include verification scripts for transparency

## Common Implementation Patterns

### Contract Initialization
```solidity
constructor(address _owner, address _tokenAddress) Ownable(_owner) {
    // Initialize contract state
}
```

### Function Modifiers Pattern
```solidity
function criticalFunction() external nonReentrant onlyOwner {
    // Implementation with security guards
}
```

### Event Emission Pattern
```solidity
event ImportantAction(address indexed user, uint256 indexed value);
// Emit events after successful operations
emit ImportantAction(msg.sender, amount);
```

### Test Setup Pattern
```javascript
beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    // Deploy contracts and setup test state
});
```

### Frontend Service Pattern
```javascript
export function getContract() {
    const address = import.meta.env.VITE_CONTRACT_ADDRESS;
    return new ethers.Contract(address, ABI, getSigner());
}
```

### Time-Based Testing Pattern
```javascript
await time.increase(ONE_DAY);
// Test time-dependent functionality
```

## Best Practices

### Documentation
- Include comprehensive comments for complex logic
- Document all public functions with parameter descriptions
- Maintain README files with setup and usage instructions
- Use JSDoc comments for JavaScript functions

### Version Control
- Commit compiled artifacts for deployment verification
- Use semantic versioning for contract upgrades
- Tag releases for production deployments
- Maintain separate branches for different networks

### Deployment Process
- Test thoroughly on testnet before mainnet deployment
- Verify contracts on block explorers after deployment
- Document deployed contract addresses
- Implement upgrade mechanisms where appropriate