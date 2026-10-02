# Potline contracts

Solidity contracts for Potline, an onchain group savings circle (arisan, paluwagan, tanda) that
settles in USDG on Arbitrum Sepolia.

## What is here

- `src/PotlineFactory.sol`: deploys and indexes `SavingsCircle` instances for one ERC20 token.
- `src/SavingsCircle.sol`: a single savings circle. Every round each member pays the fixed
  contribution. A member who wants the pot early bids part of it back. The top bidder takes the pot
  minus the bid, and the bid is shared equally with the other members as claimable credit. A round
  with no bid goes to the next member in join order who has not received the pot yet. Payouts and
  credits are pull payments: they are recorded on settle, then withdrawn by the member.
- `script/Deploy.s.sol`: deploy script for the factory. Not run yet.
- `test/`: Foundry tests. They run on the in-memory EVM, no network needed.

## Requirements

- Foundry (forge, cast, anvil). Built and tested with forge 1.2.3 and solc 0.8.30.
- Dependencies are vendored under `lib/`: forge-std 1.17.0 and OpenZeppelin contracts 5.1.0.

## Setup

Copy the example env file, then fill in your own values. Never commit `contracts/.env`.

```shell
cd contracts
cp .env.example .env
```

## Build and test

```shell
cd contracts
forge build
forge test -vv
```

## Deploy (Task 2, completed)

```shell
cd contracts
set -a; source .env; set +a
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url "$ARB_SEPOLIA_RPC_URL" \
  --private-key "$PRIVATE_KEY" \
  --broadcast
```

Then create a sample circle and verify on Arbiscan. See the deployed addresses below.

## Deployed addresses

Deployed to Arbitrum Sepolia. Factory deployed by `0x65be7B4E45E3E7fd415865540407fb021937f5A3`.

| Contract | Network | Address |
| --- | --- | --- |
| USDG (token, provided) | Arbitrum Sepolia | `0xFFC95faa3d63Cde504a05B567C600B78C0b41892` |
| PotlineFactory | Arbitrum Sepolia | `0xBE7c2Ec0Fa8B4D0B6523bC3e8D3325409Fc78d23` ([Arbiscan](https://sepolia.arbiscan.io/address/0xBE7c2Ec0Fa8B4D0B6523bC3e8D3325409Fc78d23)) |
| Example SavingsCircle | Arbitrum Sepolia | `0x42fD10a725b9D728faAC232EA407256747B897b1` ([Arbiscan](https://sepolia.arbiscan.io/address/0x42fD10a725b9D728faAC232EA407256747B897b1)) |

## Token

The circles are token agnostic. The token address is a constructor argument on the factory. The
intended token is USDG on Arbitrum Sepolia at `0xFFC95faa3d63Cde504a05B567C600B78C0b41892`, which
uses 6 decimals.