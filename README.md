# Diceware Password Generator

A secure and customizable password generator that uses the EFF's Diceware wordlist to create memorable, strong passwords.

## Features

- **Secure Random Generation**: Uses the Web Crypto API for cryptographically secure random number generation
- **Customizable Word Count**: Choose between 2-8 words for your password
- **Multiple Formatting Options**:
  - Lowercase (e.g., "correct horse battery staple")
  - CamelCase (e.g., "correctHorseBatteryStaple")
  - AllCaps (e.g., "Correct Horse Battery Staple")
  - Snake_case (e.g., "correct_horse_battery_staple")
- **Special Character Substitutions**: Optionally replace letters with similar-looking numbers and symbols
- **Alliteration Mode**: Generate passwords where all words start with the same letter
- **Password Scoring**: Evaluates password strength based on various factors
- **Dark/Light Theme**: Toggle between dark and light modes

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/BrushWild/DicewareV2.git
   ```
2. Open `index.html` in your web browser

## Usage

1. Adjust the number of words using the slider (2-8 words)
2. Select your preferred formatting style
3. Toggle special character substitutions if desired
4. Enable alliteration mode for words starting with the same letter
5. Click "Generate New Password" to create a new password
6. Use the copy button to copy the password to your clipboard

## Security

This password generator uses:
- The EFF's large wordlist (7,776 words)
- Web Crypto API for secure random number generation
- Client-side only operation (no server communication)

## Development

The project is built with vanilla JavaScript and uses:
- Modern ES6+ features
- Web Crypto API for randomization
- CSS custom properties for theming

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Electronic Frontier Foundation (EFF) for the Diceware wordlist
- Inspired by the original Diceware password generation method