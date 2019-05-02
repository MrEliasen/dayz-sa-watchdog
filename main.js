// Modules to control application life and create native browser window
const {app, BrowserWindow} = require('electron');
const path = require('path');

if (process.env.NODE_ENV === 'development') {
    require('electron-reload')(__dirname);
}

process.on('uncaughtException', function (error) {
    console.log(error);
});

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

function createWindow() {
    // Create the browser window.
    mainWindow = new BrowserWindow({
        webPreferences: {
            allowRunningInsecureContent: false,
            experimentalFeatures: false,
            allowpopups: false,
        },
        width: 800,
        height: 600,
        resizable: false,
        icon: path.join(__dirname, 'assets/icons/png/64x64.png'),
    });

    mainWindow.setResizable(false);

    // Emitted when the window is closed.
    mainWindow.loadFile('index.html');

    mainWindow.on('closed', function() {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        mainWindow = null;
    });

    if (process.env.NODE_ENV === 'development') {
        // path to your react dev tools and redux dev tools
        /*
        const username = process.env.USERNAME || process.env.USER || process.env.LOGNAME;
        const chromeExtDir = `/Users/${username}/Library/Application\ Support/Google/Chrome/Default/Extensions`;
        BrowserWindow.addDevToolsExtension(`${chromeExtDir}/fmkadmapgofadopljbjfkapdkoienihi/3.6.0_0`);
        BrowserWindow.addDevToolsExtension(`${chromeExtDir}/lmhkpmbekcpmknklioeibfkpmmfibljd/2.17.0_0`);
        */

        // Open the DevTools.
        mainWindow.webContents.openDevTools();
    }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', function() {
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', function() {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) {
        createWindow();
    }
});
