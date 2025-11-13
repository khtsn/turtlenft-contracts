# Turtle NFT Smart Contracts - Product Overview

## Project Purpose
A comprehensive NFT ecosystem built on Cronos blockchain featuring turtle-themed NFTs with integrated staking, earning mechanisms, and redemption systems. The project combines collectible NFTs with DeFi functionality to create an engaging user experience.

## Core Value Proposition
- **NFT Collection**: Limited supply of 10,625 turtle NFTs with batch minting capabilities
- **Earning System**: Stake NFTs to earn Turtle tokens with daily rewards
- **Token Economy**: ERC-20 Turtle token with faucet distribution system
- **Redemption Vault**: Exchange NFTs for tokens or purchase with CRO
- **Complete Frontend**: Vue.js interface for all contract interactions

## Key Features & Capabilities

### NFT Contract (ERC-721)
- Max supply: 10,625 NFTs
- Pause/unpause minting and burning
- Admin minting (no fees) and public batch minting (max 20)
- Dual payment system: native CRO and ERC-20 tokens
- Configurable fees and base URI for reveals

### Earning Contract
- **Staking Mechanism**: Requires 35,000 Turtle tokens per NFT staked
- **Daily Rewards**: 10 Turtle tokens per day per staked NFT
- **Withdrawal Fees**: Tiered system (10 CRO < 24h, 5 CRO < 72h, free after 72h)
- **Flexible Operations**: Claim rewards without unstaking, add more NFTs to existing stakes

### Token & Faucet System
- **ERC-20 Token**: Standard Turtle token implementation
- **Faucet Distribution**: 35,000 tokens per claim with 5-minute cooldown
- **Owner Controls**: Adjustable reward amounts and token withdrawal

### Redemption Vault
- **NFT-to-Token Exchange**: Deposit NFTs to receive Turtle tokens based on pool ratio
- **Token-to-NFT Swap**: Exchange Turtle tokens for NFTs (with fees)
- **CRO Purchases**: Direct NFT purchases using native CRO
- **Fee Management**: Configurable swap and purchase fees

## Target Users
- **NFT Collectors**: Users interested in turtle-themed collectibles
- **DeFi Participants**: Users seeking staking rewards and token earning opportunities
- **Cronos Ecosystem Users**: Participants in the Cronos blockchain ecosystem
- **Gaming/Utility Seekers**: Users looking for NFTs with utility beyond collectibility

## Use Cases
- Collect and trade turtle NFTs
- Stake NFTs to earn passive income in Turtle tokens
- Participate in token economy through faucet claims
- Exchange between NFTs and tokens via redemption vault
- Build applications on top of the contract ecosystem