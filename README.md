# SecureVault 🔐

A desktop application with dual-password protection that provides **plausible deniability** for sensitive file storage. Built with Electron, this app allows you to store files in two separate encrypted vaults - one real and one dummy - providing protection against coercion.

## 🚨 Security Features

### Dual-Password System
- **Real Password**: Access your actual sensitive files
- **Dummy Password**: Access decoy files for plausible deniability
- **Identical Interface**: Both vaults appear identical, providing no indication of the dual-vault system

### Plausible Deniability
- If forced to unlock the vault under duress, you can provide the dummy password
- The dummy vault appears as a normal file manager with its own set of files
- No settings button or indicators reveal the existence of the real vault when using dummy password
- Complete visual and functional parity between real and dummy modes

### Encryption
- **AES-256-CBC** encryption for all stored files
- **PBKDF2** key derivation with 10,000 iterations
- Each vault is independently encrypted with its respective password
- Files are encrypted and stored as Base64 data within the vault structure

## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Node.js, Electron
- **Encryption**: Node.js built-in `crypto` module
- **File System**: Electron's secure file system APIs

## 📦 Installation

### Prerequisites
- Node.js (v14 or higher)
- npm (comes with Node.js)

### Setup
1. Clone the repository:
   ```bash
   git clone [repository-url]
   cd SecureVault
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the application:
   ```bash
   npm start
   ```

## 🎮 How to Use

### First Time Setup
1. Launch the application
2. Create your **real password** (this will be your primary password for sensitive files)
3. The vault is now ready - you're in the real vault mode

### Adding Files
- Click **"Add Files"** to select and encrypt files into your current vault
- Files are encrypted and stored securely within the vault structure
- Supported formats: All file types (documents, images, videos, etc.)

### Setting Up Dummy Password
1. In the real vault, click **"Settings"**
2. Click **"Setup Dummy Password"**
3. Create a different password for the dummy vault
4. Add some decoy files to the dummy vault to make it convincing

### Accessing Your Vaults
- **Real Vault**: Enter your real password → Access actual sensitive files
- **Dummy Vault**: Enter your dummy password → Access decoy files
- Both look identical - the dummy vault hides all traces of the dual-vault system

### File Operations
- **Download**: Export files from the vault to your file system
- **Delete**: Remove files from the current vault
- **View**: See file details including size and date added

## 🔐 Security Considerations

### Best Practices
1. **Use Strong Passwords**: Both real and dummy passwords should be strong and unique
2. **Populate Dummy Vault**: Add believable decoy files to make the dummy vault convincing
3. **Regular Backups**: Consider backing up your vault file securely
4. **Physical Security**: Protect the device where SecureVault is installed

### Limitations
- This provides **plausible deniability**, not absolute security against all attacks
- Physical access to the device may allow forensic analysis
- Side-channel attacks are possible if the device is compromised
- The security relies on the strength of your passwords

## 📁 File Structure

```
SecureVault/
├── main.js              # Electron main process
├── preload.js           # Secure IPC bridge
├── index.html           # Application UI
├── styles.css           # Application styles
├── app.js               # Frontend application logic
├── package.json         # Project configuration
└── README.md           # This file
```

## 🧑‍💻 Development

### Building
The application is built with Electron and doesn't require a build step for development.

### Architecture
- **Main Process** (`main.js`): Handles file system operations, encryption, and window management
- **Renderer Process** (`app.js`): Manages UI interactions and vault operations
- **Preload Script** (`preload.js`): Provides secure communication between main and renderer processes

### Security Architecture
- All file operations are performed in the main process
- Encryption keys never leave the main process
- UI has no direct access to file system or encryption functions
- Context isolation prevents code injection attacks

## ⚠️ Disclaimer

This software is provided for educational and legitimate privacy purposes only. Users are responsible for complying with all applicable laws and regulations in their jurisdiction. The developers assume no responsibility for misuse of this software.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues for bugs and feature requests.

## 🙏 Acknowledgments

- Inspired by TrueCrypt/VeraCrypt's hidden volume feature
- Built with security and privacy in mind
- Designed for users who need protection against coercion

---

**Remember**: The best security is the one that's actually used. Keep your passwords safe and consider the legal implications in your jurisdiction.
