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

// Function to convert text to snake_case
function toSnakeCase(text) {
    return text.toLowerCase().replace(/\s+/g, '_');
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
        subject: /^(anybody|anyone|anything|author|body|everyone|friend|group|human|individual|member|person|player|student|team|user|worker)\s/i,
        verb: /\s(accept|achieve|acquire|act|add|adjust|advance|agree|aim|allow|appear|apply|approach|arise|arrange|arrive|ask|attach|avoid|become|begin)\s/i,
        object: /\s(ability|account|action|activity|advice|amount|answer|area|article|aspect|asset|basis|benefit|case|change|choice|class|code|content|data)\s/i,
        // Descriptive patterns
        adjective: /\s(able|active|actual|agile|alive|amazing|aware|basic|better|bright|busy|calm|clean|clear|close|common|cool|correct|creative|direct)\s/i,
        adverb: /\s(abruptly|absently|actively|actually|again|almost|already|always|annually|aptly|around|aside|astride|atop|away|badly|barely|basically|boldly|briefly)\s/i,
        // Connecting words
        conjunction: /\s(although|amid|among|and|because|before|besides|between|but|except|however|if|instead|like|nor|or|plus|since|than|though)\s/i
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
    spacing = document.querySelector('input[name="spacing"]:checked').value;
    const useSpecialChars = document.getElementById('specialChars').checked;
    const useAlliteration = document.getElementById('alliteration').checked;
    
    console.log(`Settings: wordCount=${wordCount}, scoreThreshold=${scoreThreshold}, format=${format}, spacing=${spacing}, useSpecialChars=${useSpecialChars}, useAlliteration=${useAlliteration}`);

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
        let firstLetter = '';

        for (let i = 0; i < wordCount; i++) {
            let word = '';
            let number = '';

            if (useAlliteration && i > 0) {
                // Find a word starting with the same letter as the first word
                let matchFound = false;
                let attemptCount = 0;

                while (!matchFound) {
                    number = generateDicewareNumber();
                    word = wordList.get(number) || 'error';
                    if (word.charAt(0).toLowerCase() === firstLetter) {
                        matchFound = true;
                    }
                    attemptCount++;
                }

                if (!matchFound) {
                    word = wordList.get(number) || 'error'; // Use the last generated word if no match found
                }
            } else {
                number = generateDicewareNumber();
                word = wordList.get(number) || 'error';
                if (i === 0 && useAlliteration) {
                    firstLetter = word.charAt(0).toLowerCase();
                }
            }

            words.push(word);
            dicewareNumbers.push(number);
        }

        console.log('Generated words:', words);
        console.log('Diceware numbers:', dicewareNumbers);

        // Update raw words and numbers display
        document.getElementById('rawWordsOutput').value = words.join(' ').toLowerCase();
        document.getElementById('dicewareNumbersOutput').value = dicewareNumbers.join(' ');

        const wordsSplit = document.getElementById('rawWordsOutput').value.split(' ');

        // Apply formatting first
        let password;
        switch(format) {
            case 'camelCase':
                password = toCamelCase(wordsSplit.join(' '));
                break;
            case 'lowercase':
                password = wordsSplit.join(' ').toLowerCase();
                break;
            case 'AllCaps':
                password = toAllCaps(wordsSplit.join(' '));
                break;
            case 'snakeCase':
                password = toSnakeCase(wordsSplit.join(' '));
                spacing = 'noSpaces';
                break;
        }

        password = password.trim(); // Add this line to remove whitespace

        console.log('After formatting:', password);

        // Then apply spacing
        if (spacing === 'noSpaces') {
            password = password.replace(/\s+/g, '');
        }
        console.log('After spacing:', password);

        // Score the password
        currentScore = scorePassword(words.join(' '));
        console.log('Password score:', currentScore);

        // Apply special characters if selected
        if (useSpecialChars) {
            password = applySpecialChars(password);
            console.log('After special characters:', password);
        }

        if (currentScore >= scoreThreshold || (!useAlliteration && attempts >= maxAttempts)) {
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
    //document.getElementById('scoreIndicator').style.width = `${currentScore * 10}%`;
}

// Function to update password display without regenerating password
function updatePasswordDisplay() {
    console.log('Starting password display update...');
    // Get the raw words from the display
    const rawWords = document.getElementById('rawWordsOutput').value;
    if (!rawWords) {
        console.log('No raw words found, exiting...');
        return; // No password has been generated yet
    }
    console.log('Raw words:', rawWords);
    
    const words = rawWords.split(' ');
    const format = document.querySelector('input[name="format"]:checked').value;
    spacing = document.querySelector('input[name="spacing"]:checked').value;
    const useSpecialChars = document.getElementById('specialChars').checked;
    
    console.log(`Settings: format=${format}, spacing=${spacing}, useSpecialChars=${useSpecialChars}`);
    
    // Apply formatting first
    let password;
    switch(format) {
        case 'camelCase':
            password = toCamelCase(words.join(' '));
            break;
        case 'lowercase':
            password = words.join(' ').toLowerCase();
            break;
        case 'AllCaps':
            password = toAllCaps(words.join(' '));
            break;
        case 'snakeCase':
            password = toSnakeCase(words.join(' '));
            spacing = 'noSpaces';
            break;
    }
    console.log('After formatting:', password);

    password.trim(); // Add this line to remove whitespace
    
    // Then apply spacing
    if (spacing === 'noSpaces') {
        password = password.replace(/\s+/g, '');
        console.log('After removing spaces:', password);
    }
    
    // Apply special characters if selected
    if (useSpecialChars) {
        const originalPassword = password;
        password = applySpecialChars(password);
        console.log('Special characters applied:', {
            before: originalPassword,
            after: password
        });
    }
    
    // Update UI
    console.log('Final password:', password);
    document.getElementById('passwordOutput').value = password;
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
    document.getElementById('wordCount').addEventListener('input', async (e) => {
        const newWordCount = parseInt(e.target.value);
        document.getElementById('wordCountValue').textContent = newWordCount;
        await handleWordCountChange(newWordCount);
    });

    document.getElementById('scoreThreshold').addEventListener('input', (e) => {
        document.getElementById('scoreThresholdValue').textContent = e.target.value;
    });

    document.getElementById('specialCharsDensity').addEventListener('input', (e) => {
        document.getElementById('specialCharsDensityValue').textContent = `${e.target.value}%`;
    });

    // Experimental features toggle
    document.getElementById('experimentalFeatures').addEventListener('change', (e) => {
        if (e.target.checked) {
            document.body.classList.add('experimental-enabled');
        } else {
            document.body.classList.remove('experimental-enabled');
        }
    });

    // Special Characters toggle
    document.getElementById('specialChars').addEventListener('change', (e) => {
        if (e.target.checked) {
            document.body.classList.add('special-chars-enabled');
        } else {
            document.body.classList.remove('special-chars-enabled');
        }
    });

    // Add event listeners for format options
    document.querySelectorAll('input[name="format"]').forEach(radio => {
        radio.addEventListener('change', updatePasswordDisplay);
    });
    
    // Add event listeners for spacing options
    document.querySelectorAll('input[name="spacing"]').forEach(radio => {
        radio.addEventListener('change', updatePasswordDisplay);
    });
    
    // Add event listener for special characters toggle

    // Add event listener for special characters density
    document.getElementById('specialCharsDensity').addEventListener('input', updatePasswordDisplay);
    
    // Generate initial password
    generatePassword();
});

// Function to handle word count changes
async function handleWordCountChange(newWordCount) {
    const rawWords = document.getElementById('rawWordsOutput').value;
    if (!rawWords) return; // No password has been generated yet

    const rawDicewareNumbers = document.getElementById('dicewareNumbersOutput').value;
    if (!rawDicewareNumbers) return; // No password has been generated yet
    
    const currentWords = rawWords.split(' ');
    const currentDicewareNumbers = rawDicewareNumbers.split(' ');
    const wordList = await loadDicewareList();
    const useAlliteration = document.getElementById('alliteration').checked;
    const firstLetter = currentWords[0].charAt(0).toLowerCase();
    
    if (newWordCount > currentWords.length) {
        // Add more words
        for (let i = currentWords.length; i < newWordCount; i++) {
            let word = '';
            let number = '';
            
            if (useAlliteration) {
                // Find a word starting with the same letter as the first word
                let matchFound = false;
                while (!matchFound) {
                    number = generateDicewareNumber();
                    word = wordList.get(number) || 'error';
                    if (word.charAt(0).toLowerCase() === firstLetter) {
                        matchFound = true;
                    }
                }
            } else {
                number = generateDicewareNumber();
                word = wordList.get(number) || 'error';
            }
            
            currentWords.push(word);
            currentDicewareNumbers.push(number);
        }
    } else if (newWordCount < currentWords.length) {
        // Remove words from the end
        currentWords.length = newWordCount;
        currentDicewareNumbers.length = newWordCount;
    }
    
    // Update raw words display
    document.getElementById('rawWordsOutput').value = currentWords.join(' ');
    
    // Update diceware generated numbers display
    document.getElementById('dicewareNumbersOutput').value = currentDicewareNumbers.join(' ');

    // Update formatted password display
    updatePasswordDisplay();
}