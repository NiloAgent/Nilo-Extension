# 🛡️ Solana Token Analyzer

A modern Chrome extension for analyzing Solana tokens with real-time security assessment, holder distribution analysis, and risk evaluation.

![Solana Token Analyzer](https://img.shields.io/badge/Solana-Token%20Analyzer-orange?style=for-the-badge&logo=solana)
![Version](https://img.shields.io/badge/version-1.0.0-blue?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)

## ✨ Features

### 🔍 **Real-Time Token Analysis**
- **Live holder distribution** analysis using Bitquery GraphQL API
- **Accurate holder counts** with intelligent filtering
- **Top holder concentration** metrics (top 1, top 10)
- **Token metadata** resolution from multiple sources

### 🛡️ **Security Assessment**
- **Trust score calculation** (0-100) based on multiple risk factors
- **Authority status** checking (mint/freeze authority)
- **Risk factor detection** with detailed explanations
- **Visual risk indicators** with color-coded badges

### 🎨 **Modern UI/UX**
- **Clean, professional interface** with web3-native design
- **Animated trust score** with progress bar visualization
- **Card-based layout** with smooth hover effects
- **Responsive design** optimized for extension popup
- **Inter font** for enhanced readability

### 🚀 **Performance**
- **Fast analysis** with optimized API calls
- **Intelligent caching** for better performance
- **Error handling** with graceful fallbacks
- **Real-time updates** without page refresh

## 📸 Screenshots

### Main Interface
![Main Interface](docs/screenshots/main-interface.png)

### Token Analysis Results
![Analysis Results](docs/screenshots/analysis-results.png)

### Risk Assessment
![Risk Assessment](docs/screenshots/risk-assessment.png)

## 🚀 Installation

### Option 1: Install from Chrome Web Store (Coming Soon)
1. Visit the [Chrome Web Store page](#)
2. Click "Add to Chrome"
3. Confirm installation

### Option 2: Manual Installation (Developer Mode)
1. **Download the extension**:
   ```bash
   git clone https://github.com/yourusername/solana-token-analyzer.git
   cd solana-token-analyzer
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Build the extension**:
   ```bash
   npm run build
   ```

4. **Load in Chrome**:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (top right toggle)
   - Click "Load unpacked"
   - Select the `dist/` folder from the project

## 🔧 Development Setup

### Prerequisites
- Node.js 16+ and npm
- Chrome browser
- Git

### Local Development
1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/solana-token-analyzer.git
   cd solana-token-analyzer
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

4. **Start development**:
   ```bash
   npm run dev
   ```

5. **Build for production**:
   ```bash
   npm run build
   ```

### Project Structure
```
solana-token-analyzer/
├── extension/              # Source files
│   ├── popup.html         # Extension popup HTML
│   ├── popup.css          # Styling
│   ├── popup.js           # Main logic
│   ├── background.js      # Background script
│   ├── content.js         # Content script
│   └── manifest.json      # Extension manifest
├── dist/                  # Built extension files
├── docs/                  # Documentation
├── scripts/               # Build scripts
├── package.json           # Dependencies
└── README.md             # This file
```

## 🔑 API Configuration

The extension uses the following APIs:
- **Bitquery GraphQL API** for holder data
- **Solana RPC** for token metadata
- **Jupiter API** for token information

### Setting up API Keys
1. Get a Bitquery API key from [bitquery.io](https://bitquery.io)
2. Configure in the extension settings or environment variables

## 📖 Usage

### Basic Token Analysis
1. **Click the extension icon** in your Chrome toolbar
2. **Enter a Solana token address** (mint address)
3. **Click "Analyze"** to start the analysis
4. **Review the results**:
   - Trust score and risk level
   - Token information (name, symbol, supply, holders)
   - Authority status
   - Risk factors (if any)

### Understanding Trust Scores
- **🟢 70-100**: Low risk, generally safe
- **🟡 40-69**: Medium risk, do your research
- **🔴 0-39**: High risk, exercise caution

### Risk Factors
The extension checks for:
- High holder concentration
- Active mint/freeze authorities
- Low holder count
- Suspicious distribution patterns

## 🛠️ Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow
1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes** and test thoroughly
4. **Commit your changes**: `git commit -m 'Add amazing feature'`
5. **Push to the branch**: `git push origin feature/amazing-feature`
6. **Open a Pull Request**

### Code Style
- Use **TypeScript** for new features
- Follow **ESLint** configuration
- Write **tests** for new functionality
- Update **documentation** as needed

## 🧪 Testing

### Run Tests
```bash
npm test
```

### Test with Sample Tokens
```bash
# Test with known tokens
npm run test:tokens
```

### Manual Testing
1. Load the extension in developer mode
2. Test with various token addresses
3. Verify all features work correctly

## 📝 Changelog

### Version 1.0.0 (Current)
- ✨ Initial release
- 🎨 Modern UI redesign
- 🛡️ Real-time security analysis
- 📊 Holder distribution analysis
- 🚀 Performance optimizations

See [CHANGELOG.md](CHANGELOG.md) for detailed version history.

## 🤝 Support

### Getting Help
- 📖 Check the [Documentation](docs/)
- 🐛 Report bugs in [Issues](https://github.com/yourusername/solana-token-analyzer/issues)
- 💬 Join our [Discord community](#)
- 📧 Email: support@example.com

### Known Issues
- Some tokens may have delayed metadata updates
- Rate limiting may occur with rapid analysis requests

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Solana Foundation** for the blockchain infrastructure
- **Bitquery** for providing GraphQL APIs
- **Chrome Extensions Team** for the platform
- **Open source community** for inspiration and tools

## 🔗 Links

- [Chrome Web Store](#) (Coming Soon)
- [Documentation](docs/)
- [API Reference](docs/api.md)
- [Contributing Guide](CONTRIBUTING.md)
- [Security Policy](SECURITY.md)

---

**⚠️ Disclaimer**: This tool is for informational purposes only. Always do your own research before making investment decisions. The developers are not responsible for any financial losses.

**Made with ❤️ for the Solana community** 