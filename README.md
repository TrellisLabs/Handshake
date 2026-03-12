# Handshake

**Blockchain-powered escrow for group purchases and crowdfunding**

Handshake uses Safe multi-signature wallets to solve trust problems in group coordination. Funds are locked until deliverables are verified and approved by designated signers.

## Features

- **Multi-sig Escrow** - 2-of-3 Safe wallets protect funds
- **Milestone Releases** - Funds unlock incrementally as work completes
- **In-app Signing** - Sign transactions without leaving the app
- **USDC Payments** - Stablecoin eliminates price volatility

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your values

# Initialize database
npx prisma db push

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Environment Variables

Create a `.env` file with:

```bash
DATABASE_URL="file:./dev.db"
NEXT_PUBLIC_CHAIN_ID="84532"
NEXT_PUBLIC_RPC_URL="https://sepolia.base.org"
NEXT_PUBLIC_USDC_ADDRESS="0x..."
NEXT_PUBLIC_SAFE_TX_SERVICE_URL="https://safe-transaction-base-sepolia.safe.global"
NEXT_PUBLIC_THIRDWEB_CLIENT_ID="your-thirdweb-client-id"
```

Get a thirdweb client ID at [thirdweb.com/dashboard](https://thirdweb.com/dashboard).

## How It Works

1. **Create Campaign** - Define milestones, funding goal, and 3 signers
2. **Deploy Safe** - Multi-sig wallet created on Base Sepolia
3. **Fund** - Contributors send USDC to the Safe
4. **Complete Work** - Creator submits proof for each milestone
5. **Approve** - 2 of 3 signers approve fund release
6. **Execute** - Funds transfer to creator

## Tech Stack

- **Next.js 14** - React framework
- **Safe SDK** - Multi-sig wallet operations
- **thirdweb** - Wallet connection
- **Prisma** - Database ORM
- **Tailwind CSS** - Styling
- **Base Sepolia** - L2 testnet

## Project Structure

```
src/
├── app/
│   ├── api/           # API routes
│   ├── campaigns/     # Campaign pages
│   └── page.tsx       # Home page
├── components/        # React components
└── lib/               # Utilities
prisma/
└── schema.prisma      # Database schema
```

## License

MIT
