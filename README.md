# Solana Token Analyzer

A comprehensive Solana token analysis tool built with Next.js 15, TypeScript, and the Helius RPC API. This application provides detailed analysis of Solana token contracts to help users identify potential risks and make informed decisions about memecoins and other tokens.

## 🚀 Features

### Token Analysis
- **Metadata Analysis**: Token name, symbol, description, image, and metadata source validation
- **Authority Risk Assessment**: Mint authority, freeze authority, and update authority status
- **Holder Distribution**: Top 10 holders analysis with concentration risk assessment
- **Creator Audit**: Transaction history analysis of token creators
- **Trust Score**: 0-100 scoring system based on multiple risk factors

### Real-time Data
- **Helius RPC API Integration**: Real-time data from Solana mainnet
- **Token Metadata**: On-chain and off-chain metadata retrieval
- **Holder Information**: Current token distribution and concentration
- **Transaction History**: Creator wallet activity analysis

### User Interface
- **Dark Theme**: Modern dark UI with orange accent colors
- **Responsive Design**: Works on desktop and mobile devices
- **Interactive Components**: Tooltips, progress bars, and detailed breakdowns
- **Real-time Validation**: Input validation with helpful error messages

## 🛠️ Technology Stack

- **Frontend**: Next.js 15 with App Router
- **Language**: TypeScript with strict type checking
- **Styling**: Tailwind CSS + shadcn/ui components
- **Icons**: Lucide React
- **Validation**: Zod schemas for API responses
- **API**: Helius RPC and REST APIs

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Helius API key (included in the project)

## 🚀 Installation

### Option 1: Install from Chrome Web Store (Coming Soon)
1. Visit the [Chrome Web Store page](#)
2. Click "Add to Chrome"
3. Confirm installation

### Option 2: Manual Installation (Developer Mode)
1. **Download the extension and web dashboard**:
   ```bash
   git clone <repository-url>
   cd nilo
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000`

## 🔍 How to Use

1. **Enter a Solana Token Address**
   - Paste a valid Solana mint address (32-44 base58 characters)
   - Examples: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` (USDC)

2. **Click "Analyze Token"**
   - The system will fetch data from multiple Helius API endpoints
   - Analysis typically takes 2-5 seconds

3. **Review the Results**
   - **Trust Score**: Overall risk assessment (0-100)
   - **Token Information**: Metadata, supply, and authority status
   - **Holder Distribution**: Top holders and concentration analysis
   - **Detailed Analysis**: Rule-by-rule breakdown with explanations

## 📊 Analysis Rules

### 1. Token Metadata Quality (20 points)
- ✅ Name and symbol present (5 pts)
- ✅ Description provided (3 pts)
- ✅ Logo/image available (2 pts)
- ✅ Metadata URI present (5 pts)
- ✅ Creators specified (5 pts)

### 2. Authority Risk Analysis (30 points)
- ✅ Mint authority burned (15 pts)
- ✅ Freeze authority disabled (10 pts)
- ✅ Metadata immutable (5 pts)

### 3. Token Distribution Analysis (30 points)
- ✅ Number of holders (10 pts)
- ✅ Top holder concentration (10 pts)
- ✅ Top 3 holders concentration (10 pts)

### 4. Creator Wallet Audit (20 points)
- ✅ Low recent activity (10 pts)
- ✅ No suspicious token creation (10 pts)

## 🎯 Risk Assessment

### Trust Score Ranges
- **75-100**: Low Risk ✅
- **50-74**: Medium Risk ⚠️
- **0-49**: High Risk 🚨

### Common Risk Factors
- 🚨 Mint authority not burned
- 🚨 Freeze authority active
- 🚨 High holder concentration (>50% in top holder)
- 🚨 Creator with suspicious activity
- ⚠️ Missing metadata or description
- ⚠️ Centralized metadata storage

## 🔧 API Integration

### Helius RPC Methods Used
- `getAccountInfo`: Mint and freeze authority status
- `getTokenLargestAccounts`: Top token holders
- `getSignaturesForAddress`: Creator transaction history

### Helius REST Endpoints
- `/tokens/metadata`: Token metadata and creators
- `/token-holders`: Detailed holder information (with fallback)

## 🏗️ Project Structure

```
src/
├── app/                    # Next.js app router
├── components/
│   ├── ui/                # shadcn/ui components
│   └── token/             # Token analysis components
│       ├── TokenAnalyzer.tsx      # Main analyzer component
│       ├── TokenInfoCard.tsx      # Token metadata display
│       ├── HolderList.tsx         # Holder distribution
│       └── AuditResultRow.tsx     # Analysis results
├── lib/
│   └── api/helius/        # Helius API integration
│       ├── types.ts       # TypeScript types and Zod schemas
│       └── client.ts      # API client with error handling
├── cursorRule/            # Analysis rule engine
│   └── tokenAnalysisRules.ts     # Modular analysis rules
└── types/                 # Global TypeScript types
```

## 🧪 Testing

The application includes comprehensive error handling and validation:

- **Input Validation**: Solana address format checking
- **API Error Handling**: Graceful fallbacks for failed requests
- **Type Safety**: Zod schemas for all API responses
- **Rate Limiting**: Handles Helius API rate limits

## 🔒 Security Features

- **Input Sanitization**: All inputs validated before API calls
- **Error Boundaries**: Graceful error handling throughout the app
- **Type Safety**: Strict TypeScript configuration
- **API Key Management**: Secure API key handling

## 🚀 Deployment

### Vercel (Recommended)
```bash
npm run build
# Deploy to Vercel
```

### Docker
```bash
# Build the application
npm run build

# Create Docker image
docker build -t solana-token-analyzer .

# Run container
docker run -p 3000:3000 solana-token-analyzer
```

## 📝 Example Token Addresses for Testing

- **USDC**: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`
- **USDT**: `Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB`
- **SOL**: `So11111111111111111111111111111111111111112`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- **Helius**: For providing the Solana RPC API
- **shadcn/ui**: For the beautiful UI components
- **Solana**: For the blockchain infrastructure
- **Next.js**: For the React framework

## 📞 Support

For questions or issues:
1. Check the GitHub Issues
2. Review the Helius API documentation
3. Ensure your Solana addresses are valid mint addresses

---

**⚠️ Disclaimer**: This tool is for informational purposes only. Always do your own research before making investment decisions. The developers are not responsible for any financial losses.

**Made with ❤️ for the Solana community**
