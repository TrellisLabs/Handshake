# Handshake

Simple M of N Group Funding UI System Built with SAFE

## Config

expects an `.env` file with:

```bash
DATABASE_URL="file:./dev.db"
NEXT_PUBLIC_CHAIN_ID="84532"
NEXT_PUBLIC_RPC_URL="https://sepolia.base.org"
NEXT_PUBLIC_USDC_ADDRESS="0x..."
NEXT_PUBLIC_SAFE_TX_SERVICE_URL="https://safe-transaction-base-sepolia.safe.global"
NEXT_PUBLIC_THIRDWEB_CLIENT_ID="your-thirdweb-client-id"
```

I got a thirdweb client ID at [thirdweb.com/dashboard](https://thirdweb.com/dashboard).

## Process

1. **Create Campaign** - Define milestones, funding goal, and 3 signers
2. **Deploy Safe** - Multi-sig wallet created on Base Sepolia
3. **Fund** - Contributors send USDC to the Safe
4. **Complete Work** - Creator submits proof for each milestone
5. **Approve** - 2 of 3 signers approve fund release
6. **Execute** - Funds transfer to creator

## Repo

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
