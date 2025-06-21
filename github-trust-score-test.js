// GitHub Trust Score Test
// This script demonstrates the GitHub integration functionality

console.log('🐙 GitHub Trust Score Integration Test');

// GitHub Configuration
const GITHUB_CONFIG = {
    API_BASE: 'https://api.github.com',
    TOKEN: 'YOUR_GITHUB_TOKEN_HERE', // Replace with your GitHub personal access token
    DEFAULT_REPO: 'NiloAgent/Nilo-Extension'
};

// GitHub Trust Score Calculation (same as extension)
function calculateGitHubTrustScore(repoData, contributorsCount) {
    console.log('🧮 Calculating GitHub trust score...');
    
    let score = 0;
    const signals = [];
    
    // Signal 1: Stars (0-2 points)
    if (repoData.stars >= 30) {
        score += 2;
        signals.push(`✅ Good star count (${repoData.stars})`);
    } else if (repoData.stars < 5) {
        score -= 2;
        signals.push(`⚠️ Low star count (${repoData.stars})`);
    }
    
    // Signal 2: Contributors (0-2 points)
    if (contributorsCount >= 3) {
        score += 2;
        signals.push(`✅ Multiple contributors (${contributorsCount})`);
    } else if (contributorsCount === 0) {
        score -= 1;
        signals.push(`⚠️ No contributor data available`);
    } else {
        score -= 1;
        signals.push(`⚠️ Few contributors (${contributorsCount})`);
    }
    
    // Signal 3: Last updated (0-2 points)
    const daysSinceUpdate = Math.floor((Date.now() - new Date(repoData.updated_at)) / (1000 * 60 * 60 * 24));
    if (daysSinceUpdate <= 14) {
        score += 2;
        signals.push(`✅ Recently updated (${daysSinceUpdate} days ago)`);
    } else if (daysSinceUpdate > 90) {
        score -= 3;
        signals.push(`⚠️ Not updated recently (${daysSinceUpdate} days ago)`);
    }
    
    // Signal 4: Open issues (-1 point if too many)
    if (repoData.open_issues > 50) {
        score -= 1;
        signals.push(`⚠️ Many open issues (${repoData.open_issues})`);
    }
    
    // Signal 5: Description (+1 point if present, -2 if missing)
    if (repoData.description && repoData.description !== 'No description provided') {
        score += 1;
        signals.push(`✅ Description provided`);
    } else {
        score -= 2;
        signals.push(`⚠️ No description provided`);
    }
    
    // Normalize to 10-point scale
    const normalizedScore = Math.max(0, Math.min(10, score + 5));
    
    // Determine risk level
    let riskLevel, riskText;
    if (normalizedScore >= 8) {
        riskLevel = 'legit';
        riskText = '✅ Legit Project';
    } else if (normalizedScore >= 5) {
        riskLevel = 'medium';
        riskText = '⚠️ Medium Risk';
    } else {
        riskLevel = 'suspicious';
        riskText = '❌ High Risk';
    }
    
    console.log(`✅ GitHub trust score calculated: ${normalizedScore}/10 (${riskText})`);
    
    return {
        score: normalizedScore,
        riskLevel,
        riskText,
        signals,
        details: {
            stars: repoData.stars,
            contributors: contributorsCount,
            daysSinceUpdate,
            openIssues: repoData.open_issues
        }
    };
}

// Test the trust score calculation
async function testGitHubTrustScore() {
    try {
        console.log('📡 Fetching repository data...');
        
        const response = await fetch(`${GITHUB_CONFIG.API_BASE}/repos/${GITHUB_CONFIG.DEFAULT_REPO}`, {
            headers: {
                'Authorization': `Bearer ${GITHUB_CONFIG.TOKEN}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
        }
        
        const repoData = await response.json();
        console.log('📊 Repository data:', repoData);
        
        // Mock contributors count (in real extension this would be a separate API call)
        const contributorsCount = 2; // Adjust based on actual repo
        
        const trustScore = calculateGitHubTrustScore({
            name: repoData.full_name,
            description: repoData.description || 'No description provided',
            stars: repoData.stargazers_count,
            language: repoData.language || 'Unknown',
            updated_at: repoData.updated_at,
            open_issues: repoData.open_issues_count,
            html_url: repoData.html_url
        }, contributorsCount);
        
        console.log('🎯 Trust Score Results:');
        console.log(`   Score: ${trustScore.score}/10`);
        console.log(`   Risk Level: ${trustScore.riskText}`);
        console.log(`   Signals: ${trustScore.signals.join(', ')}`);
        
        return trustScore;
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        return null;
    }
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { calculateGitHubTrustScore, testGitHubTrustScore };
}

// Auto-run test in browser
if (typeof window !== 'undefined') {
    testGitHubTrustScore().then(result => {
        if (result) {
            console.log('✅ GitHub Trust Score test completed successfully!');
        } else {
            console.log('❌ GitHub Trust Score test failed!');
        }
    });
} 