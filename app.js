// Set initial theme (dark mode by default)
document.documentElement.setAttribute('data-theme', 'dark');

// Check for saved theme preference
const savedTheme = localStorage.getItem('theme');
if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme);
}

// Utility function to generate secure random numbers using Web Crypto API
function getSecureRandomNumber(min, max) {
    const range = max - min + 1;
    const byteArray = new Uint8Array(1);
    let value;
    do {
        window.crypto.getRandomValues(byteArray);
        value = byteArray[0] % range;
    } while (value >= range);
    return value + min;
}

// Generate a 5-digit number with each digit between 1-6
function generateDicewareNumber() {
    let number = '';
    for (let i = 0; i < 5; i++) {
        number += getSecureRandomNumber(1, 6);
    }
    return number;
}

// Load the diceware word list
async function loadDicewareList() {
    try {
        const response = await fetch('dicewareEEF.txt');
        const text = await response.text();
        const lines = text.split('\n');
        const wordMap = new Map();

        lines.forEach(line => {
            if (line.trim()) {
                const [number, word] = line.split('\t');
                wordMap.set(number, word);
            }
        });

        return wordMap;
    } catch (error) {
        console.error('Error loading word list:', error);
        return new Map();
    }
}

// Special character substitutions
const specialCharMap = {
    'a': '@',
    'e': '3',
    'i': '!',
    'o': '0',
    's': '$',
    't': '7',
    'l': '1'
};

// Function to apply special character substitutions
function applySpecialChars(word) {
    const density = parseInt(document.getElementById('specialCharsDensity').value) / 100;
    let hasSubstitution = false;
    let result = word.split('').map(char => {
        const replacement = specialCharMap[char];
        if (!replacement) return char;
        const shouldReplace = Math.random() < density;
        if (shouldReplace) hasSubstitution = true;
        return shouldReplace ? replacement : char;
    });

    // If no substitutions occurred, force one at a random eligible position
    if (!hasSubstitution) {
        const eligiblePositions = [];
        word.split('').forEach((char, index) => {
            if (specialCharMap[char]) eligiblePositions.push(index);
        });
        if (eligiblePositions.length > 0) {
            const randomPos = eligiblePositions[Math.floor(Math.random() * eligiblePositions.length)];
            result[randomPos] = specialCharMap[word[randomPos]];
        }
    }

    return result.join('');
}

// Function to convert text to camelCase
function toCamelCase(text) {
    return text.split(' ').map((word, index) => {
        if (index === 0) return word.toLowerCase();
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }).join(' ');
}

// Function to convert text to AllCaps
function toAllCaps(text) {
    return text.split(' ').map((word, index) => {
        // if (index === 0) return word.toLowerCase();
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }).join(' ');
}

// Function to score password based on sentence-like quality
function scorePassword(words) {
    let score = 5; // Start with a neutral score
    const wordArray = words.split(' ');

    // 1. Word count scoring (2 points)
    const wordCount = wordArray.length;
    if (wordCount >= 4) score += 1;
    if (wordCount >= 6) score += 1;

    // 2. Natural language patterns (3 points)
    const patterns = {
        // Subject-verb-object pattern
        subject: /^(i|we|you|they|he|she|it|the|my|your|our|their)\s/i,
        verb: /\s(is|are|was|were|will|would|can|could|have|had|do|does|go|went|make|made)\s/i,
        object: /\s(it|them|that|this|the|a|an)\s/i,
        // Descriptive patterns
        adjective: /\s(big|small|good|bad|new|old|high|low|long|short|great|nice|cool|warm)\s/i,
        adverb: /\s(quickly|slowly|carefully|easily|safely|well|very|really|always|never)\s/i,
        // Connecting words
        conjunction: /\s(and|or|but|because|while|when|if|then|so|that)\s/i
    };

    Object.values(patterns).forEach(pattern => {
        if (pattern.test(words)) score += 0.5;
    });

    // 3. Word length balance (2 points)
    const avgWordLength = wordArray.reduce((sum, word) => sum + word.length, 0) / wordArray.length;
    if (avgWordLength >= 4 && avgWordLength <= 8) score += 1;
    if (avgWordLength >= 5 && avgWordLength <= 7) score += 1;

    // 4. Consistency in capitalization (1 point)
    const hasConsistentCase = wordArray.every(word => 
        word === word.toLowerCase() || 
        word === word.toUpperCase() || 
        word.charAt(0) === word.charAt(0).toUpperCase()
    );
    if (hasConsistentCase) score += 1;

    // 5. Memorable number of words (2 points)
    // Psychology suggests 7±2 items is optimal for human memory
    const optimalWordCount = Math.abs(wordCount - 7) <= 2;
    if (optimalWordCount) score += 2;

    // Ensure score stays within 0-10 range
    return Math.max(0, Math.min(10, score));

}

// Main password generation function
async function generatePassword() {
    console.log('Starting password generation process...');
    const wordCount = parseInt(document.getElementById('wordCount').value);
    const scoreThreshold = parseFloat(document.getElementById('scoreThreshold').value);
    const format = document.querySelector('input[name="format"]:checked').value;
    const spacing = document.querySelector('input[name="spacing"]:checked').value;
    const useSpecialChars = document.getElementById('specialChars').checked;
    
    console.log(`Settings: wordCount=${wordCount}, scoreThreshold=${scoreThreshold}, format=${format}, spacing=${spacing}, useSpecialChars=${useSpecialChars}`);

    const wordList = await loadDicewareList();
    console.log(`Loaded word list with ${wordList.size} words`);
    if (wordList.size === 0) {
        console.error('Failed to load word list');
        alert('Error loading word list');
        return;
    }

    let attempts = 0;
    const maxAttempts = 100; // Prevent infinite loops
    let finalPassword = '';
    let currentScore = 0;

    do {
        console.log(`Attempt ${attempts + 1} of ${maxAttempts}`);
        // Generate words
        let words = [];
        let dicewareNumbers = [];
        for (let i = 0; i < wordCount; i++) {
            const number = generateDicewareNumber();
            const word = wordList.get(number) || 'error';
            words.push(word);
            dicewareNumbers.push(number);
        }
        console.log('Generated words:', words);
        console.log('Diceware numbers:', dicewareNumbers);

        // Update raw words and numbers display
        document.getElementById('rawWordsOutput').value = words.join(' ').toLowerCase();
        document.getElementById('dicewareNumbersOutput').value = dicewareNumbers.join(' ');

        // Apply formatting first
        let password;
        switch(format)
        {
            case 'camelCase':
                password = toCamelCase(words.join(' '));
                break;
            case 'lowercase':
                password = words.join(' ').toLowerCase();
                break;
            case 'AllCaps':
                password = toAllCaps(words.join(' '));
                break;
        }

        // if (format === 'camelCase') {
        //     password = toCamelCase(words.join(' '));
        // } else {
        //     password = words.join(' ').toLowerCase();
        // }
        console.log('After formatting:', password);

        // Then apply spacing
        if (spacing === 'noSpaces') {
            password = password.replace(/\s+/g, '');
        }
        console.log('After formatting:', password);

        // Score the password
        currentScore = scorePassword(words.join(' '));
        console.log('Password score:', currentScore);

        // Apply special characters if selected
        if (useSpecialChars) {
            password = applySpecialChars(password);
            console.log('After special characters:', password);
        }

        if (currentScore >= scoreThreshold || attempts >= maxAttempts) {
            finalPassword = password;
            break;
        }

        attempts++;
    } while (true);

    // Update UI
    console.log('Final password:', finalPassword);
    console.log('Final score:', currentScore);
    document.getElementById('passwordOutput').value = finalPassword;
    document.getElementById('scoreValue').textContent = currentScore.toFixed(1);
    document.getElementById('scoreIndicator').style.width = `${currentScore * 10}%`;
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Theme toggle
    const themeToggle = document.querySelector('.theme-toggle');
    const themeIcon = themeToggle.querySelector('.material-symbols-rounded');
    
    function toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        const newIcon = newTheme === 'dark' ? 'dark_mode' : 'light_mode';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        themeIcon.textContent = newIcon;
        
        // Save theme preference
        localStorage.setItem('theme', newTheme);
    }
    
    themeToggle.addEventListener('click', toggleTheme);
    
    // Set initial icon based on theme
    themeIcon.textContent = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark_mode' : 'light_mode';

    // Copy button
    document.getElementById('copyButton').addEventListener('click', () => {
        const passwordOutput = document.getElementById('passwordOutput');
        passwordOutput.select();
        document.execCommand('copy');
        // Visual feedback
        const icon = document.querySelector('#copyButton .material-symbols-rounded');
        icon.textContent = 'check';
        setTimeout(() => icon.textContent = 'content_copy', 2000);
    });

    // Generate button
    document.getElementById('generateButton').addEventListener('click', generatePassword);

    // Update displayed values for sliders
    document.getElementById('wordCount').addEventListener('input', (e) => {
        document.getElementById('wordCountValue').textContent = e.target.value;
    });

    document.getElementById('scoreThreshold').addEventListener('input', (e) => {
        document.getElementById('scoreThresholdValue').textContent = e.target.value;
    });

    document.getElementById('specialCharsDensity').addEventListener('input', (e) => {
        document.getElementById('specialCharsDensityValue').textContent = `${e.target.value}%`;
    });

    // Generate initial password
    generatePassword();
});