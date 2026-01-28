const { app, BrowserWindow, screen, ipcMain, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const os = require('os');

let mainWindow;
let tray;
let trayAnimationInterval;
let cpuUsage = 0;

// Frame per l'animazione della tray icon
const trayFrames = [
  "icon1.png",
  "icon2.png",
  "icon3.png",
  "icon4.png",
  "icon5.png",
  "icon6.png",
  "icon7.png",
  "icon8.png"
];

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  
  mainWindow = new BrowserWindow({
    width: width,
    height: height,
    x: 0,
    y: 0,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    hasShadow: false,
    thickFrame: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.setIgnoreMouseEvents(true, { forward: true });
  
  mainWindow.loadFile('index.html');
  
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });
}

// ✅ Funzione per animare la tray icon
function animateTrayIcon() {
  let frame = 0;

  trayAnimationInterval = setInterval(() => {
    try {
      const iconPath = path.join(__dirname, 'assets', trayFrames[frame]);
      const image = nativeImage
        .createFromPath(iconPath)
        .resize({ width: 25, height: 25 });
      
      if (tray) {
        tray.setImage(image);
      }
      frame = (frame + 1) % trayFrames.length;
    } catch (error) {
      console.error('Errore nell\'animazione tray icon:', error);
    }
  }, 250); // Cambia frame ogni 250ms
}

// ✅ Inizializza la tray icon
function initTray() {
  try {
    // Prova a caricare la prima icona
    const initialIconPath = path.join(__dirname, 'assets', 'icon1.png');
    const initialIcon = nativeImage
      .createFromPath(initialIconPath)
      .resize({ width: 16, height: 16 });

    // Se non trova l'icona, crea una icona vuota
    if (initialIcon.isEmpty()) {
      console.warn('Icona non trovata, usando icona vuota');
      const emptyIcon = nativeImage.createEmpty();
      tray = new Tray(emptyIcon);
    } else {
      tray = new Tray(initialIcon);
    }

    tray.setToolTip('Kernel Fragment - Active');
    
    // Menu contestuale
    const contextMenu = Menu.buildFromTemplate([
      { 
        label: 'Apri Kernel Fragment', 
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
          }
        }
      },
      { type: 'separator' },
      { 
        label: 'Nascondi Kernel Fragment', 
        click: () => {
          if (mainWindow) {
            mainWindow.hide();
          }
        }
      },
      { type: 'separator' },
      { label: 'Esci', role: 'quit' }
    ]);
    
    tray.setContextMenu(contextMenu);
    
    // Click sulla tray icon mostra/nasconde la finestra
    tray.on('click', () => {
      if (mainWindow) {
        if (mainWindow.isVisible()) {
          mainWindow.hide();
        } else {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    });

    // Avvia animazione
    animateTrayIcon();
    
    console.log('✅ Tray icon inizializzata');
    
  } catch (error) {
    console.error('❌ Errore inizializzazione tray icon:', error);
  }
}

let previousCpuUsage = null;

function calculateCPUUsage() {
  const cpus = os.cpus();
  let totalIdle = 0;
  let totalTick = 0;

  cpus.forEach(cpu => {
    for (let type in cpu.times) {
      totalTick += cpu.times[type];
    }
    totalIdle += cpu.times.idle;
  });

  return {
    totalIdle,
    totalTick,
    timestamp: Date.now()
  };
}

function initCPUMonitoring() {
  previousCpuUsage = calculateCPUUsage();
  
  setInterval(() => {
    const currentCpuUsage = calculateCPUUsage();
    
    const idleDifference = currentCpuUsage.totalIdle - previousCpuUsage.totalIdle;
    const totalDifference = currentCpuUsage.totalTick - previousCpuUsage.totalTick;
    const timeDifference = currentCpuUsage.timestamp - previousCpuUsage.timestamp;
    
    const cpuPercentage = 100 - Math.floor((idleDifference / totalDifference) * 100);
    
    cpuUsage = Math.max(0, Math.min(100, cpuPercentage));
    
    previousCpuUsage = currentCpuUsage;
    
    // Console log opzionale
    // console.log(`🖥️ CPU Usage: ${cpuUsage}%`);
    
  }, 200);
}

ipcMain.handle('get-cpu-usage', async () => {
  return cpuUsage;
});

app.whenReady().then(() => {
  createWindow();
  initCPUMonitoring();
  initTray(); // ✅ Inizializza la tray icon
  
  console.log('🚀 Kernel Fragment avviato con tray icon');
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// ✅ Pulizia quando l'app chiude
app.on('before-quit', () => {
  if (trayAnimationInterval) {
    clearInterval(trayAnimationInterval);
    trayAnimationInterval = null;
  }
  if (tray) {
    tray.destroy();
    tray = null;
  }
});