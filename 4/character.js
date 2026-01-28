class KernelFragment {
  constructor() {
    this.gridSize = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--grid-size'));
    this.characterWidth = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--character-width'));
    this.characterHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--character-height'));
    
    this.container = document.getElementById('grid-container');
    this.character = null;
    this.exclamation = null;
    
    this.currentState = 'idle';
    this.currentPosition = { x: 0, y: 0 };
    this.direction = 'right';
    
    this.color = 'blue';
    this.cpuThreshold = 0; // Personaggio base = 0 CPU
    this.colorFilters = {
      blue: 'hue-rotate(0deg) brightness(1.2) saturate(1.5)',
      red: 'hue-rotate(180deg) brightness(6) saturate(2) contrast(2)',
      green: 'hue-rotate(90deg) brightness(5) saturate(2)',
      yellow: 'hue-rotate(50deg) brightness(1.8) saturate(2)',
      purple: 'hue-rotate(270deg) brightness(1.5) saturate(2)'
    };
    
    // MODIFICA: Stati con nomi file specifici per CPU threshold
    this.states = {
      idle: ['fermo1.png', 'fermo2.png'],
      running: ['corsa1.png', 'corsa2.png', 'corsa3.png', 'corsa4.png'],
      spawn: ['spawn1.png', 'spawn2.png', 'spawn3.png', 'spawn4.png', 'spawn5.png', 'spawn6.png', 'spawn7.png']
    };
    
    this.currentFrame = 0;
    this.animationInterval = null;
    
    this.speedMultiplier = 1.4;
    this.frameTime = 150 / this.speedMultiplier;
    
    this.footprintPixels = [];
    
    this.behaviorCycle = null;
    this.handDetector = null;
    this.audioDetector = null;
    this.keyboardDetector = null;
    
    this.isActive = true;
    this.isColliding = false;
    this.collisionTarget = null;
    this.isRunningFromCollision = false;
    
    // Ottimizzazione: throttling impronte
    this.lastFootprintTime = 0;
    this.footprintThrottle = 30; // ms tra una creazione e l'altra
    
    // MODIFICA: Aggiunti suoni
    this.sounds = {
      step: null,
      spawn: null,
      alt: null,
      despawn: null
    };
    
    this.init();
  }

  init() {
    this.createGrid();
    this.createCharacter();
    this.createExclamation();
    this.loadSounds();
    this.startSpawnAnimation();
  }

  createGrid() {
    const containerWidth = this.container.clientWidth;
    const containerHeight = this.container.clientHeight;
    const cols = Math.ceil(containerWidth / this.gridSize);
    const rows = Math.ceil(containerHeight / this.gridSize);

    for (let i = 0; i < rows * cols; i++) {
      const cell = document.createElement('div');
      cell.className = 'grid-cell';
      this.container.appendChild(cell);
    }
  }

  loadSounds() {
    // Carica i suoni
    this.sounds.step = new Audio('assets/step.mp3');
    this.sounds.step.volume = 0.03; // RIDOTTO: da 0.05 a 0.03 (meno volume)
    this.sounds.step.preload = 'auto';
    
    this.sounds.spawn = new Audio('assets/spawn.wav');
    this.sounds.spawn.volume = 0.1; // RIDOTTO: da 0.15 a 0.1 (meno volume)
    this.sounds.spawn.preload = 'auto';
    
    this.sounds.alt = new Audio('assets/alt.wav');
    this.sounds.alt.volume = 0.1; // RIDOTTO: da 0.15 a 0.1 (meno volume)
    this.sounds.alt.preload = 'auto';
    
    this.sounds.despawn = new Audio('assets/spawn.wav');
    this.sounds.despawn.volume = 0.1; // RIDOTTO: da 0.15 a 0.1 (meno volume)
    this.sounds.despawn.preload = 'auto';
  }

  playSound(soundName, playbackRate = 1.0) {
    try {
      if (!this.sounds[soundName]) return null;
      
      const soundClone = this.sounds[soundName].cloneNode();
      soundClone.volume = this.sounds[soundName].volume;
      
      // MODIFICA: Limitare il playbackRate per evitare suoni troppo distorti
      soundClone.playbackRate = Math.max(0.6, Math.min(1.5, playbackRate));
      
      // MODIFICA: Controllo sovrapposizione - se troppi suoni, skippa
      if (soundName === 'step') {
        // Per i suoni dei passi, controlla se ce ne sono già troppi attivi
        if (window.activeStepSounds && window.activeStepSounds > 3) {
          return null; // Troppi suoni di passo attivi, skippa
        }
      }
      
      soundClone.play().catch(e => {
        console.log(`${soundName} sound play error:`, e);
      });
      
      // MODIFICA: Traccia suoni attivi per i passi
      if (soundName === 'step') {
        if (!window.activeStepSounds) window.activeStepSounds = 0;
        window.activeStepSounds++;
        
        // Quando il suono finisce, decrementa il contatore
        soundClone.onended = () => {
          if (window.activeStepSounds > 0) window.activeStepSounds--;
        };
      }
      
      return soundClone;
    } catch (error) {
      console.log(`${soundName} sound error:`, error);
      return null;
    }
  }

  createCharacter() {
    this.character = document.createElement('img');
    this.character.className = 'character additional-character';
    
    // MODIFICA QUI: Usa la sprite base per il personaggio principale
    this.character.src = 'assets/corsa1.png';
    
    // MODIFICA QUI: usa il filtro CSS per il colore corretto
    if (this.color && this.colorFilters[this.color]) {
        this.character.style.filter = this.colorFilters[this.color];
    } else {
        // Fallback se il colore non è valido
        console.warn(`⚠️ Colore ${this.color} non trovato, usando blue come default`);
        this.character.style.filter = this.colorFilters['blue'];
    }
    
    this.container.appendChild(this.character);
  }

  createExclamation() {
    this.exclamation = document.createElement('img');
    this.exclamation.className = 'exclamation';
    
    // MODIFICA QUI: Usa la sprite base per l'esclamazione
    this.exclamation.src = 'assets/alt2.png';
    
    this.exclamation.style.display = 'none';
    this.exclamation.style.position = 'absolute';
    this.exclamation.style.zIndex = '1001';
    this.exclamation.style.imageRendering = 'pixelated';
    this.exclamation.style.width = `${this.gridSize}px`;
    this.exclamation.style.height = `${this.gridSize * 6}px`;
    this.exclamation.style.filter = this.colorFilters[this.color];
    
    this.container.appendChild(this.exclamation);
    this.updateExclamationPosition();
  }

  // MODIFICA: Nuovo metodo per ottenere il nome file corretto in base alla soglia CPU
  getSpriteName(baseName) {
    if (this.cpuThreshold === 0) {
      return `assets/${baseName}`; // Personaggio base usa sprite normali
    } else {
      // Personaggi aggiuntivi usano sprite con suffisso CPU
      return `assets/${baseName.replace('.png', '')}-${this.cpuThreshold}cpu.png`;
    }
  }

  async startSpawnAnimation() {
    console.log("🎬 Inizio animazione di spawn...");
    
    const spawnFrames = this.states.spawn;
    
    for (let i = 0; i < spawnFrames.length; i++) {
      // MODIFICA: Usa getSpriteName per ottenere la sprite corretta
      this.character.src = this.getSpriteName(spawnFrames[i]);
      
      // MODIFICA: Riproduci suono spawn per ogni frame
      this.playSound('spawn', 1.5 - (i * 0.1)); // Leggermente più veloce ad ogni frame
      
      await this.delay(this.frameTime);
    }
    
    // MODIFICA: Alla fine usa fermo1.png
    this.character.src = this.getSpriteName('fermo1.png');
    console.log("✅ Animazione di spawn completata, avvio behavior cycle...");
    
    this.startBehaviorCycle();
  }

  removePixelsNearPosition(clientX, clientY, radius = 3) {
    const gridX = Math.floor(clientX / this.gridSize);
    const gridY = Math.floor(clientY / this.gridSize);
    
    if (this.handDetector && this.handDetector.removePixelsNearPosition) {
        return this.handDetector.removePixelsNearPosition(gridX, gridY, radius);
    }
    
    return 0;
  }

  placeFootprintPixel(currentFrame) {
    if (currentFrame === 'corsa1.png' || currentFrame === 'corsa3.png') {
      // Throttling: controlla se è passato abbastanza tempo
      const now = Date.now();
      if (now - this.lastFootprintTime < this.footprintThrottle) {
        return; // Skip questa impronta
      }
      this.lastFootprintTime = now;
      
      const footprintMultiplier = this.audioDetector ? this.audioDetector.getFootprintMultiplier() : 1;
      
      if (footprintMultiplier === 1) {
        this.placeStandardFootprint(currentFrame);
      } else {
        this.placeVolumeBasedFootprints(currentFrame, footprintMultiplier);
      }
    }
  }

  placeStandardFootprint(currentFrame) {
    let pixelOffsetX, pixelOffsetY;
    
    if (currentFrame === 'corsa1.png') {
      pixelOffsetX = 4;
      pixelOffsetY = 10;
    } else {
      pixelOffsetX = 10;
      pixelOffsetY = 10;
    }
    
    if (this.direction === 'left') {
      pixelOffsetX = (this.characterWidth - 1) - pixelOffsetX;
    }
    
    const absoluteX = this.currentPosition.x + pixelOffsetX;
    const absoluteY = this.currentPosition.y + pixelOffsetY;
    
    if (this.isValidPositionForPixel(absoluteX, absoluteY)) {
      this.createFootprintPixel(absoluteX, absoluteY);
    }
  }

  placeVolumeBasedFootprints(currentFrame, multiplier) {
    const baseOffsets = this.getFootprintOffsets(currentFrame);
    
    // Ottimizzazione: limita il numero massimo di impronte
    const maxPixels = Math.min(multiplier * 3, 15); // max 15 pixel per volta
    let pixelsPlaced = 0;
    
    baseOffsets.forEach(baseOffset => {
      const areaSize = Math.floor(Math.sqrt(multiplier)) + 1;
      
      for (let dx = -areaSize; dx <= areaSize; dx++) {
        for (let dy = -areaSize; dy <= areaY; dy++) {
          if (pixelsPlaced >= maxPixels) return; // Stop se raggiunti max
          
          const distance = Math.sqrt(dx * dx + dy * dy);
          const placementChance = Math.max(0, 1 - (distance / areaSize));
          
          if (Math.random() < placementChance * 0.6) { // Ridotto da 0.8 a 0.6
            const absoluteX = this.currentPosition.x + baseOffset.x + dx;
            const absoluteY = this.currentPosition.y + baseOffset.y + dy;
            
            if (this.isValidPositionForPixel(absoluteX, absoluteY)) {
              this.createFootprintPixel(absoluteX, absoluteY);
              pixelsPlaced++;
            }
          }
        }
      }
    });
  }

  getFootprintOffsets(currentFrame) {
    const offsets = [];
    
    if (currentFrame === 'corsa1.png') {
      offsets.push({ x: 4, y: 10 });
      offsets.push({ x: 10, y: 10 });
    } else {
      offsets.push({ x: 10, y: 10 });
      offsets.push({ x: 4, y: 10 });
    }
    
    return offsets.map(offset => {
      if (this.direction === 'left') {
        return { 
          x: (this.characterWidth - 1) - offset.x, 
          y: offset.y 
        };
      }
      return offset;
    });
  }

  isValidPositionForPixel(x, y) {
    const extendedMaxX = Math.floor(this.container.clientWidth / this.gridSize) + 5;
    const extendedMaxY = Math.floor(this.container.clientHeight / this.gridSize) + 5;
    
    return x >= -5 && x <= extendedMaxX && y >= -5 && y <= extendedMaxY;
  }

  createFootprintPixel(x, y) {
    const pixelElement = document.createElement('img');
    pixelElement.className = 'footprint-pixel';
    pixelElement.src = 'assets/pixel.png'; // MODIFICA: SEMPRE pixel.png normale per tutti
    pixelElement.style.position = 'absolute';
    pixelElement.style.left = `${x * this.gridSize}px`;
    pixelElement.style.top = `${y * this.gridSize}px`;
    pixelElement.style.width = `${this.gridSize}px`;
    pixelElement.style.height = `${this.gridSize}px`;
    pixelElement.style.zIndex = '500';
    pixelElement.style.imageRendering = 'pixelated';
    pixelElement.style.pointerEvents = 'none';
    pixelElement.style.opacity = '1';
    pixelElement.style.transition = 'opacity 0.3s ease';
    pixelElement.style.filter = this.colorFilters[this.color];
    
    this.container.appendChild(pixelElement);
    
    this.footprintPixels.push({
      element: pixelElement,
      x: x,
      y: y,
      color: this.color
    });
  }

  showExclamation() {
    if (this.exclamation) {
      this.updateExclamationPosition();
      this.exclamation.style.display = 'block';
    }
  }

  hideExclamation() {
    if (this.exclamation) {
      this.exclamation.style.display = 'none';
    }
  }

  updateExclamationPosition() {
    if (this.exclamation) {
      const characterCenterX = this.currentPosition.x * this.gridSize + (this.characterWidth * this.gridSize) / 2;
      const exclamationX = characterCenterX - (this.gridSize / 2);
      const exclamationY = this.currentPosition.y * this.gridSize - (this.gridSize * 3);
      
      this.exclamation.style.left = `${exclamationX}px`;
      this.exclamation.style.top = `${exclamationY}px`;
    }
  }

  startBehaviorCycle() {
    this.behaviorCycle = new BehaviorCycle(this);
    this.startAudioDetection();
    this.startKeyboardDetection();
  }

  startKeyboardDetection() {
    console.log("⌨️ Avvio keyboard detection...");
    this.keyboardDetector = new KeyboardDetector(this);
  }

  stopKeyboardDetection() {
    if (this.keyboardDetector) {
        this.keyboardDetector.stop();
        this.keyboardDetector = null;
    }
  }

  startAudioDetection() {
    console.log("🎤 Avvio audio detection...");
    this.audioDetector = new AudioDetector(this);
    this.startHandDetection();
  }

  startHandDetection() {
    console.log("🖐️ Avvio hand detection...");
    this.handDetector = new HandDetector(this);
  }

  stopAudioDetection() {
    if (this.audioDetector) {
      this.audioDetector.stop();
      this.audioDetector = null;
    }
  }

  stopHandDetection() {
    if (this.handDetector) {
      this.handDetector.stop();
      this.handDetector = null;
    }
  }

  randomizePosition() {
    const maxX = this.getMaxX();
    const maxY = this.getMaxY();
    const minX = this.getMinX();
    const minY = this.getMinY();
    
    this.currentPosition = {
      x: Math.floor(Math.random() * (maxX - minX + 1)) + minX,
      y: Math.floor(Math.random() * (maxY - minY + 1)) + minY
    };
    
    this.updateCharacterPosition();
  }

  updateCharacterPosition() {
    this.character.style.transition = 'none';
    this.character.style.left = `${this.currentPosition.x * this.gridSize}px`;
    this.character.style.top = `${this.currentPosition.y * this.gridSize}px`;
    
    if (this.direction === 'left') {
      this.character.style.transform = 'scaleX(-1)';
    } else {
      this.character.style.transform = 'scaleX(1)';
    }

    this.updateExclamationPosition();
  }

  // MODIFICA QUI: Permetti movimento fino ai bordi dello schermo
  getMaxX() {
    const totalCols = Math.floor(this.container.clientWidth / this.gridSize);
    // Permette di arrivare fino al bordo destro, considerando la larghezza del personaggio
    return totalCols - this.characterWidth;
  }

  getMaxY() {
    const totalRows = Math.floor(this.container.clientHeight / this.gridSize);
    // Permette di arrivare fino al bordo inferiore, considerando l'altezza del personaggio
    return totalRows - this.characterHeight;
  }

  getMinX() {
    // Permette di partire dal bordo sinistro (x = 0)
    return 0;
  }

  getMinY() {
    // Permette di partire dal bordo superiore (y = 0)
    return 0;
  }

  isValidPositionForEscape(x, y) {
    const escapeMargin = 20;
    const totalCols = Math.floor(this.container.clientWidth / this.gridSize);
    const totalRows = Math.floor(this.container.clientHeight / this.gridSize);
    
    return x >= -escapeMargin && 
           x <= totalCols + escapeMargin && 
           y >= -escapeMargin && 
           y <= totalRows + escapeMargin;
  }

  // MODIFICA QUI: Permette movimento fino ai bordi per il comportamento normale
  isValidPosition(x, y, isPixelCheck = false) {
    if (isPixelCheck) {
      return this.isValidPositionForPixel(x, y);
    } else {
      // Per il movimento normale, permette di andare fino ai bordi dello schermo
      const totalCols = Math.floor(this.container.clientWidth / this.gridSize);
      const totalRows = Math.floor(this.container.clientHeight / this.gridSize);
      
      // Il personaggio può andare da x=0 a x=totalCols-characterWidth
      // e da y=0 a y=totalRows-characterHeight
      return x >= 0 && 
             x <= totalCols - this.characterWidth && 
             y >= 0 && 
             y <= totalRows - this.characterHeight;
    }
  }

  checkCollisionWithOtherCharacters(x, y, checkDuringEntry = false) {
    const checkRadius = 8; // Ridotto per permettere un po' di vicinanza
    
    // Controlla con personaggi aggiuntivi
    if (window.additionalCharacters) {
      for (const otherChar of window.additionalCharacters) {
        if (otherChar === this || !otherChar.isActive || 
            (otherChar.isEntering && !checkDuringEntry)) continue;
        
        const otherX = otherChar.currentPosition.x;
        const otherY = otherChar.currentPosition.y;
        
        const distanceX = Math.abs(x - otherX);
        const distanceY = Math.abs(y - otherY);
        
        if (distanceX <= checkRadius && distanceY <= checkRadius) {
          return { 
            collided: true, 
            character: otherChar,
            distanceX: distanceX,
            distanceY: distanceY
          };
        }
      }
    }
    
    return { collided: false, character: null };
  }

  stopMovement() {
    if (this.animationInterval) {
      clearInterval(this.animationInterval);
      this.animationInterval = null;
    }
    
    this.currentState = 'idle';
  }

  async playIdleAnimation() {
    return new Promise((resolve) => {
      const frames = this.states.idle;
      const maxCycles = Math.floor(Math.random() * 5) + 1;
      let cycleCount = 0;
      let frameIndex = 0;
      
      const animate = () => {
        // MODIFICA: Usa getSpriteName per ottenere la sprite corretta
        this.character.src = this.getSpriteName(frames[frameIndex]);
        frameIndex = (frameIndex + 1) % frames.length;
        
        if (frameIndex === 0) {
          cycleCount++;
          if (cycleCount >= maxCycles) {
            resolve();
            return;
          }
        }
        
        setTimeout(animate, this.frameTime);
      };
      
      animate();
    });
  }

  startAnimation(state, onComplete = null) {
    if (this.animationInterval) {
      clearInterval(this.animationInterval);
      this.animationInterval = null;
    }

    const frames = this.states[state];
    if (!frames) return;

    this.currentFrame = 0;

    if (state === 'idle') {
      this.playIdleAnimation().then(() => {
        if (onComplete) onComplete();
      });
      
    } else if (state === 'running') {
      // MODIFICA: Usa getSpriteName per ottenere la sprite corretta
      this.character.src = this.getSpriteName(frames[0]);
      if (onComplete) onComplete();
    }
  }

  async handleCollision(otherCharacter) {
    if (this.isColliding || this.isRunningFromCollision) return;
    
    console.log(`💥 ${this.color} - Collisione con ${otherCharacter.color}!`);
    
    this.isColliding = true;
    this.collisionTarget = otherCharacter;
    
    // Animazione alt1-alt2 per 2 volte
    for (let i = 0; i < 2; i++) {
      // MODIFICA: Usa getSpriteName per ottenere la sprite corretta
      this.character.src = this.getSpriteName('fermo1.png');
      this.hideExclamation();
      await this.delay(this.frameTime);
      
      // MODIFICA: Usa getSpriteName per ottenere la sprite corretta
      this.character.src = this.getSpriteName('alt1.png');
      this.showExclamation();
      // MODIFICA: Riproduci suono alt durante l'animazione
      this.playSound('alt', 1.0);
      await this.delay(this.frameTime);
    }
    
    // MODIFICA: Usa getSpriteName per ottenere la sprite corretta
    this.character.src = this.getSpriteName('fermo1.png');
    this.hideExclamation();
    this.isColliding = false;
    
    // Calcola punto opposto nella griglia
    const targetPoint = this.calculateOppositeRunPoint(otherCharacter);
    
    // Inizia la corsa verso il punto
    await this.runFromCollisionToPoint(targetPoint);
  }

  calculateOppositeRunPoint(otherCharacter) {
    const currentX = this.currentPosition.x;
    const currentY = this.currentPosition.y;
    const otherX = otherCharacter.currentPosition.x;
    const otherY = otherCharacter.currentPosition.y;
    
    const minX = this.getMinX();
    const maxX = this.getMaxX();
    const minY = this.getMinY();
    const maxY = this.getMaxY();
    
    // Calcola direzione opposta rispetto all'altro personaggio
    const dx = currentX - otherX;
    const dy = currentY - otherY;
    
    let targetX, targetY;
    
    if (Math.abs(dx) > Math.abs(dy)) {
      // Più spostamento orizzontale
      if (dx > 0) {
        // L'altro è a sinistra, vado a destra
        targetX = maxX - 5;
      } else {
        // L'altro è a destra, vado a sinistra
        targetX = minX + 5;
      }
      targetY = Math.floor(Math.random() * (maxY - minY - 10)) + minY + 5;
    } else {
      // Più spostamento verticale
      if (dy > 0) {
        // L'altro è sopra, vado sotto
        targetY = maxY - 5;
      } else {
        // L'altro è sotto, vado sopra
        targetY = minY + 5;
      }
      targetX = Math.floor(Math.random() * (maxX - minX - 10)) + minX + 5;
    }
    
    return { x: targetX, y: targetY };
  }

  async runFromCollisionToPoint(targetPoint) {
    console.log(`🏃 ${this.color} - Corro via dalla collisione verso`, targetPoint);
    
    this.isRunningFromCollision = true;
    this.currentState = 'moving';
    
    const entrySpeed = 2.5;
    let reachedTarget = false;
    
    while (this.isActive && !reachedTarget && this.isRunningFromCollision) {
      const dx = targetPoint.x - this.currentPosition.x;
      const dy = targetPoint.y - this.currentPosition.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < 2) {
        reachedTarget = true;
        break;
      }
      
      let moveX = 0;
      let moveY = 0;
      
      if (Math.abs(dx) > Math.abs(dy)) {
        moveX = dx > 0 ? 1 : -1;
        if (Math.random() < 0.3) {
          moveY = Math.random() < 0.5 ? 1 : -1;
        }
      } else {
        moveY = dy > 0 ? 1 : -1;
        if (Math.random() < 0.3) {
          moveX = Math.random() < 0.5 ? 1 : -1;
        }
      }
      
      if (moveX > 0) this.direction = 'right';
      if (moveX < 0) this.direction = 'left';
      
      const nextX = this.currentPosition.x + moveX;
      const nextY = this.currentPosition.y + moveY;
      
      // Controlla collisioni durante la fuga
      const collisionCheck = this.checkCollisionWithOtherCharacters(nextX, nextY, true);
      if (collisionCheck.collided) {
        console.log(`💥 ${this.color} - Nuova collisione durante la fuga!`);
        this.isRunningFromCollision = false;
        await this.handleCollision(collisionCheck.character);
        return; // Uscita, handleCollision gestirà la nuova fuga
      }
      
      if (this.isValidPositionForEscape(nextX, nextY)) {
        this.currentPosition.x = nextX;
        this.currentPosition.y = nextY;
        this.updateCharacterPosition();
        
        // MODIFICA: Riproduci suono del passo SOLO se sta correndo
        if (this.behaviorCycle) {
          this.behaviorCycle.playStepSound(entrySpeed);
        }
        
        // Animazione corsa
        const frames = this.states.running;
        const frameIndex = Math.floor(Date.now() / 100) % frames.length;
        const currentFrame = frames[frameIndex];
        
        // MODIFICA: Usa getSpriteName per ottenere la sprite corretta
        this.character.src = this.getSpriteName(currentFrame);
        
        this.placeFootprintPixel(currentFrame);
      }
      
      await this.delay(this.frameTime / entrySpeed);
    }
    
    if (reachedTarget) {
      console.log(`✅ ${this.color} - Raggiunto punto sicuro dopo collisione`);
    }
    
    this.isRunningFromCollision = false;
  }

  glitch() {
    this.character.classList.add('glitching');
    setTimeout(() => {
      this.character.classList.remove('glitching');
    }, 300 / this.speedMultiplier);
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  destroy() {
    this.isActive = false;
    this.isRunningFromCollision = false;
    this.isColliding = false;
    
    if (this.behaviorCycle) {
      this.behaviorCycle.stop();
      this.behaviorCycle = null;
    }
    
    if (this.character && this.character.parentNode) {
      this.character.parentNode.removeChild(this.character);
    }
    
    if (this.exclamation && this.exclamation.parentNode) {
      this.exclamation.parentNode.removeChild(this.exclamation);
    }
    
    this.footprintPixels.forEach(pixel => {
      if (pixel.element && pixel.element.parentNode) {
        pixel.element.parentNode.removeChild(pixel.element);
      }
    });
    this.footprintPixels = [];
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.kernelFragment = new KernelFragment();
});

window.addEventListener('resize', () => {
  location.reload();
});