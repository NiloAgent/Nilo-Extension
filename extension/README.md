# Solana Token Analyzer - Bitquery Edition

A comprehensive Chrome extension for analyzing Solana memecoin tokens using advanced Bitquery GraphQL API data. This extension provides deep insights into token safety, holder distribution, DEX trading activity, and creator wallet analysis.

## 🚀 Features

### Core Analysis
- **Token Metadata Analysis**: Validates token name, symbol, and metadata URI
- **Holder Distribution**: Analyzes top holders and concentration risk
- **DEX Trading Activity**: Tracks trades across Raydium, PumpFun, and other DEXes
- **Transfer Activity**: Monitors token transfer patterns and recent activity
- **Creator Wallet Audit**: Analyzes token creator's wallet history and behavior

### Advanced Risk Assessment
- **Comprehensive Risk Score**: 0-100 scoring system based on multiple factors
- **Risk Level Classification**: Safe (✅), Suspicious (⚠️), Dangerous (❌)
- **Detailed Risk Factors**: Specific issues identified during analysis
- **Real-time Data**: Fresh data from Bitquery's streaming API

### User Experience
- **Fast Analysis**: Parallel data fetching for quick results
- **Smart Caching**: 5-minute cache to avoid redundant API calls
- **Context Menu Integration**: Right-click any Solana address to analyze
- **Multiple Platform Support**: Works on Solscan, DexScreener, Raydium, and more

## 📊 Analysis Metrics

### Metadata Analysis (20 points)
- Token name and symbol validation
- Metadata URI availability
- Token description and image

### Holder Analysis (30 points)
- Total number of holders
- Top holder concentration percentage
- Top 3 holders concentration
- Distribution risk assessment

### DEX Trading Analysis (25 points)
- Trading activity across multiple DEXes
- Number of unique traders
- Recent trading activity (24h)
- Liquidity assessment

### Transfer Activity Analysis (25 points)
- Total transfer count
- Unique senders and receivers
- Recent transfer activity
- Suspicious transfer patterns

## 🛠 Installation

### From Source
1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the `extension` folder
5. The extension icon should appear in your toolbar

### Usage
1. Click the extension icon in your Chrome toolbar
2. Enter a Solana token mint address (32-44 base58 characters)
3. Click "Analyze Token" or press Enter
4. View comprehensive analysis results

### Context Menu
- Select any Solana address on supported websites
- Right-click and choose "Analyze Solana Token"
- Extension popup will open with analysis

## 🔧 API Integration

This extension uses the **Bitquery GraphQL API** for comprehensive Solana blockchain data:

- **Endpoint**: `https://streaming.bitquery.io/graphql`
- **Data Sources**: Token transfers, holder balances, DEX trades, transaction history
- **Real-time**: Streaming data for up-to-date analysis
- **Comprehensive**: Multi-dimensional analysis across various data points

### Supported Websites
- Solscan.io
- DexScreener.com
- Raydium.io
- Pump.fun
- Birdeye.so
- Jupiter.ag
- Solana.fm

## 📈 Risk Assessment

### Risk Levels
- **Safe (75-100 points)**: ✅ Low risk, good fundamentals
- **Suspicious (45-74 points)**: ⚠️ Some concerns, proceed with caution
- **Dangerous (0-44 points)**: ❌ High risk, multiple red flags

### Common Risk Factors
- No token metadata found
- Missing token name or symbol
- Very few holders (< 10)
- High holder concentration (top holder > 50%)
- No DEX trading activity
- No recent activity (24h)
- Only trading on one DEX platform
- Very low transfer activity

## 🔒 Security & Privacy

- **No Data Collection**: Extension doesn't collect or store personal data
- **Local Caching**: Analysis results cached locally for 5 minutes
- **Secure API**: All API calls use HTTPS encryption
- **No Tracking**: No analytics or user behavior tracking

## 🐛 Troubleshooting

### Common Issues

**"Invalid Solana mint address format"**
- Ensure address is 32-44 base58 characters
- Don't use Ethereum addresses (starting with 0x)
- Don't use .sol domain names

**"Analysis failed. Please try again."**
- Check internet connection
- Try again in a few seconds (API rate limiting)
- Verify the token address exists on Solana

**"No token metadata found"**
- Token may be very new or have incomplete metadata
- This is a risk factor but doesn't mean the token is invalid

### Cache Management
- Analysis results are cached for 5 minutes
- Cache automatically clears old entries
- Fresh analysis performed after cache expires

## 🔄 Version History

### v2.0.0 - Bitquery Edition
- Complete rewrite using Bitquery GraphQL API
- Enhanced risk assessment with multiple data sources
- Added DEX trading analysis
- Improved holder distribution analysis
- Added creator wallet audit capabilities
- Better error handling and user feedback

### v1.0.0 - Initial Release
- Basic token analysis using Helius API
- Trust score calculation
- Holder analysis
- Authority status checking

## 🤝 Contributing

This extension is designed for educational and research purposes. Contributions are welcome:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## ⚠️ Disclaimer

This extension is for informational purposes only and should not be considered financial advice. Always do your own research before making investment decisions. The analysis provided is based on on-chain data and may not reflect all aspects of a token's legitimacy or potential.

## 📞 Support

For issues, questions, or feature requests:
- Check the troubleshooting section above
- Review common error messages
- Ensure you're using valid Solana mint addresses

---

**Built with ❤️ for the Solana community** 