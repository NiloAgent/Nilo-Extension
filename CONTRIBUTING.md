# Contributing to Solana Token Analyzer

Thank you for your interest in contributing to the Solana Token Analyzer! This document provides guidelines and instructions for contributing to the project.

## 🚀 Quick Start

### Prerequisites
- **Node.js** 16+ and npm
- **Git** for version control
- **Chrome browser** for testing
- **Code editor** (VS Code recommended)

### Development Setup
1. **Fork the repository** on GitHub
2. **Clone your fork**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/solana-token-analyzer.git
   cd solana-token-analyzer
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Build the extension**:
   ```bash
   npm run build
   ```
5. **Load in Chrome** for testing

## 🔄 Development Workflow

### Branch Strategy
- **`main`**: Production-ready code
- **`develop`**: Integration branch for features
- **`feature/feature-name`**: Individual features
- **`bugfix/bug-description`**: Bug fixes
- **`hotfix/critical-fix`**: Critical production fixes

### Making Changes
1. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following our coding standards

3. **Test thoroughly**:
   ```bash
   npm test
   npm run build
   # Test in Chrome manually
   ```

4. **Commit with descriptive messages**:
   ```bash
   git add .
   git commit -m "✨ Add new feature: description of what you added"
   ```

5. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create a Pull Request** on GitHub

## 📝 Commit Message Guidelines

Use conventional commits with emojis:

### Format
```
<emoji> <type>: <description>

[optional body]

[optional footer]
```

### Types
- **✨ feat**: New features
- **🐛 fix**: Bug fixes
- **📝 docs**: Documentation changes
- **🎨 style**: Code style changes (formatting, etc.)
- **♻️ refactor**: Code refactoring
- **⚡ perf**: Performance improvements
- **🧪 test**: Adding or updating tests
- **🔧 chore**: Maintenance tasks
- **🚀 deploy**: Deployment-related changes

### Examples
```bash
git commit -m "✨ feat: add token price integration with Jupiter API"
git commit -m "🐛 fix: resolve holder count calculation error"
git commit -m "📝 docs: update installation instructions"
git commit -m "🎨 style: improve trust score card design"
```

## 🏗️ Project Structure

```
solana-token-analyzer/
├── extension/              # Chrome extension source
│   ├── popup.html         # Extension popup
│   ├── popup.css          # Styling
│   ├── popup.js           # Main logic
│   ├── background.js      # Background script
│   ├── content.js         # Content script
│   ├── manifest.json      # Extension manifest
│   └── icons/             # Extension icons
├── dist/                  # Built extension
├── scripts/               # Build scripts
├── docs/                  # Documentation
├── src/                   # Next.js source (if applicable)
└── tests/                 # Test files
```

## 🧪 Testing Guidelines

### Manual Testing
1. **Load extension** in Chrome developer mode
2. **Test with various tokens**:
   - Valid tokens with different risk profiles
   - Invalid addresses
   - Edge cases (new tokens, tokens with no holders)
3. **Verify UI responsiveness**
4. **Check error handling**

### Automated Testing
```bash
# Run all tests
npm test

# Test specific functionality
npm run test:tokens

# Validate extension
npm run validate
```

### Test Cases to Cover
- ✅ Valid token address input
- ✅ Invalid address handling
- ✅ API error scenarios
- ✅ Trust score calculations
- ✅ UI state management
- ✅ Loading states
- ✅ Risk factor detection

## 🎨 Code Style Guidelines

### JavaScript/TypeScript
- Use **ES6+** features
- **Consistent naming**: camelCase for variables, PascalCase for classes
- **Descriptive names**: `calculateTrustScore` not `calc`
- **Error handling**: Always handle API errors gracefully
- **Comments**: Explain complex logic, not obvious code

### CSS
- Use **BEM methodology** for class naming
- **Mobile-first** responsive design
- **Consistent spacing**: Use rem/em units
- **Color variables**: Use CSS custom properties
- **Modern features**: Flexbox, Grid, CSS animations

### HTML
- **Semantic markup**: Use appropriate HTML5 elements
- **Accessibility**: Include ARIA labels and roles
- **Performance**: Optimize images and assets

## 🔧 Adding New Features

### API Integration
1. **Add API client** in `src/lib/api/`
2. **Define types** with Zod schemas
3. **Handle errors** gracefully
4. **Add caching** if appropriate
5. **Update tests**

### UI Components
1. **Follow existing patterns**
2. **Make responsive**
3. **Add hover states**
4. **Include loading states**
5. **Test accessibility**

### Analysis Rules
1. **Add to rule engine** in `src/cursorRule/`
2. **Define clear scoring**
3. **Add explanations**
4. **Test edge cases**
5. **Update documentation**

## 🐛 Bug Reports

### Before Reporting
1. **Search existing issues**
2. **Test with latest version**
3. **Try different tokens**
4. **Check browser console**

### Bug Report Template
```markdown
**Bug Description**
Clear description of the bug

**Steps to Reproduce**
1. Step one
2. Step two
3. Step three

**Expected Behavior**
What should happen

**Actual Behavior**
What actually happens

**Environment**
- Chrome version:
- Extension version:
- Token address (if applicable):
- Screenshots (if helpful):
```

## 💡 Feature Requests

### Feature Request Template
```markdown
**Feature Description**
Clear description of the proposed feature

**Use Case**
Why is this feature needed?

**Proposed Solution**
How should it work?

**Alternatives Considered**
Other approaches you've thought about

**Additional Context**
Any other relevant information
```

## 📋 Pull Request Guidelines

### Before Submitting
- [ ] Code follows style guidelines
- [ ] Tests pass
- [ ] Extension builds successfully
- [ ] Manual testing completed
- [ ] Documentation updated
- [ ] Commit messages follow conventions

### PR Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Manual testing completed
- [ ] Automated tests pass
- [ ] Extension loads in Chrome

## Screenshots
(If applicable)

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
```

## 🏷️ Release Process

### Version Numbering
We follow [Semantic Versioning](https://semver.org/):
- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Steps
1. **Update version** in `package.json` and `manifest.json`
2. **Update CHANGELOG.md**
3. **Create release branch**: `release/v1.x.x`
4. **Test thoroughly**
5. **Merge to main**
6. **Create GitHub release**
7. **Deploy to Chrome Web Store**

## 🤝 Community Guidelines

### Code of Conduct
- **Be respectful** and inclusive
- **Help others** learn and grow
- **Give constructive feedback**
- **Focus on the code**, not the person
- **Celebrate contributions** of all sizes

### Getting Help
- 📖 Check the [documentation](../README.md)
- 🐛 Search [existing issues](https://github.com/yourusername/solana-token-analyzer/issues)
- 💬 Join our [Discord community](#)
- 📧 Email: contribute@example.com

## 🙏 Recognition

Contributors will be recognized in:
- **README.md** contributors section
- **CHANGELOG.md** for significant contributions
- **GitHub releases** notes
- **Social media** shoutouts

Thank you for contributing to the Solana Token Analyzer! 🚀 