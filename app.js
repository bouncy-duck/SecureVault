class SecureVault {
    constructor() {
        this.vaultStructure = null;
        this.currentPassword = null;
        this.currentMode = null; // 'real' or 'dummy'
        this.currentVaultData = null;
        this.isFirstTime = false;
        
        this.initializeElements();
        this.attachEventListeners();
        this.loadVault();
    }

    initializeElements() {
        // Screens
        this.loginScreen = document.getElementById('loginScreen');
        this.mainScreen = document.getElementById('mainScreen');
        
        // Login elements
        this.passwordInput = document.getElementById('password');
        this.loginBtn = document.getElementById('loginBtn');
        this.errorMessage = document.getElementById('errorMessage');
        this.setupInfo = document.getElementById('setupInfo');
        
        // Main app elements
        this.vaultTitle = document.getElementById('vaultTitle');
        this.vaultMode = document.getElementById('vaultMode');
        this.fileGrid = document.getElementById('fileGrid');
        this.emptyState = document.getElementById('emptyState');
        
        // Buttons
        this.addFilesBtn = document.getElementById('addFilesBtn');
        this.settingsBtn = document.getElementById('settingsBtn');
        this.lockBtn = document.getElementById('lockBtn');
        
        // Modals
        this.settingsModal = document.getElementById('settingsModal');
        this.dummyPasswordModal = document.getElementById('dummyPasswordModal');
    }

    attachEventListeners() {
        // Login
        this.loginBtn.addEventListener('click', () => this.handleLogin());
        this.passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleLogin();
        });
        
        // Main app
        this.lockBtn.addEventListener('click', () => this.lockVault());
        this.addFilesBtn.addEventListener('click', () => this.addFiles());
        this.settingsBtn.addEventListener('click', () => this.openSettings());
        
        // Settings modal
        document.getElementById('closeSettings').addEventListener('click', () => this.closeSettings());
        document.getElementById('setupDummyBtn').addEventListener('click', () => this.openDummyPasswordSetup());
        
        // Dummy password setup
        document.getElementById('closeDummySetup').addEventListener('click', () => this.closeDummyPasswordSetup());
        document.getElementById('cancelDummySetup').addEventListener('click', () => this.closeDummyPasswordSetup());
        document.getElementById('saveDummyPassword').addEventListener('click', () => this.saveDummyPassword());
    }

    async loadVault() {
        try {
            this.vaultStructure = await window.electronAPI.loadVault();
            if (!this.vaultStructure) {
                this.isFirstTime = true;
                this.setupInfo.style.display = 'block';
            }
        } catch (error) {
            console.error('Failed to load vault:', error);
            this.isFirstTime = true;
            this.setupInfo.style.display = 'block';
        }
    }

    async handleLogin() {
        const password = this.passwordInput.value.trim();
        if (!password) return;

        this.setLoading(true);
        this.hideError();

        try {
            if (this.isFirstTime) {
                await this.createNewVault(password);
            } else {
                await this.unlockVault(password);
            }
        } catch (error) {
            this.showError(error.message);
        } finally {
            this.setLoading(false);
        }
    }

    async createNewVault(password) {
        const initialVaultData = {
            realFiles: [],
            dummyFiles: [],
            metadata: {
                created: new Date().toISOString(),
                version: '1.0'
            }
        };

        // Create dual vault structure with just real password initially
        const vaultStructure = await window.electronAPI.createDualVault(initialVaultData, password, null);
        await window.electronAPI.saveVault(vaultStructure);
        
        this.vaultStructure = vaultStructure;
        this.currentPassword = password;
        this.currentMode = 'real';
        this.currentVaultData = initialVaultData;
        this.isFirstTime = false;
        
        this.openMainApp(initialVaultData);
    }

    async unlockVault(password) {
        const result = await window.electronAPI.validatePassword(this.vaultStructure, password);
        
        if (!result.success) {
            throw new Error(result.error || 'Invalid password');
        }
        
        this.currentMode = result.mode;
        this.currentPassword = password;
        this.currentVaultData = result.vault;
        this.openMainApp(result.vault);
    }

    openMainApp(vaultData) {
        this.loginScreen.classList.remove('active');
        this.mainScreen.classList.add('active');
        
        // Update UI - dummy vault should look identical to real vault
        if (this.currentMode === 'real') {
            this.vaultMode.textContent = '🔒 Secure Vault';
            this.vaultMode.className = 'vault-mode real';
            this.displayFiles(vaultData.realFiles);
            // Show settings button only in real vault
            this.settingsBtn.style.display = 'flex';
        } else {
            // Dummy vault appears identical - no indication it's dummy
            this.vaultMode.textContent = '🔒 Secure Vault';
            this.vaultMode.className = 'vault-mode real'; // Same styling as real
            this.displayFiles(vaultData.realFiles); // In dummy mode, realFiles contains the dummy files
            // Hide settings button to prevent discovery of dual vault system
            this.settingsBtn.style.display = 'none';
        }
        
        this.passwordInput.value = '';
        this.hideError();
    }

    displayFiles(files) {
        if (!files || files.length === 0) {
            this.emptyState.style.display = 'block';
            this.fileGrid.innerHTML = '';
            this.fileGrid.appendChild(this.emptyState);
            return;
        }

        this.emptyState.style.display = 'none';
        this.fileGrid.innerHTML = '';

        files.forEach(file => {
            const fileElement = this.createFileElement(file);
            this.fileGrid.appendChild(fileElement);
        });
    }

    createFileElement(file) {
        const fileDiv = document.createElement('div');
        fileDiv.className = 'file-item';
        
        const fileIcon = this.getFileIcon(file.name);
        const fileSize = this.formatFileSize(file.size);
        const dateAdded = new Date(file.dateAdded).toLocaleDateString();
        
        fileDiv.innerHTML = `
            <div class="file-icon">${fileIcon}</div>
            <div class="file-info">
                <div class="file-name" title="${file.name}">${file.name}</div>
                <div class="file-meta">
                    <span class="file-size">${fileSize}</span>
                    <span class="file-date">${dateAdded}</span>
                </div>
            </div>
            <div class="file-actions">
                <button class="btn-icon" onclick="vault.downloadFile('${file.name}')" title="Download">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" stroke-width="2"/>
                        <polyline points="7,10 12,15 17,10" stroke="currentColor" stroke-width="2"/>
                        <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" stroke-width="2"/>
                    </svg>
                </button>
                <button class="btn-icon delete" onclick="vault.deleteFile('${file.name}')" title="Delete">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <polyline points="3,6 5,6 21,6" stroke="currentColor" stroke-width="2"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" stroke-width="2"/>
                    </svg>
                </button>
            </div>
        `;
        
        return fileDiv;
    }

    getFileIcon(fileName) {
        const ext = fileName.split('.').pop().toLowerCase();
        const iconMap = {
            'pdf': '📄',
            'doc': '📝', 'docx': '📝',
            'txt': '📄',
            'jpg': '🖼️', 'jpeg': '🖼️', 'png': '🖼️', 'gif': '🖼️',
            'mp4': '🎥', 'avi': '🎥', 'mov': '🎥',
            'mp3': '🎵', 'wav': '🎵',
            'zip': '📦', 'rar': '📦',
            'default': '📄'
        };
        return iconMap[ext] || iconMap.default;
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async addFiles() {
        try {
            const selectedFiles = await window.electronAPI.selectFiles();
            if (selectedFiles.length === 0) return;

            // Add files to current vault
            if (this.currentMode === 'real') {
                this.currentVaultData.realFiles.push(...selectedFiles);
            } else {
                this.currentVaultData.realFiles.push(...selectedFiles); // In dummy mode, files go to realFiles
            }
            
            // Update the vault structure
            if (this.currentMode === 'real') {
                // Re-encrypt real vault
                const newVaultStructure = await window.electronAPI.createDualVault(
                    this.currentVaultData, 
                    this.currentPassword, 
                    this.vaultStructure.dummyVault ? 'dummy_exists' : null
                );
                
                // Preserve dummy vault if it exists
                if (this.vaultStructure.dummyVault) {
                    newVaultStructure.dummyVault = this.vaultStructure.dummyVault;
                    newVaultStructure.metadata.hasDummy = true;
                }
                
                this.vaultStructure = newVaultStructure;
            } else {
                // Update dummy vault
                const dummyEncrypted = await window.electronAPI.encryptData(this.currentVaultData, this.currentPassword);
                this.vaultStructure.dummyVault = dummyEncrypted;
            }
            
            await window.electronAPI.saveVault(this.vaultStructure);
            
            // Refresh display
            this.displayFiles(this.currentVaultData.realFiles);
            
        } catch (error) {
            console.error('Failed to add files:', error);
            alert('Failed to add files. Please try again.');
        }
    }

    async downloadFile(fileName) {
        try {
            const files = this.currentVaultData.realFiles;
            const file = files.find(f => f.name === fileName);
            
            if (file) {
                await window.electronAPI.saveFile(file.name, file.data);
            }
        } catch (error) {
            console.error('Failed to download file:', error);
            alert('Failed to download file. Please try again.');
        }
    }

    async deleteFile(fileName) {
        if (!confirm(`Are you sure you want to delete "${fileName}"?`)) return;

        try {
            const files = this.currentVaultData.realFiles;
            const fileIndex = files.findIndex(f => f.name === fileName);
            
            if (fileIndex !== -1) {
                files.splice(fileIndex, 1);
                
                // Update vault structure
                if (this.currentMode === 'real') {
                    const newVaultStructure = await window.electronAPI.createDualVault(
                        this.currentVaultData, 
                        this.currentPassword, 
                        null
                    );
                    
                    if (this.vaultStructure.dummyVault) {
                        newVaultStructure.dummyVault = this.vaultStructure.dummyVault;
                        newVaultStructure.metadata.hasDummy = true;
                    }
                    
                    this.vaultStructure = newVaultStructure;
                } else {
                    const dummyEncrypted = await window.electronAPI.encryptData(this.currentVaultData, this.currentPassword);
                    this.vaultStructure.dummyVault = dummyEncrypted;
                }
                
                await window.electronAPI.saveVault(this.vaultStructure);
                this.displayFiles(files);
            }
        } catch (error) {
            console.error('Failed to delete file:', error);
            alert('Failed to delete file. Please try again.');
        }
    }

    lockVault() {
        this.mainScreen.classList.remove('active');
        this.loginScreen.classList.add('active');
        this.passwordInput.value = '';
        this.currentPassword = null;
        this.currentMode = null;
        this.currentVaultData = null;
        this.hideError();
    }

    openSettings() {
        this.settingsModal.style.display = 'flex';
        this.updateSettingsModal();
    }

    closeSettings() {
        this.settingsModal.style.display = 'none';
    }

    async updateSettingsModal() {
        try {
            const realFilesCount = this.currentMode === 'real' ? this.currentVaultData.realFiles.length : 0;
            const dummyFilesCount = this.currentMode === 'dummy' ? this.currentVaultData.realFiles.length : 0;
            
            document.getElementById('realFilesCount').textContent = realFilesCount;
            document.getElementById('dummyFilesCount').textContent = dummyFilesCount;
            
            const totalSize = this.currentVaultData.realFiles.reduce((sum, file) => sum + file.size, 0);
            document.getElementById('totalSize').textContent = this.formatFileSize(totalSize);
            
            const dummyStatus = document.getElementById('dummyPasswordStatus');
            if (this.vaultStructure.metadata.hasDummy) {
                dummyStatus.textContent = '✓ Configured';
                dummyStatus.className = 'status configured';
                document.getElementById('setupDummyBtn').style.display = 'none';
            } else {
                dummyStatus.textContent = '⚠ Not configured';
                dummyStatus.className = 'status not-configured';
                document.getElementById('setupDummyBtn').style.display = 'inline-block';
            }
        } catch (error) {
            console.error('Failed to update settings:', error);
        }
    }

    openDummyPasswordSetup() {
        this.dummyPasswordModal.style.display = 'flex';
        document.getElementById('dummyPassword').value = '';
        document.getElementById('confirmDummyPassword').value = '';
    }

    closeDummyPasswordSetup() {
        this.dummyPasswordModal.style.display = 'none';
    }

    async saveDummyPassword() {
        const dummyPassword = document.getElementById('dummyPassword').value;
        const confirmPassword = document.getElementById('confirmDummyPassword').value;
        
        if (!dummyPassword || !confirmPassword) {
            alert('Please fill in both password fields.');
            return;
        }
        
        if (dummyPassword !== confirmPassword) {
            alert('Passwords do not match.');
            return;
        }
        
        if (dummyPassword === this.currentPassword) {
            alert('Dummy password cannot be the same as the real password.');
            return;
        }

        try {
            // Create dummy vault with empty files initially
            const dummyVaultData = {
                realFiles: [], // In dummy mode, this will be the visible files
                dummyFiles: [],
                metadata: this.currentVaultData.metadata
            };

            const updatedVaultStructure = await window.electronAPI.addDummyPassword(
                this.vaultStructure,
                this.currentPassword,
                dummyPassword,
                []
            );
            
            await window.electronAPI.saveVault(updatedVaultStructure);
            this.vaultStructure = updatedVaultStructure;
            
            this.closeDummyPasswordSetup();
            this.updateSettingsModal();
            
            alert('Dummy password configured successfully!');
        } catch (error) {
            console.error('Failed to save dummy password:', error);
            alert('Failed to configure dummy password. Please try again.');
        }
    }

    setLoading(loading) {
        const btnText = document.querySelector('.btn-text');
        const btnLoading = document.querySelector('.btn-loading');
        
        if (loading) {
            btnText.style.display = 'none';
            btnLoading.style.display = 'flex';
            this.loginBtn.disabled = true;
        } else {
            btnText.style.display = 'block';
            btnLoading.style.display = 'none';
            this.loginBtn.disabled = false;
        }
    }

    showError(message) {
        this.errorMessage.textContent = message;
        this.errorMessage.style.display = 'block';
    }

    hideError() {
        this.errorMessage.style.display = 'none';
    }
}

// Initialize the app
const vault = new SecureVault();
