<h1 align="center">🚀 MetaNews Presale</h1>

<p align="center">
  <b>Multi-Stage Token Presale System with Smart Contracts & Backend Integration</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Status-Portfolio%20Ready-success?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Blockchain-Ethereum-blue?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Backend-Node.js-green?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Smart%20Contracts-Solidity-orange?style=for-the-badge" />
  <img src="https://img.shields.io/badge/License-MIT-lightgrey?style=for-the-badge" />
</p>

---

## 📌 Overview

MetaNews Presale is a **signature-based, multi-stage token sale system** built using **smart contracts and backend services**.

It enables users to:
- Buy tokens securely  
- Participate in staged pricing  
- Claim tokens after TGE  
- Interact with a blockchain-integrated backend  

> ⚠️ This is a **portfolio-safe version** with sensitive logic removed or mocked.

---

## ✨ Core Features

### 🔐 Secure Presale System
- Buy tokens using **native coin (ETH/BNB)** or **ERC20 tokens**
- Signature-based validation ensures secure transactions  
- Allocation-based system (no instant token transfer)

---

### 📊 Stage-Based Pricing
- Multi-stage presale model  
- Each stage includes:
  - Token price  
  - Supply limit  
  - Active status  

---

### 🧠 Signature-Based Security
- Backend generates signed payloads  
- Smart contracts verify authenticity  
- Prevents unauthorized access  

---

### 🎯 Claim System (Post-TGE)
- Tokens are claimed after TGE  
- Backend verifies claim request  
- Smart contract executes secure distribution  

---

### ⚙️ Admin Controls
- Start / pause / end sale  
- Configure signer  
- Manage core presale parameters  

---

### 📡 Event Tracking
- Backend listens to blockchain events  
- Stores purchase and claim data  
- Enables analytics and tracking  

---

### 🧪 Smart Contract Testing
- Covers:
  - Buy flow  
  - Claim flow  
  - Edge cases (caps, race conditions)

---

## 🛠️ Tech Stack

| Layer            | Technology |
|-----------------|-----------|
| Smart Contracts | Solidity, Hardhat, OpenZeppelin |
| Backend         | Node.js, Express.js |
| Database        | MongoDB |
| Blockchain Lib  | Ethers.js |
| Oracle Concept  | Chainlink |

---

## 🔄 Demo Flow

```text
User → Connect Wallet  
     → Request Signature  
     → Buy Tokens (Contract)  
     → Event Captured (Backend)  
     → Allocation Stored  
     → TGE Triggered  
     → Claim Request  
     → Tokens Claimed