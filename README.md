# Turtle NFT smart contracts

## List
* NFT
    * ERC20 smart contract
    * ERC721 smart contract
* Earning contract
* Faucet contract
* Turtle Redemption Vault contract
* Coverage test cases for happy paths

## ERC-721 Features
* Max NFT limit: 10625
* Able to pause/unpause minting and burn NFT
* Admin minting for any address and no fees
* Public batch minting (max mint 20) in native token and ERC-20 token
* Allow to set native token fees and ERC 20 token fees
* Able to set base URI for revealing event

## Earning contract
### Earning Contract Features
* Staking Mechanism:
    * Users can stake their NFTs to earn Turtle tokens
    * Each NFT requires 35,000 Turtle tokens to be staked
    * Users earn 10 Turtle tokens per day per staked NFT
    * Earnings are calculated on a daily basis (not per second)
    * Users can add more NFTs to their existing stake

* Unstaking Mechanism:
    * Unstaking forces removal of all staked NFTs

* Withdrawal fees:
    * 10 CRO fee for withdrawals within the first 24 hours
    * 5 CRO fee for withdrawals within the first 72 hours
    * No fee after 72 hours

* Claiming Rewards:
    * Users can claim earned rewards without unstaking
    * No rewards are earned for periods less than 24 hours

* Admin Functions:
    * Ability to adjust required Turtle tokens per NFT (minimum 10,000)
    * Ability to adjust daily earning rate (0-10 range)

## Why are `stakes` and `stakedTurtleTokens` separate mappings?

Separating `stakes` and `stakedTurtleTokens` is a deliberate design choice driven by clarity, gas efficiency, and the logical separation of concerns within the smart contract.

Here’s a breakdown of the reasoning:

### 1. Clarity and Readability

- **`stakes` (mapping to `StakeInfo` struct):** This mapping is concerned with the **state and timing** of a user's stake. It answers questions like:
    - How many NFTs has the user committed? (`nftCount`)
    - When did they start staking? (`stakedAt`)
    - When did they last claim rewards? (`lastClaimAt`)

- **`stakedTurtleTokens` (mapping to `uint256`):** This mapping is concerned with the **financial collateral**. It's a simple ledger that answers one question:
    - How many Turtle tokens has this user locked in the contract?

By keeping them separate, the purpose of each variable is crystal clear, making the contract easier to read, understand, and maintain.

### 2. Gas Efficiency

This is a critical reason in smart contract development. Accessing and writing to storage costs gas.

- **Selective Updates:** Not every function needs to modify both mappings.
    - When a user calls `claim()`, the contract only needs to read from both mappings to calculate earnings, but it only needs to **write an update to `stakes.lastClaimAt`**. It doesn't touch the `stakedTurtleTokens` amount.
    - If these were combined into a single, larger struct, the contract would have to load the entire struct into memory, change one field, and then write the entire struct back to storage. Separating them allows for more granular, and therefore cheaper, storage updates.

- **Unstaking:** When a user calls `unstake()`, the contract clears data from both mappings. While the cost is similar in this specific case, the efficiency gained in other functions like `claim()` makes the separation worthwhile.

### 3. Logical Separation of Concerns

This is a core principle in software engineering. The "stake" itself (an agreement over time with a number of NFTs) is a different concept from the "staked funds" (the liquid tokens held as collateral).

- The logic for calculating rewards is based on the `StakeInfo`.
- The logic for handling the financial aspect (transferring tokens in and out) is based on `stakedTurtleTokens`.

Treating them as distinct entities in the code reflects their distinct roles in the contract's functionality.

### Summary

| Aspect      | `stakes` (StakeInfo)                      | `stakedTurtleTokens`                | Why Separate?                                                              |
| :---------- | :---------------------------------------- | :---------------------------------- | :------------------------------------------------------------------------- |
| **Purpose**   | Manages the terms and timing of the stake. | Manages the user's locked token balance. | **Clarity**: Each mapping has a single, clear responsibility.                |
| **Data**      | `nftCount`, `stakedAt`, `lastClaimAt`     | `uint256` (amount)                  | **Gas Efficiency**: Allows for cheaper, targeted updates (e.g., in `claim`). |
| **Concept**   | The staking "agreement" or "position".    | The financial "collateral".         | **Separation of Concerns**: Keeps time-based logic separate from fund management. |

While you could combine them into a single struct, the current design is generally considered a better practice for smart contracts due to the significant benefits in gas optimization and code maintainability.

## Faucet Contract Features
* 5-minute cooldown between claims
* Default reward: 35,000 tokens per claim
* Owner can adjust reward amount
* Owner can withdraw tokens from faucet
* Tracks last claim time per wallet

## Turtle Redemption Vault Features
* **NFT Deposit System**: Deposit specific NFTs by token IDs to receive TURTLE tokens based on pool ratio
* **1:1 NFT Swap**: Exchange your NFTs for vault NFTs on a 1:1 basis with TURTLE fee
  - Select equal numbers of NFTs from your wallet and vault
  - Pay configurable TURTLE fee per NFT (default: 100 TURTLE)
  - All swap fees remain locked in vault, increasing future deposit rewards
* **CRO Purchase**: Buy specific NFTs directly with CRO native token
* **Transaction Limits**: Maximum 20 NFTs per transaction for all operations
* **Efficient Storage**: O(1) NFT lookup with internal tracking system
* **Security**: OpenZeppelin Ownable and ReentrancyGuard protection
* **Fee Management**: Owner can adjust swap fees (TURTLE) and purchase fees (CRO)
* **CRO Withdrawal**: Owner can withdraw all collected CRO fees in one transaction
* **Automatic Refunds**: Excess CRO payments are automatically refunded

## Frontend Interface
The project includes a Vue.js frontend with views for:
* **Token**: ERC20 token interactions and balance checking
* **NFT**: Minting (admin and public), contract information display
* **Earning**: Staking, unstaking, claiming rewards, stake management
* **Faucet**: Token claiming with cooldown, owner fee management
* **Vault**: Specific NFT deposits by token IDs, 1:1 NFT swaps (user NFTs ↔ vault NFTs), CRO purchases of specific NFTs, vault statistics and available NFT listings
