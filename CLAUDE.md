# Handshake

## What Is This?

Handshake solves coordination problems for group purchases and crowdfunding by using blockchain-based escrow with multi-signature control and deliverable-gated fund releases.

**Two Core Functions:**
1. **Group Buys** - Pool money to unlock bulk pricing (e.g., 100 farmers buying nutrients together saves 40%)
2. **Crowdfunding** - Kickstarter-style campaigns where funds unlock only when deliverables are verified

## The Problem

- Kickstarter has no accountability - creators can take money and disappear
- Group buys require trusting "some guy" with everyone's Venmo
- No recourse when things go wrong

## The Solution

Multi-signature wallets (Safe) where funds are locked until:
- Deliverables are verified (via oracles or manual confirmation)
- Required signers approve release
- Funders can "Rage Quit" and reclaim funds if project fails

## Current Status: MVP Complete

The MVP implements the Executive Board model (2-of-3 multi-sig) with:
- Automated Safe wallet deployment from the app
- In-app transaction signing (no redirect to Safe.global needed)
- Milestone-gated fund releases with signature tracking
- USDC payments on Base Sepolia testnet

## Tech Stack

### On-Chain
- **Safe Wallet** - Multi-sig escrow (deployed via Safe SDK)
- **USDC** - Stablecoin for funding (MockUSDC on testnet)
- **Base Sepolia** - L2 testnet for low fees

### Off-Chain
- **Next.js 14** - React frontend with App Router
- **thirdweb** - Wallet connection and transaction execution
- **Safe SDK** - Protocol Kit + API Kit for Safe operations
- **Prisma + SQLite** - Campaign/milestone database
- **Tailwind CSS** - Styling

## Project Structure

```
/src
  /app
    /api
      /campaigns/[id]     - Campaign CRUD, Safe deployment
      /milestones/[id]    - Submit, propose, sign, execute
    /campaigns
      /[id]/page.tsx      - Campaign detail view
      /new/page.tsx       - Create campaign form
    page.tsx              - Campaign list
  /components
    ConnectWallet.tsx     - thirdweb wallet connection
    DeploySafeButton.tsx  - Deploy Safe from app
    MilestoneList.tsx     - Milestone management UI
    SignTransactionButton.tsx - In-app signing
    FundButton.tsx        - Send USDC to Safe
  /lib
    safe.ts               - Server-side Safe SDK utilities
    safe-client.ts        - Client-side Safe utilities
    constants.ts          - Chain config, USDC address
    thirdweb.ts           - thirdweb client setup
    db.ts                 - Prisma client
/prisma
  schema.prisma           - Database schema
```

## Development Commands

```bash
# Install dependencies
npm install

# Set up environment (copy and fill in values)
cp .env.example .env

# Initialize database
npx prisma db push

# Start development server
npm run dev

# Build for production
npm run build
```

## Environment Variables

```bash
DATABASE_URL="file:./dev.db"
NEXT_PUBLIC_CHAIN_ID="84532"
NEXT_PUBLIC_RPC_URL="https://sepolia.base.org"
NEXT_PUBLIC_USDC_ADDRESS="0x..."  # MockUSDC contract
NEXT_PUBLIC_SAFE_TX_SERVICE_URL="https://safe-transaction-base-sepolia.safe.global"
NEXT_PUBLIC_THIRDWEB_CLIENT_ID="your-client-id"
```

## User Flow

1. **Create Campaign** - Set name, description, funding goal, milestones, signers
2. **Deploy Safe** - Any signer deploys the 2-of-3 multi-sig wallet
3. **Fund Campaign** - Users send USDC to the Safe address
4. **Complete Milestone** - Creator submits proof of completion
5. **Approve Payout** - Trustee proposes transaction (auto-signs)
6. **Sign** - Second trustee signs via in-app button
7. **Execute** - Any signer executes when 2/2 signatures collected
8. **Repeat** - Continue for remaining milestones

## Key Decisions

1. **Base Sepolia** - Low gas costs, Safe TX Service support
2. **USDC** - Stablecoin eliminates price volatility
3. **Safe over Custom Escrow** - Battle-tested security
4. **Client-side deployment** - No server private key needed
5. **In-app signing** - Better UX than redirecting to Safe.global
6. **2-of-3 threshold** - Balances security with practicality

## Future Enhancements

- [ ] Chainlink oracle automation for deliverable verification
- [ ] Rage Quit functionality for funders
- [ ] Gas sponsorship via Relay Kit
- [ ] Multiple funding tokens
- [ ] Campaign discovery/search
- [ ] Email notifications

## Resources

- [Safe Documentation](https://docs.safe.global/)
- [Safe{Core} SDK](https://github.com/safe-global/safe-core-sdk)
- [thirdweb React SDK](https://portal.thirdweb.com/react/v5)
- [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-ethereum-goerli-faucet)
