// GitHub Section Verification Script
// This script verifies that the GitHub Trust Score section is properly implemented

console.log('🧪 Starting GitHub Section Verification...');

// Test 1: Check if HTML elements exist
function checkHTMLElements() {
    console.log('\n📋 Test 1: Checking HTML Elements...');
    
    const requiredElements = [
        'githubProjectSection',
        'githubProjectLoading', 
        'githubProjectContent',
        'githubProjectError',
        'githubProjectRepoName',
        'githubProjectDescription',
        'githubProjectStars',
        'githubProjectContributors',
        'githubProjectLastUpdate',
        'githubProjectLanguage',
        'githubProjectTrustScore',
        'githubProjectRiskBadge',
        'githubProjectTrustExplanation',
        'githubProjectRepoLink',
        'viewProjectOnGithub'
    ];
    
    let missingElements = [];
    
    requiredElements.forEach(elementId => {
        const element = document.getElementById(elementId);
        if (!element) {
            missingElements.push(elementId);
        } else {
            console.log(`✅ ${elementId} - Found`);
        }
    });
    
    if (missingElements.length > 0) {
        console.error('❌ Missing elements:', missingElements);
        return false;
    }
    
    console.log('✅ All HTML elements found!');
    return true;
}

// Test 2: Check CSS visibility and styling
function checkCSSProperties() {
    console.log('\n🎨 Test 2: Checking CSS Properties...');
    
    const githubSection = document.getElementById('githubProjectSection');
    if (!githubSection) {
        console.error('❌ GitHub section not found');
        return false;
    }
    
    const computedStyle = window.getComputedStyle(githubSection);
    
    // Check if section is visible
    const display = computedStyle.display;
    const visibility = computedStyle.visibility;
    const opacity = computedStyle.opacity;
    
    console.log(`📊 Display: ${display}`);
    console.log(`👁️ Visibility: ${visibility}`);
    console.log(`🔍 Opacity: ${opacity}`);
    
    if (display === 'none' || visibility === 'hidden' || opacity === '0') {
        console.error('❌ GitHub section is not visible');
        return false;
    }
    
    // Check positioning
    const position = githubSection.getBoundingClientRect();
    console.log(`📍 Position: top=${position.top}, left=${position.left}, width=${position.width}, height=${position.height}`);
    
    if (position.width === 0 || position.height === 0) {
        console.error('❌ GitHub section has no dimensions');
        return false;
    }
    
    console.log('✅ CSS properties look good!');
    return true;
}

// Test 3: Check JavaScript functions
function checkJavaScriptFunctions() {
    console.log('\n⚙️ Test 3: Checking JavaScript Functions...');
    
    const requiredFunctions = [
        'initializeGitHubProject',
        'analyzeGitHubProject', 
        'updateGitHubProjectUI',
        'showGitHubProjectError',
        'calculateGitHubTrustScore',
        'getRepositoryInfo',
        'getContributorsCount',
        'makeGitHubRequest'
    ];
    
    let missingFunctions = [];
    
    requiredFunctions.forEach(funcName => {
        if (typeof window[funcName] === 'function') {
            console.log(`✅ ${funcName} - Function exists`);
        } else {
            missingFunctions.push(funcName);
        }
    });
    
    if (missingFunctions.length > 0) {
        console.error('❌ Missing functions:', missingFunctions);
        return false;
    }
    
    console.log('✅ All JavaScript functions found!');
    return true;
}

// Test 4: Check if GitHub section is positioned correctly
function checkSectionOrder() {
    console.log('\n📏 Test 4: Checking Section Order...');
    
    const searchCard = document.querySelector('.search-card');
    const githubSection = document.getElementById('githubProjectSection');
    const loadingSection = document.getElementById('loadingSection');
    
    if (!searchCard || !githubSection || !loadingSection) {
        console.error('❌ Required sections not found');
        return false;
    }
    
    const searchRect = searchCard.getBoundingClientRect();
    const githubRect = githubSection.getBoundingClientRect();
    const loadingRect = loadingSection.getBoundingClientRect();
    
    console.log(`📋 Search Card: top=${searchRect.top}`);
    console.log(`🐙 GitHub Section: top=${githubRect.top}`);
    console.log(`⏳ Loading Section: top=${loadingRect.top}`);
    
    // GitHub section should be below search card and above loading section
    if (githubRect.top > searchRect.bottom && githubRect.top < loadingRect.top) {
        console.log('✅ GitHub section is positioned correctly!');
        return true;
    } else {
        console.error('❌ GitHub section is not positioned correctly');
        return false;
    }
}

// Test 5: Simulate GitHub data loading
function testGitHubDataLoading() {
    console.log('\n🔄 Test 5: Testing GitHub Data Loading...');
    
    // Check if initialization function exists and can be called
    if (typeof initializeGitHubProject === 'function') {
        console.log('🚀 Calling initializeGitHubProject()...');
        try {
            initializeGitHubProject();
            console.log('✅ GitHub initialization completed successfully');
            return true;
        } catch (error) {
            console.error('❌ GitHub initialization failed:', error);
            return false;
        }
    } else {
        console.error('❌ initializeGitHubProject function not found');
        return false;
    }
}

// Main verification function
function runFullVerification() {
    console.log('🧪 GITHUB SECTION VERIFICATION REPORT');
    console.log('=====================================');
    
    const tests = [
        { name: 'HTML Elements', func: checkHTMLElements },
        { name: 'CSS Properties', func: checkCSSProperties },
        { name: 'JavaScript Functions', func: checkJavaScriptFunctions },
        { name: 'Section Order', func: checkSectionOrder },
        { name: 'GitHub Data Loading', func: testGitHubDataLoading }
    ];
    
    let passedTests = 0;
    let totalTests = tests.length;
    
    tests.forEach((test, index) => {
        console.log(`\n🧪 Running Test ${index + 1}/${totalTests}: ${test.name}`);
        const result = test.func();
        if (result) {
            passedTests++;
            console.log(`✅ Test ${index + 1} PASSED`);
        } else {
            console.log(`❌ Test ${index + 1} FAILED`);
        }
    });
    
    console.log('\n📊 VERIFICATION SUMMARY');
    console.log('=======================');
    console.log(`✅ Passed: ${passedTests}/${totalTests}`);
    console.log(`❌ Failed: ${totalTests - passedTests}/${totalTests}`);
    
    if (passedTests === totalTests) {
        console.log('🎉 ALL TESTS PASSED! GitHub section is properly implemented and should be visible.');
        return true;
    } else {
        console.log('⚠️ Some tests failed. GitHub section may not be working correctly.');
        return false;
    }
}

// Expected GitHub repository data for verification
const EXPECTED_GITHUB_DATA = {
    repository: 'NiloAgent/Nilo-Extension',
    description: 'Chrome extension for analyzing memecoin activity',
    stars: '15',
    contributors: '2',
    lastUpdate: '3 days ago',
    language: 'TypeScript',
    trustScore: '6/10',
    riskLevel: '⚠️ Medium Risk'
};

// Function to verify GitHub data is displayed correctly
function verifyGitHubData() {
    console.log('\n📋 Verifying GitHub Data Display...');
    
    const elements = {
        repoName: document.getElementById('githubProjectRepoName'),
        description: document.getElementById('githubProjectDescription'),
        stars: document.getElementById('githubProjectStars'),
        contributors: document.getElementById('githubProjectContributors'),
        lastUpdate: document.getElementById('githubProjectLastUpdate'),
        language: document.getElementById('githubProjectLanguage'),
        trustScore: document.getElementById('githubProjectTrustScore'),
        riskBadge: document.getElementById('githubProjectRiskBadge')
    };
    
    Object.entries(elements).forEach(([key, element]) => {
        if (element) {
            console.log(`📝 ${key}: "${element.textContent}"`);
        } else {
            console.error(`❌ ${key} element not found`);
        }
    });
}

// Export for use in popup
if (typeof window !== 'undefined') {
    window.verifyGitHubSection = runFullVerification;
    window.checkGitHubData = verifyGitHubData;
}

// Auto-run if in browser environment
if (typeof document !== 'undefined') {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(runFullVerification, 2000);
        });
    } else {
        setTimeout(runFullVerification, 2000);
    }
}

console.log('✅ GitHub Section Verification Script Loaded');
console.log('💡 Run verifyGitHubSection() to check the implementation');
console.log('💡 Run checkGitHubData() to verify displayed data'); 