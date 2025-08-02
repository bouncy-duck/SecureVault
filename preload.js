const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    encryptData: (data, password) => ipcRenderer.invoke('encrypt-data', data, password),
    decryptData: (encryptedData, password) => ipcRenderer.invoke('decrypt-data', encryptedData, password),
    validatePassword: (vaultStructure, password) => ipcRenderer.invoke('validate-password', vaultStructure, password),
    createDualVault: (vaultData, realPassword, dummyPassword) => ipcRenderer.invoke('create-dual-vault', vaultData, realPassword, dummyPassword),
    addDummyPassword: (vaultStructure, realPassword, dummyPassword, dummyFiles) => ipcRenderer.invoke('add-dummy-password', vaultStructure, realPassword, dummyPassword, dummyFiles),
    saveVault: (vaultData) => ipcRenderer.invoke('save-vault', vaultData),
    loadVault: () => ipcRenderer.invoke('load-vault'),
    selectFiles: () => ipcRenderer.invoke('select-files'),
    saveFile: (fileName, fileData) => ipcRenderer.invoke('save-file', fileName, fileData),
});

// Security: Remove access to Node.js APIs
delete window.require;
delete window.exports;
delete window.module;
