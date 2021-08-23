const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const url = require("url");
const path = require("path");
const fs = require('fs')
const spawn = require('child_process');

let mainWindow

function readFileAsync(filePath) {
    let promise = new Promise(function (resolve, reject) {
        try {
            filePath = processPath(filePath);
            if (fs.existsSync(filePath)) {
                let buf = fs.readFileSync(filePath);
                resolve({ code: 0, success: true, data: buf.toString(), originData: buf });
            } else {
                resolve({ code: 400, success: false, msg: `File ${filePath} not found!` })
            }
        } catch (error) {
            reject(error);
            // ({ code: -1, success: false, msg: `读取文件异常：${error.message}` });
        }
    })
    return promise;

}



function processPath(filePath) {
    if (filePath == null) {
        return '';
    }
    if (filePath.startsWith('/dist')) {
        if (__dirname.endsWith('app.asar')) {
            return path.join(__dirname.substring(0, __dirname.length - 8), filePath)
        } else {
            return path.join(__dirname, filePath);
        }
    }
    return filePath;
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1366,
        height: 768,
        x: 0,
        y: 0,
        icon: path.join(__dirname, `/dist/flowchartweb/assets/icon.png`),
        name: "Asyncflow",
        // fullscreen: true,
        webPreferences: {
            nodeIntegration: true,
            webSecurity: process.env.NODE_ENV != 'development',
        },
        autoHideMenuBar: true
    })

    mainWindow.loadURL(
        url.format({
            pathname: path.join(__dirname, `/dist/flowchartweb/index.html`),
            protocol: "file:",
            slashes: true
        })
    );

    mainWindow.on("close", () => {
        mainWindow = null;
        app.exit();
    })

    // set menus

    // Open the DevTools.
    // mainWindow.webContents.openDevTools()
}

app.on('ready', createWindow)

app.on('close', function () {
    console.log('close1');
    app.exit();
})
app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        console.log('close1');
        app.exit()
    }
})

app.on('activate', function () {
    if (mainWindow === null) createWindow()
})

app.on('uncaughtException', function (err) {
    console.log(err);
})

ipcMain.handle('read-file', async (event, ...args) => {
    try {
        const result = await readFileAsync(...args);
        return { code: 0, data: result.data, originData: result.data };
    } catch (error) {
        return { code: -1, msg: error.message }
    }
})

ipcMain.handle('select-dir', async (event, args) => {
    try {
        const result = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] });
        if (result.canceled) {
            return { canceled: true }
        }
        return { canceled: false, code: 0, args: result.filePaths }
    } catch (error) {
        return { code: -1, msg: error.message }
    }
});

ipcMain.handle('read-dir', async (event, ...args) => {
    try {
        const files = fs.readdirSync(...args);
        return { code: 0, args: files };
    } catch (error) {
        return { code: -1, msg: error.message }
    }
})

ipcMain.handle('write-file', async (event, ...args) => {
    try {
        console.log(`write file ${args}`);
        fs.writeFileSync(args[0], args[1]);
        return { code: 0 }
    } catch (error) {
        return { code: -1, msg: error.message }
    }
})

ipcMain.handle('exists', async (event, ...args) => {
    return fs.existsSync(...args);
})

ipcMain.handle('create-dir', async (event, ...args) => {
    try {
        console.log(`create dir ${args}`);
        return fs.mkdirSync(...args);
    } catch (error) {
        return { code: -1, msg: error.message }
    }
});

ipcMain.handle('delete-file', async (event, ...args) => {
    try {
        let delPath = args[0];
        if (fs.lstatSync(delPath).isFile()) {
            fs.unlinkSync(delPath);
        } else {
            fs.rmdirSync(delPath);
        }
        return { code: 0 }
    } catch (error) {
        return { code: -1, msg: error.message }
    }
});

ipcMain.handle('rename-file', async (event, ...args) => {
    try {
        let oldPath = args[0].replace(/\//g, '\\');
        let oldParentPath = oldPath.substring(0, oldPath.lastIndexOf('\\') + 1);
        let newPath = oldParentPath + args[1];
        fs.renameSync(oldPath, newPath);
    } catch (error) {
        return { code: -1, msg: error.message };
    }
});

ipcMain.handle('exit-app', async (event)=>{
    app.exit();
})

ipcMain.on('crashed', (event, args) => {
    console.error(event);
})

class CallbackResult {
    // 是否成功
    success;
    // code
    code;
    // msg
    msg;
    // args
    args;
}
