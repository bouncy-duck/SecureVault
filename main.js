const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        icon: path.join(__dirname, 'assets', 'icon.png'),
        show: false,
        titleBarStyle: 'default'
    });

    mainWindow.loadFile('index.html');
    
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Remove menu bar for cleaner look
    mainWindow.setMenuBarVisibility(false);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
    contents.on('new-window', (navigationEvent) => {
        navigationEvent.preventDefault();
    });
});

// IPC handlers for secure operations
ipcMain.handle('encrypt-data', async (event, data, password) => {
    try {
        return await encryptWithPassword(data, password);
    } catch (error) {
        console.error('Encryption error:', error);
        throw new Error('Encryption failed');
    }
});

ipcMain.handle('decrypt-data', async (event, encryptedData, password) => {
    try {
        if (!encryptedData || !encryptedData.encrypted || !encryptedData.iv || !encryptedData.salt) {
            throw new Error('Invalid encrypted data format');
        }
        return await decryptWithPassword(encryptedData, password);
    } catch (error) {
        console.error('Decryption error:', error);
        throw new Error('Invalid password or corrupted data');
    }
});

// New approach: Store multiple encrypted versions of the vault
ipcMain.handle('create-dual-vault', async (event, vaultData, realPassword, dummyPassword = null) => {
    try {
        const vaultStructure = {
            realVault: null,
            dummyVault: null,
            metadata: {
                created: new Date().toISOString(),
                hasReal: true,
                hasDummy: !!dummyPassword
            }
        };

        // 1. Create and encrypt the real vault data (contains only real files)
        const realVaultData = {
            ...vaultData,
            dummyFiles: [] // Real vault should not see dummy files
        };
        const realEncrypted = await encryptWithPassword(realVaultData, realPassword);
        vaultStructure.realVault = realEncrypted;

        // 2. If dummy password provided, create and encrypt the dummy vault
        if (dummyPassword) {
            const dummyVaultData = {
                ...vaultData,
                // For the dummy vault, the "realFiles" list actually contains the dummy files.
                // This provides plausible deniability.
                realFiles: vaultData.dummyFiles || [],
                dummyFiles: [] // The dummy vault itself doesn't have a separate dummy list.
            };
            const dummyEncrypted = await encryptWithPassword(dummyVaultData, dummyPassword);
            vaultStructure.dummyVault = dummyEncrypted;
        }

        return vaultStructure;
    } catch (error) {
        console.error('Dual vault creation error:', error);
        throw new Error('Failed to create dual vault');
    }
});

// Helper function to encrypt data with a password
async function encryptWithPassword(data, password) {
    const algorithm = 'aes-256-cbc';
    const salt = crypto.randomBytes(16); // Generate a unique salt
    const key = crypto.pbkdf2Sync(password, salt, 10000, 32, 'sha256');
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return {
        encrypted,
        iv: iv.toString('hex'),
        salt: salt.toString('hex') // Store the salt with the encrypted data
    };
}

// Helper function to decrypt data with a password
async function decryptWithPassword(encryptedData, password) {
    const algorithm = 'aes-256-cbc';
    const salt = Buffer.from(encryptedData.salt, 'hex'); // Use the stored salt
    const key = crypto.pbkdf2Sync(password, salt, 10000, 32, 'sha256');
    const iv = Buffer.from(encryptedData.iv, 'hex');
    
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
}

// Try to unlock vault with given password
ipcMain.handle('validate-password', async (event, vaultStructure, password) => {
    try {
        if (!vaultStructure) {
            return { success: false, error: 'No vault found' };
        }

        // Try real vault first
        if (vaultStructure.realVault) {
            try {
                const decryptedVault = await decryptWithPassword(vaultStructure.realVault, password);
                return { success: true, mode: 'real', vault: decryptedVault };
            } catch (error) {
                // Real password failed, continue to try dummy
            }
        }

        // Try dummy vault if it exists
        if (vaultStructure.dummyVault) {
            try {
                const decryptedVault = await decryptWithPassword(vaultStructure.dummyVault, password);
                return { success: true, mode: 'dummy', vault: decryptedVault };
            } catch (error) {
                // Dummy password also failed
            }
        }

        return { success: false, error: 'Invalid password' };
    } catch (error) {
        console.error('Password validation error:', error);
        return { success: false, error: 'Invalid password or corrupted data' };
    }
});

// Update existing vault with dummy password
ipcMain.handle('add-dummy-password', async (event, vaultStructure, realPassword, dummyPassword, dummyFiles) => {
    try {
        // First decrypt the real vault to get the structure
        const realVaultData = await decryptWithPassword(vaultStructure.realVault, realPassword);
        
        // Create dummy vault data
        const dummyVaultData = {
            realFiles: dummyFiles || [],
            dummyFiles: [],
            metadata: realVaultData.metadata
        };

        // Encrypt dummy vault
        const dummyEncrypted = await encryptWithPassword(dummyVaultData, dummyPassword);
        
        // Update vault structure
        vaultStructure.dummyVault = dummyEncrypted;
        vaultStructure.metadata.hasDummy = true;

        return vaultStructure;
    } catch (error) {
        console.error('Add dummy password error:', error);
        throw new Error('Failed to add dummy password');
    }
});

ipcMain.handle('save-vault', async (event, vaultData) => {
    try {
        if (!vaultData || typeof vaultData !== 'object') {
            throw new Error('Invalid vault data received');
        }
        const userDataPath = app.getPath('userData');
        await fs.promises.mkdir(userDataPath, { recursive: true });
        const vaultPath = path.join(userDataPath, 'vault.secure');
        await fs.promises.writeFile(vaultPath, JSON.stringify(vaultData));
        return true;
    } catch (error) {
        console.error('Failed to save vault:', error);
        throw new Error(`Failed to save vault: ${error.message}`);
    }
});

ipcMain.handle('load-vault', async () => {
    try {
        const vaultPath = path.join(app.getPath('userData'), 'vault.secure');
        if (!fs.existsSync(vaultPath)) {
            return null;
        }
        const data = await fs.promises.readFile(vaultPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Failed to load vault:', error);
        return null;
    }
});

ipcMain.handle('select-files', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile', 'multiSelections'],
        filters: [
            { name: 'All Files', extensions: ['*'] },
            { name: 'Documents', extensions: ['pdf', 'doc', 'docx', 'txt'] },
            { name: 'Images', extensions: ['jpg', 'png', 'gif', 'bmp'] }
        ]
    });
    
    if (!result.canceled) {
        const files = [];
        for (const filePath of result.filePaths) {
            try {
                const fileData = await fs.promises.readFile(filePath);
                const fileName = path.basename(filePath);
                files.push({
                    name: fileName,
                    path: filePath,
                    data: fileData.toString('base64'),
                    size: fileData.length,
                    dateAdded: new Date().toISOString()
                });
            } catch (error) {
                console.error(`Failed to read file ${filePath}:`, error);
            }
        }
        return files;
    }
    return [];
});

ipcMain.handle('save-file', async (event, fileName, fileData) => {
    const result = await dialog.showSaveDialog(mainWindow, {
        defaultPath: fileName,
        filters: [
            { name: 'All Files', extensions: ['*'] }
        ]
    });
    
    if (!result.canceled) {
        try {
            const buffer = Buffer.from(fileData, 'base64');
            await fs.promises.writeFile(result.filePath, buffer);
            return true;
        } catch (error) {
            throw new Error('Failed to save file');
        }
    }
    return false;
});