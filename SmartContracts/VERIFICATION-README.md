# Contract verification (portfolio demo)

This repository is a **stripped portfolio demo**. Production deployment addresses, LayerZero wiring, and verification commands have been removed.

To verify contracts on a public explorer:

1. Deploy `PaymentReceiver`, `PresaleManager`, and `TokenClaim` using your own keys and RPC URLs (never commit them).
2. Set `ETHERSCAN_API_KEY` in `.env` as described by [Etherscan](https://etherscan.io/myapikey).
3. Run Hardhat verify against **your** deployed addresses only.

Do **not** treat any previously documented addresses in forks or history as authoritative.
