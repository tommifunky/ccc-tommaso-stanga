let lastMouseX = 0;
let lastMouseY = 0;
let lastTime = Date.now();

async function updateStats() {
  try {
    const battery = await window.API.getBattery();
    const cpuLoad = await window.API.getCpuLoad();
    const mem = await window.API.getMemory();
    const timeInfo = await window.API.getTimeInfo();

    //Battery
    document.getElementById("battery").innerText = battery.hasBattery
      ? battery.percent.toFixed(0)
      : "N/A";

    //CPU Load
    const cpuPercent = cpuLoad.currentLoad.toFixed(1);
    document.getElementById("cpu").innerText = cpuPercent;

    //RAM Usage
    const ramPercent = ((mem.active / mem.total) * 100).toFixed(1);
    document.getElementById("ram").innerText = ramPercent;

    //CPU Thermometer
    document.getElementById("cpu-thermometer").innerText =
      (+cpuPercent + 7).toFixed(1) + "%";

    //Uptime
    document.getElementById("uptime").innerText = formatTime(timeInfo.uptime);

    // Espansione quadranti
    document.getElementById("quadrant-battery").style.transform = `scale(${battery.percent / 100})`;
    document.getElementById("quadrant-cpu").style.transform = `scale(${cpuPercent / 100})`;
    document.getElementById("quadrant-ram").style.transform = `scale(${ramPercent / 100})`;
    document.getElementById("quadrant-thermometer").style.transform = `scale(${(+cpuPercent + 7).toFixed(1) / 100})`;

    // Colore sfondo uptime
    const hours = Math.floor(timeInfo.uptime / 3600);
    const maxHours = 168; // 7 giorni
    const uptimeProgress = Math.min(hours / maxHours, 1);
    const grayValue = Math.floor(uptimeProgress * 255);
    document.body.style.backgroundColor = `rgb(${grayValue}, ${grayValue}, ${grayValue})`;

  } catch (err) {
    console.error("Errore nel caricamento statistiche:", err);
  }
}

// Velocita e direzione mouse con chat (CON CHAT)
async function showMouseCoords() {
  const pos = await window.API.getMousePosition();
  const currentTime = Date.now();
  const deltaTime = (currentTime - lastTime) / 1000;
  
  const deltaX = pos.x - lastMouseX;
  const deltaY = pos.y - lastMouseY;
  const mouseSpeed = Math.sqrt(deltaX * deltaX + deltaY * deltaY) / deltaTime;
  
  const direction = deltaX > 0 ? 1 : -1;
  
  lastMouseX = pos.x;
  lastMouseY = pos.y;
  lastTime = currentTime;
  
  const rotationSpeed = mouseSpeed * 0.1 * direction; 
  const currentRotation = parseFloat(document.getElementById("compass-needle").style.transform.replace('rotate(', '').replace('deg)', '')) || 0;
  const newRotation = currentRotation + rotationSpeed;
  
  document.getElementById("compass-needle").style.transform = `rotate(${newRotation}deg)`;
  
  document.getElementById("mouse-coords").innerText = `X: ${pos.x}, Y: ${pos.y}`;
  document.getElementById("mouse-speed").innerText = `${mouseSpeed.toFixed(0)} px/s`;
}

function formatTime(seconds) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hrs.toString().padStart(2, "0")}:${mins
    .toString()
    .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

// Tracking del mouse
async function initMouseTracking() {
  const pos = await window.API.getMousePosition();
  lastMouseX = pos.x;
  lastMouseY = pos.y;
  lastTime = Date.now();
}

setInterval(showMouseCoords, 50);
setInterval(updateStats, 1000);

initMouseTracking();
showMouseCoords();
updateStats();