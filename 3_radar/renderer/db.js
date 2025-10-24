(function () {
  let yourID = 9;
  let friendID = 4;
  let friendID2 = 7;
  let table = "students";

  // Variabili personali (valori correnti visualizzati)
  let personalBattery = 0;
  let personalCpuLoad = 0;
  let personalRam = 0;
  let personalUptime = 0;
  let personalMouse = { x: 0, y: 0 };

  // Valori target personali per interpolazione
  let targetPersonalData = {
    cpuLoad: 0, ram: 0, battery: 0, uptime: 0, mouse: { x: 0, y: 0 }
  };

  // Variabili amico (valori correnti visualizzati)
  let friendBattery = 0;
  let friendCpuLoad = 0;
  let friendRam = 0;
  let friendUptime = 0;
  let friendMouse = { x: 0, y: 0 };

  // Variabili amico2 (valori correnti visualizzati)
  let friendBattery2 = 0;
  let friendCpuLoad2 = 0;
  let friendRam2 = 0;
  let friendUptime2 = 0;
  let friendMouse2 = { x: 0, y: 0 };

  // Valori target per interpolazione
  let targetFriendData = {
    cpuLoad: 0, ram: 0, battery: 0, uptime: 0, mouse: { x: 0, y: 0 }
  };
  let targetFriendData2 = {
    cpuLoad: 0, ram: 0, battery: 0, uptime: 0, mouse: { x: 0, y: 0 }
  };

  const interpolationSpeed = 0.3; // Più veloce per transizioni più responsive
  let lastReconnectAttempt = Date.now();

  // Timestamps
  let personalLastUpdate = Date.now();
  let friendLastUpdate = 0;
  let friend2LastUpdate = 0;

  // Dimensioni schermo
  let screenWidth = window.screen.width;
  let screenHeight = window.screen.height;
  console.log("Screen dimensions:", screenWidth, "x", screenHeight);

  // Event listeners per dati personali - ORA AGGIORNANO SOLO I TARGET
  window.addEventListener("batteryUpdate", (e) => {
    targetPersonalData.battery = parseFloat(e.detail.percent.toFixed(0)) || 0;
    personalLastUpdate = Date.now();
  });

  window.addEventListener("cpuLoadUpdate", (e) => {
    targetPersonalData.cpuLoad = parseFloat(e.detail.currentLoad.toFixed(1)) || 0;
    personalLastUpdate = Date.now();
  });

  window.addEventListener("ramUpdate", (e) => {
    targetPersonalData.ram = parseFloat(((e.detail.active / e.detail.total) * 100).toFixed(1)) || 0;
    personalLastUpdate = Date.now();
  });

  window.addEventListener("uptimeUpdate", (e) => {
    targetPersonalData.uptime = parseFloat(e.detail.uptime) || 0;
    personalLastUpdate = Date.now();
  });

  window.addEventListener("mouseUpdate", (e) => {
    targetPersonalData.mouse = e.detail;
    personalLastUpdate = Date.now();
  });

  // Connessione Supabase
  const SUPABASE_URL = "https://ukaxvfohnynqjvgzxtkk.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrYXh2Zm9obnlucWp2Z3p4dGtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0MzU5NzgsImV4cCI6MjA3NjAxMTk3OH0.dZIYwmU-DYSgZFqmpEGXnwb8mm1pYGTU7As9ZrlFWL4";

  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  let channel;

  // === HOVER SYSTEM ===
let hoveredAxis = null; // quale asse è in hover (cpu, ram, battery, uptime, mousex, mousey)
const angleMap = { cpu: 0, ram: 60, battery: 120, uptime: 180, mousex: 240, mousey: 300 };


  // 👇 FUNZIONE PER CARICARE I DATI INIZIALI
  async function loadInitialData() {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .in('id', [friendID, friendID2])
        .order('updated_at', { ascending: false });

      if (error) {
        console.error("Error loading initial data:", error);
        return;
      }

      console.log("Loaded initial data:", data);

      // Organizza i dati per ID
      const dataByUser = {};
      data.forEach(item => {
        dataByUser[item.id] = item;
      });

      // Carica dati friend 1 (se disponibili)
      if (dataByUser[friendID]) {
        const friendData = dataByUser[friendID].data;
        friendBattery = friendData.battery || 0;
        friendCpuLoad = friendData.cpuLoad || 0;
        friendRam = friendData.ram || 0;
        friendUptime = friendData.uptime || 0;
        friendMouse = friendData.mouse || { x: 0, y: 0 };
        friendLastUpdate = new Date(dataByUser[friendID].updated_at).getTime();
        
        // Inizializza anche i target
        targetFriendData = {
          cpuLoad: friendCpuLoad,
          ram: friendRam,
          battery: friendBattery,
          uptime: friendUptime,
          mouse: friendMouse
        };
        
        console.log("Loaded friend 1 data:", friendData);
      }

      // Carica dati friend 2 (se disponibili)
      if (dataByUser[friendID2]) {
        const friendData2 = dataByUser[friendID2].data;
        friendBattery2 = friendData2.battery || 0;
        friendCpuLoad2 = friendData2.cpuLoad || 0;
        friendRam2 = friendData2.ram || 0;
        friendUptime2 = friendData2.uptime || 0;
        friendMouse2 = friendData2.mouse || { x: 0, y: 0 };
        friend2LastUpdate = new Date(dataByUser[friendID2].updated_at).getTime();
        
        // Inizializza anche i target
        targetFriendData2 = {
          cpuLoad: friendCpuLoad2,
          ram: friendRam2,
          battery: friendBattery2,
          uptime: friendUptime2,
          mouse: friendMouse2
        };
        
        console.log("Loaded friend 2 data:", friendData2);
      }

      // Disegna con i dati caricati
      draw();
      
    } catch (err) {
      console.error("Failed to load initial data:", err);
    }
  }

  // Funzione per inviare i propri dati
  async function saveData() {
    const input = {
      id: yourID,
      data: {
        cpuLoad: personalCpuLoad, // Usa i valori interpolati, non i target
        battery: personalBattery,
        ram: personalRam,
        uptime: personalUptime,
        mouse: personalMouse,
        heartbeat: Date.now(),
      },
      updated_at: new Date(),
    };

    const { error } = await supabase.from(table).upsert([input]);
    if (error) {
      console.error("Insert error:", error.message);
    } else {
      console.log("Insert success");
    }
  }

  // Funzione per gestire il canale Realtime
  function subscribeRealtime() {
    if (channel) {
      console.warn("Removing old channel before re-subscribing...");
      supabase.removeChannel(channel);
    }

    channel = supabase
      .channel("public:" + table)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: table },
        (payload) => {
          const data = payload.new;
          const updateTime = Date.now();

          console.log("Realtime update received:", data);

          if (data.id === friendID) {
            targetFriendData = {
              cpuLoad: parseFloat(data.data.cpuLoad) || targetFriendData.cpuLoad,
              ram: parseFloat(data.data.ram) || targetFriendData.ram,
              battery: parseFloat(data.data.battery) || targetFriendData.battery,
              uptime: parseFloat(data.data.uptime) || targetFriendData.uptime,
              mouse: data.data.mouse || targetFriendData.mouse
            };
            friendLastUpdate = updateTime;
            console.log("Friend 1 target data updated:", targetFriendData);
          }
          else if (data.id === friendID2) {
            targetFriendData2 = {
              cpuLoad: parseFloat(data.data.cpuLoad) || targetFriendData2.cpuLoad,
              ram: parseFloat(data.data.ram) || targetFriendData2.ram,
              battery: parseFloat(data.data.battery) || targetFriendData2.battery,
              uptime: parseFloat(data.data.uptime) || targetFriendData2.uptime,
              mouse: data.data.mouse || targetFriendData2.mouse
            };
            friend2LastUpdate = updateTime;
            console.log("Friend 2 target data updated:", targetFriendData2);
          }
        }
      )
      .subscribe((status) => {
        console.log("Realtime channel status:", status);
        if (status === "CLOSED" || status === "CHANNEL_ERROR") {
          console.warn("Realtime disconnected. Reconnecting in 3s...");
          setTimeout(subscribeRealtime, 3000);
        }
      });
  }

  // Funzione di interpolazione lineare
  function lerp(start, end, factor) {
    if (typeof start !== 'number' || typeof end !== 'number') {
      return parseFloat(end) || 0;
    }
    // Aggiungi una soglia minima per evitare micro-movimenti
    if (Math.abs(end - start) < 0.1) return end;
    return start + (end - start) * factor;
  }

  // Interpola i valori verso i target - ORA ANCHE PER I TUOI DATI
  function interpolateValues() {
    // TUOI DATI - ora anche interpolati
    personalCpuLoad = lerp(personalCpuLoad, targetPersonalData.cpuLoad, interpolationSpeed);
    personalRam = lerp(personalRam, targetPersonalData.ram, interpolationSpeed);
    personalBattery = lerp(personalBattery, targetPersonalData.battery, interpolationSpeed);
    personalUptime = lerp(personalUptime, targetPersonalData.uptime, interpolationSpeed);
    personalMouse.x = lerp(personalMouse.x, targetPersonalData.mouse.x || 0, interpolationSpeed);
    personalMouse.y = lerp(personalMouse.y, targetPersonalData.mouse.y || 0, interpolationSpeed);

    // Friend 1
    friendCpuLoad = lerp(friendCpuLoad, targetFriendData.cpuLoad, interpolationSpeed);
    friendRam = lerp(friendRam, targetFriendData.ram, interpolationSpeed);
    friendBattery = lerp(friendBattery, targetFriendData.battery, interpolationSpeed);
    friendUptime = lerp(friendUptime, targetFriendData.uptime, interpolationSpeed);
    friendMouse.x = lerp(friendMouse.x, targetFriendData.mouse.x || 0, interpolationSpeed);
    friendMouse.y = lerp(friendMouse.y, targetFriendData.mouse.y || 0, interpolationSpeed);

    // Friend 2
    friendCpuLoad2 = lerp(friendCpuLoad2, targetFriendData2.cpuLoad, interpolationSpeed);
    friendRam2 = lerp(friendRam2, targetFriendData2.ram, interpolationSpeed);
    friendBattery2 = lerp(friendBattery2, targetFriendData2.battery, interpolationSpeed);
    friendUptime2 = lerp(friendUptime2, targetFriendData2.uptime, interpolationSpeed);
    friendMouse2.x = lerp(friendMouse2.x, targetFriendData2.mouse.x || 0, interpolationSpeed);
    friendMouse2.y = lerp(friendMouse2.y, targetFriendData2.mouse.y || 0, interpolationSpeed);
  }

  // Monitora la connessione
  function monitorConnection() {
    const now = Date.now();
    if (channel && channel.state !== "joined" && (now - lastReconnectAttempt) > 10000) {
      console.warn("Reconnecting realtime channel...");
      subscribeRealtime();
      lastReconnectAttempt = now;
    }
  }

  // 👇 INIZIALIZZA CARICANDO PRIMA I DATI E POI IL REALTIME
  async function initialize() {
    await loadInitialData();
    subscribeRealtime();
    createRadarChart();   // crea il radar subito una volta
enableHoverListeners(); // e attiva i listener hover

    
    // Inizializza i tuoi target con i valori attuali
    targetPersonalData = {
      cpuLoad: personalCpuLoad,
      ram: personalRam,
      battery: personalBattery,
      uptime: personalUptime,
      mouse: personalMouse
    };
    
    // Aggiornamenti frequenti per interpolazione fluida
    setInterval(interpolateValues, 40); // 25 FPS
    setInterval(draw, 40);
    setInterval(monitorConnection, 5000);
  }

  // Avvia l'inizializzazione
  initialize();

  // Ping periodico per tenere vivo il canale
  setInterval(() => {
    if (channel && channel.state === "joined") {
      channel.send({
        type: "broadcast",
        event: "ping",
        payload: { t: Date.now() },
      });
      console.log("Ping sent to keep connection alive");
    }
  }, 20000);

  // Disegno dati sullo schermo
function draw() {
  createRadarChart();

  const now = Date.now();
  const inactiveThreshold = 1000; // 1 secondo

  const youActive = true;
  const friendActive = (now - friendLastUpdate) < inactiveThreshold;
  const friend2Active = (now - friend2LastUpdate) < inactiveThreshold;

  // === SE SI STA FACENDO HOVER SU UN ASSE ===
  if (hoveredAxis) {
  // mantieni i poligoni visibili ma riduci leggermente l’opacità
  document.getElementById('you-polygon').style.opacity = 0.25;
  document.getElementById('friend-polygon').style.opacity = 0.25;
  document.getElementById('friend2-polygon').style.opacity = 0.25;
  
    // aggiorna comunque la forma dei poligoni mentre sei in hover
  updateRadarPolygon('you',    personalCpuLoad,  personalRam,  personalBattery,  personalUptime,  personalMouse,  youActive);
  updateRadarPolygon('friend', friendCpuLoad,    friendRam,    friendBattery,    friendUptime,    friendMouse,    friendActive);
  updateRadarPolygon('friend2',friendCpuLoad2,   friendRam2,   friendBattery2,   friendUptime2,   friendMouse2,   friend2Active);



    const label = document.getElementById('hover-label');
    const dotYou = document.getElementById('dot-you');
    const dotFriend = document.getElementById('dot-friend');
    const dotFriend2 = document.getElementById('dot-friend2');
    label.style.display = 'block';
    label.textContent = hoveredAxis.toLowerCase();

    const angle = angleMap[hoveredAxis];
    const centerX = 100, centerY = 100, maxRadius = 90;
    const toXY = (val) => {
      const r = maxRadius * (val / 100);
      const a = (angle - 90) * Math.PI / 180;
      return { x: centerX + r * Math.cos(a), y: centerY + r * Math.sin(a) };
    };

    const youNorm = getNormalizedByAxis(hoveredAxis, {
      cpuLoad: personalCpuLoad,
      ram: personalRam,
      battery: personalBattery,
      uptime: personalUptime,
      mouse: personalMouse
    });
    const frNorm = getNormalizedByAxis(hoveredAxis, {
      cpuLoad: friendCpuLoad,
      ram: friendRam,
      battery: friendBattery,
      uptime: friendUptime,
      mouse: friendMouse
    });
    const fr2Norm = getNormalizedByAxis(hoveredAxis, {
      cpuLoad: friendCpuLoad2,
      ram: friendRam2,
      battery: friendBattery2,
      uptime: friendUptime2,
      mouse: friendMouse2
    });

    const youXY = toXY(youNorm);
    const frXY = toXY(frNorm);
    const fr2XY = toXY(fr2Norm);

    dotYou.setAttribute('cx', youXY.x);
    dotYou.setAttribute('cy', youXY.y);
    dotFriend.setAttribute('cx', frXY.x);
    dotFriend.setAttribute('cy', frXY.y);
    dotFriend2.setAttribute('cx', fr2XY.x);
    dotFriend2.setAttribute('cy', fr2XY.y);

    // === Mostra i cerchietti e regola opacità in base all'attività ===
dotYou.style.display = 'block';
dotFriend.style.display = 'block';
dotFriend2.style.display = 'block';

// You è sempre attivo
dotYou.setAttribute('fill', 'rgba(255, 50, 50, 1)');
dotYou.style.opacity = 0.9;

// Friend 1
if (friendActive) {
  dotFriend.setAttribute('fill', 'rgba(50, 150, 255, 0.9)');
  dotFriend.style.opacity = 0.9;
} else {
  dotFriend.setAttribute('fill', 'rgba(50, 150, 255, 0.3)');
  dotFriend.style.opacity = 1;
}

// Friend 2
if (friend2Active) {
  dotFriend2.setAttribute('fill', 'rgba(50, 255, 150, 0.9)');
  dotFriend2.style.opacity = 0.9;
} else {
  dotFriend2.setAttribute('fill', 'rgba(50, 255, 150, 0.3)');
  dotFriend2.style.opacity = 1;
}

  } 
  // === ALTRIMENTI (NESSUN HOVER) ===
  else {
    // ripristina visuale normale
    document.getElementById('hover-label').style.display = 'none';
    document.getElementById('dot-you').style.display = 'none';
    document.getElementById('dot-friend').style.display = 'none';
    document.getElementById('dot-friend2').style.display = 'none';
    document.getElementById('you-polygon').style.display = 'block';
    document.getElementById('friend-polygon').style.display = 'block';
    document.getElementById('friend2-polygon').style.display = 'block';

    updateRadarPolygon('you', personalCpuLoad, personalRam, personalBattery, personalUptime, personalMouse, youActive);
    updateRadarPolygon('friend', friendCpuLoad, friendRam, friendBattery, friendUptime, friendMouse, friendActive);
    updateRadarPolygon('friend2', friendCpuLoad2, friendRam2, friendBattery2, friendUptime2, friendMouse2, friend2Active);
  }

  updateAllUserStatus();
}


  // Aggiorna tutti gli stati active/inactive
  function updateAllUserStatus() {
    const now = Date.now();
    const inactiveThreshold = 30000; // 30 secondi
    
    // Tu sei sempre considerato active se l'app è in esecuzione
    updateSingleStatus('you', true);
    
    // Amici sono active solo se hanno aggiornato di recente
    const friendActive = (now - friendLastUpdate) < inactiveThreshold;
    const friend2Active = (now - friend2LastUpdate) < inactiveThreshold;
    
    updateSingleStatus('friend', friendActive);
    updateSingleStatus('friend2', friend2Active);
  }

  // Aggiorna lo stato di un singolo utente
  function updateSingleStatus(user, isActive) {
    const statusElement = document.getElementById(`${user}-status`);
    if (statusElement) {
      statusElement.textContent = isActive ? 'active' : 'inactive';
      statusElement.className = `user-state ${isActive ? 'active' : 'inactive'}`;
    }
  }

  // Crea il grafico radar con guide e linee radiali
  function createRadarChart() {
    const container = document.querySelector('.wrap');
    if (container.querySelector('.radar-container')) return;  
    
    const radarContainer = document.createElement('div');
    radarContainer.className = 'radar-container';
    
    // Crea la griglia del radar con cerchi concentrici
    const radarGrid = document.createElement('div');
    radarGrid.className = 'radar-grid';
    
    // Cerchi concentrici (ogni 20%)
    const concentricCircles = document.createElement('div');
    concentricCircles.className = 'concentric-circles';
    
    // Aggiungi i cerchi per 80%, 60%, 40%, 20%
    const percentages = [80, 60, 40, 20];
    percentages.forEach(percent => {
      const circle = document.createElement('div');
      circle.className = `concentric-circle-${percent}`;
      concentricCircles.appendChild(circle);
    });
    
    radarGrid.appendChild(concentricCircles);
    
    // Etichette degli assi
    const labels = [
      { class: 'cpu', text: '', top: '5%', left: '50%' },
      { class: 'ram', text: '', top: '25%', left: '90%' },
      { class: 'battery', text: '', top: '75%', left: '90%' },
      { class: 'uptime', text: '', top: '95%', left: '50%' },
      { class: 'mousex', text: '', top: '75%', left: '10%' },
      { class: 'mousey', text: '', top: '25%', left: '10%' }
    ];
    
    labels.forEach(label => {
      const labelElement = document.createElement('div');
      labelElement.className = `axis-label ${label.class}`;
      labelElement.textContent = label.text;
      labelElement.style.top = label.top;
      labelElement.style.left = label.left;
      radarGrid.appendChild(labelElement);
    });
    
    // Aggiungi i cerchiolini sugli estremi degli assi - POSIZIONI ESATTE
    const centerX = 50; // 50% del container
    const centerY = 50; // 50% del container
    const radius = 45;  // 45% (90px su 200px viewBox = 45% del container)
    
    const endpoints = [
  { class: 'endpoint-cpu',    axis: 'cpu',    angle: 0 },
  { class: 'endpoint-ram',    axis: 'ram',    angle: 60 },
  { class: 'endpoint-battery',axis: 'battery',angle: 120 },
  { class: 'endpoint-uptime', axis: 'uptime', angle: 180 },
  { class: 'endpoint-mousex', axis: 'mousex', angle: 240 },
  { class: 'endpoint-mousey', axis: 'mousey', angle: 300 }
];

    endpoints.forEach(endpoint => {
  const point = calculatePercentagePoint(centerX, centerY, radius, endpoint.angle);

  const endpointElement = document.createElement('div');
  endpointElement.className = `axis-endpoint ${endpoint.class}`;
  endpointElement.style.top = `${point.y}%`;
  endpointElement.style.left = `${point.x}%`;

  // === LISTENER HOVER ===
  endpointElement.addEventListener('mouseenter', () => {
    hoveredAxis = endpoint.axis;
    draw();
  });
  endpointElement.addEventListener('mouseleave', () => {
    hoveredAxis = null;
    draw();
  });

  radarGrid.appendChild(endpointElement);
});

    // Crea solo i poligoni SVG
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.setAttribute('viewBox', '0 0 200 200');
    svg.style.position = 'absolute';
    svg.style.top = '0';
    svg.style.left = '0';
    svg.style.pointerEvents = 'none';
    
    const initialPoints = '100,100 100,100 100,100 100,100 100,100 100,100';
    
    const youPolygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    youPolygon.id = 'you-polygon';
    youPolygon.setAttribute('points', initialPoints);
    youPolygon.setAttribute('fill', 'transparent');
    youPolygon.setAttribute('stroke', 'rgba(255, 50, 50, 0.8)');
    youPolygon.setAttribute('stroke-width', '1.5');
    
    const friendPolygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    friendPolygon.id = 'friend-polygon';
    friendPolygon.setAttribute('points', initialPoints);
    friendPolygon.setAttribute('fill', 'transparent');
    friendPolygon.setAttribute('stroke', 'rgba(50, 150, 255, 0.8)');
    friendPolygon.setAttribute('stroke-width', '1.5');
    
    const friend2Polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    friend2Polygon.id = 'friend2-polygon';
    friend2Polygon.setAttribute('points', initialPoints);
    friend2Polygon.setAttribute('fill', 'transparent');
    friend2Polygon.setAttribute('stroke', 'rgba(50, 255, 150, 0.8)');
    friend2Polygon.setAttribute('stroke-width', '1.5');
    
    svg.appendChild(youPolygon);
    svg.appendChild(friendPolygon);
    svg.appendChild(friend2Polygon);

    // === DOTS (puntini visibili solo in hover) ===
const dotYou = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
dotYou.id = 'dot-you';
dotYou.setAttribute('r', '2.6');
dotYou.setAttribute('fill', 'rgba(255, 50, 50, 1)');
dotYou.style.display = 'none';
svg.appendChild(dotYou);

const dotFriend = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
dotFriend.id = 'dot-friend';
dotFriend.setAttribute('r', '2.6');
dotFriend.setAttribute('fill', 'rgba(50, 150, 255, 0.9)');
dotFriend.style.display = 'none';
svg.appendChild(dotFriend);

const dotFriend2 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
dotFriend2.id = 'dot-friend2';
dotFriend2.setAttribute('r', '2.6');
dotFriend2.setAttribute('fill', 'rgba(50, 255, 150, 0.9)');
dotFriend2.style.display = 'none';
svg.appendChild(dotFriend2);

// === LABEL (in alto a sinistra) ===
const hoverLabel = document.createElement('div');
hoverLabel.id = 'hover-label';
hoverLabel.textContent = '';
hoverLabel.style.position = 'absolute';
hoverLabel.style.top = '6px';
hoverLabel.style.left = '8px';
hoverLabel.style.fontFamily = 'monospace';
hoverLabel.style.fontSize = '10.5px';
hoverLabel.style.lineHeight = '1';
hoverLabel.style.color = 'var(--text-color)';
hoverLabel.style.pointerEvents = 'none';
hoverLabel.style.display = 'none';
radarContainer.appendChild(hoverLabel);

    
    radarContainer.appendChild(svg);       // metti lo SVG sotto
radarContainer.appendChild(radarGrid); // e la griglia (con i pallini) sopra


    container.appendChild(radarContainer);
  }

  function enableHoverListeners() {
  const endpoints = document.querySelectorAll('.axis-endpoint');
  if (!endpoints.length) {
    console.warn('Nessun endpoint trovato per hover.');
    return;
  }

  endpoints.forEach(el => {
    const axis = el.classList[1].replace('endpoint-', '');

    el.addEventListener('mouseenter', () => {
      hoveredAxis = axis;
      draw();
    });

    el.addEventListener('mouseleave', () => {
      hoveredAxis = null;
      draw();
    });
  });

  console.log('Hover listeners attivati su', endpoints.length, 'punti');
}


  

  // Funzione helper per calcolare le posizioni in percentuale
  function calculatePercentagePoint(centerX, centerY, radius, angleDeg) {
    const angleRad = (angleDeg - 90) * Math.PI / 180; // -90 per iniziare dall'alto
    const x = centerX + radius * Math.cos(angleRad);
    const y = centerY + radius * Math.sin(angleRad);
    return { x, y };
  }

  // Aggiorna un poligono radar con i dati specifici
  // Aggiorna un poligono radar con i dati specifici
function updateRadarPolygon(user, cpu, ram, battery, uptime, mouse, isActive) {
  const polygon = document.getElementById(`${user}-polygon`);
  if (!polygon) {
    console.log(`Polygon not found for user: ${user}`);
    return;
  }
  
  // Imposta l'opacità in base allo stato
  const opacity = isActive ? 0.8 : 0.2;
  
  // Normalizza i valori (0-100%)
  const normalizedCpu = Math.min(Math.max(parseFloat(cpu) || 0, 0), 100);
  const normalizedRam = Math.min(Math.max(parseFloat(ram) || 0, 0), 100);
  const normalizedBattery = Math.min(Math.max(parseFloat(battery) || 0, 0), 100);
  
  // Normalizza uptime (0-200 ore = 0-100%)
  const maxUptimeHours = 200;
  const maxUptimeSeconds = maxUptimeHours * 3600;
  const normalizedUptime = Math.min(Math.max((parseFloat(uptime) || 0) / maxUptimeSeconds * 100, 0), 100);
  
  // CORREZIONE: Usa le dimensioni reali dello schermo invece di valori fissi
  const normalizedMouseX = Math.min(Math.max((parseFloat(mouse.x) || 0) / screenWidth * 100, 0), 100);
  const normalizedMouseY = Math.min(Math.max((parseFloat(mouse.y) || 0) / screenHeight * 100, 0), 100);
  
  // Calcola i punti del poligono (centro a 100,100, raggio massimo 90)
  const centerX = 100;
  const centerY = 100;
  const maxRadius = 90;
  
  // Assi: 0°=CPU, 60°=RAM, 120°=Battery, 180°=Uptime, 240°=MouseX, 300°=MouseY
  const points = [
    calculatePoint(centerX, centerY, maxRadius * normalizedCpu / 100, 0),
    calculatePoint(centerX, centerY, maxRadius * normalizedRam / 100, 60),
    calculatePoint(centerX, centerY, maxRadius * normalizedBattery / 100, 120),
    calculatePoint(centerX, centerY, maxRadius * normalizedUptime / 100, 180),
    calculatePoint(centerX, centerY, maxRadius * normalizedMouseX / 100, 240),
    calculatePoint(centerX, centerY, maxRadius * normalizedMouseY / 100, 300)
  ];
  
  // Aggiorna i punti del poligono e l'opacità
  polygon.setAttribute('points', points.join(' '));
  polygon.style.opacity = opacity;
  
  // Aggiorna anche il colore del bordo per mantenere la consistenza
  if (user === 'you') {
    polygon.setAttribute('stroke', `rgba(255, 50, 50, ${opacity})`);
  } else if (user === 'friend') {
    polygon.setAttribute('stroke', `rgba(50, 150, 255, ${opacity})`);
  } else if (user === 'friend2') {
    polygon.setAttribute('stroke', `rgba(50, 255, 150, ${opacity})`);
  }
}

  // Calcola le coordinate di un punto dato angolo e raggio
  function calculatePoint(centerX, centerY, radius, angleDeg) {
    const angleRad = (angleDeg - 90) * Math.PI / 180; // -90 per iniziare dall'alto
    const x = centerX + radius * Math.cos(angleRad);
    const y = centerY + radius * Math.sin(angleRad);
    return `${x},${y}`;
  }

  // same clamp used implicitly in updateRadarPolygon
function clamp01to100(v) {
  v = isNaN(v) ? 0 : v;
  if (v < 0) return 0;
  if (v > 100) return 100;
  return v;
}

// Use the SAME normalization logic used in updateRadarPolygon()
function getNormalizedByAxis(axis, data) {
  // data = { cpuLoad, ram, battery, uptime, mouse:{x,y} }
  const maxUptimeHours = 200;
  const maxUptimeSeconds = maxUptimeHours * 3600;

  switch (axis) {
    case 'cpu':
      return clamp01to100(parseFloat(data.cpuLoad) || 0);

    case 'ram':
      return clamp01to100(parseFloat(data.ram) || 0);

    case 'battery':
      return clamp01to100(parseFloat(data.battery) || 0);

    case 'uptime': {
      const u = parseFloat(data.uptime) || 0;
      return clamp01to100((u / maxUptimeSeconds) * 100);
    }

    case 'mousex': {
      const x = parseFloat((data.mouse && data.mouse.x) || 0);
      // NOTE: same normalization used in updateRadarPolygon()
      return clamp01to100((x / screenWidth) * 100);
    }

    case 'mousey': {
      const y = parseFloat((data.mouse && data.mouse.y) || 0);
      return clamp01to100((y / screenHeight) * 100);
    }

    default:
      return 0;
  }
}


  // Salva dati periodicamente
  setInterval(saveData, 250);
})();