class BehaviorCycle {
  constructor(kernelFragment) {
    this.kernel = kernelFragment;
    this.isActive = true;
    this.mouseTarget = null;
    this.lastMouseTime = 0;
    this.isRespondingToMouse = false;
    this.mousePosition = { x: 0, y: 0 };
    
    this.glitchChance = 0.03;
    this.isGlitching = false;
    this.glitchCounter = 0;
    this.glitchDirection = null;
    this.glitchStartPosition = null;
    
    this.speedMultiplier = 1.4;
    this.frameTime = 150 / this.speedMultiplier;
    
    this.directionChangeCounter = 0;
    this.maxStepsBeforeChange = 15;
    
    this.escapeDistance = 15;
    this.escapeSpeedMultiplier = 2.2;
    this.isEscaping = false;
    this.escapeSteps = 0;
    this.maxEscapeSteps = 25;
    
    this.isReturningToGrid = false;
    
    // MODIFICA: Rimossa inizializzazione audio step da qui
    // I suoni saranno gestiti dal kernel
    
    this.setupMouseTracking();
    this.setupHandTracking();
    this.startMainCycle();
  }

  setupMouseTracking() {
    document.addEventListener('mousemove', (e) => {
      this.mousePosition.x = e.clientX;
      this.mousePosition.y = e.clientY;
      
      const gridX = Math.floor(e.clientX / this.kernel.gridSize);
      const gridY = Math.floor(e.clientY / this.kernel.gridSize);
      
      const charCenterX = this.kernel.currentPosition.x + (this.kernel.characterWidth / 2);
      const charCenterY = this.kernel.currentPosition.y + (this.kernel.characterHeight / 2);
      
      const distance = Math.sqrt(
        Math.pow(gridX - charCenterX, 2) + 
        Math.pow(gridY - charCenterY, 2)
      );
      
      if (distance <= this.escapeDistance && !this.isRespondingToMouse && !this.isEscaping && !this.isReturningToGrid) {
        this.startEscapeBehavior();
      }
      
      if (this.isEscaping && distance > this.escapeDistance * 1.5) {
        this.stopEscapeBehavior();
      }
    });
  }

  setupHandTracking() {
    this.handCheckInterval = setInterval(() => {
      if (!this.kernel.handDetector || !this.kernel.handDetector.handPixels || this.kernel.handDetector.handPixels.length === 0) {
        return;
      }

      const charCenterX = this.kernel.currentPosition.x + (this.kernel.characterWidth / 2);
      const charCenterY = this.kernel.currentPosition.y + (this.kernel.characterHeight / 2);
      
      let minDistance = Infinity;
      let closestHandPixel = null;

      for (const handPixel of this.kernel.handDetector.handPixels) {
        const rect = handPixel.getBoundingClientRect();
        const handGridX = Math.floor((rect.left + rect.width / 2) / this.kernel.gridSize);
        const handGridY = Math.floor((rect.top + rect.height / 2) / this.kernel.gridSize);
        
        const distance = Math.sqrt(
          Math.pow(handGridX - charCenterX, 2) + 
          Math.pow(handGridY - charCenterY, 2)
        );
        
        if (distance < minDistance) {
          minDistance = distance;
          closestHandPixel = { x: handGridX, y: handGridY };
        }
      }

      if (minDistance <= this.escapeDistance && closestHandPixel && !this.isRespondingToMouse && !this.isEscaping && !this.isReturningToGrid) {
        this.startEscapeFromHand(closestHandPixel);
      }
    }, 100);
  }

  async startEscapeFromHand(handPosition) {
    if (this.isRespondingToMouse || this.isEscaping || this.isReturningToGrid) return;
    
    console.log("🖐️ Mano vicina! Scappo!");
    this.isEscaping = true;
    this.isRespondingToMouse = true;
    this.escapeSteps = 0;
    
    this.kernel.stopMovement();
    
    for (let i = 0; i < 2; i++) {
      this.kernel.character.src = 'assets/fermo1.png';
      this.kernel.hideExclamation();
      await this.delay(this.frameTime);
      
      this.kernel.character.src = 'assets/alt1.png';
      this.kernel.showExclamation();
      // MODIFICA: Riproduci suono alt durante l'animazione
      this.kernel.playSound('alt', 1.0);
      await this.delay(this.frameTime);
    }
    
    this.kernel.character.src = 'assets/fermo1.png';
    this.kernel.hideExclamation();
    this.isRespondingToMouse = false;
    
    this.calculateEscapeDirectionFromHand(handPosition);
  }

  calculateEscapeDirectionFromHand(handPosition) {
    const charCenterX = this.kernel.currentPosition.x + (this.kernel.characterWidth / 2);
    const charCenterY = this.kernel.currentPosition.y + (this.kernel.characterHeight / 2);
    
    const dx = handPosition.x - charCenterX;
    const dy = handPosition.y - charCenterY;
    
    const escapeDx = -dx;
    const escapeDy = -dy;
    
    const magnitude = Math.sqrt(escapeDx * escapeDx + escapeDy * escapeDy);
    const normalizedDx = escapeDx / magnitude;
    const normalizedDy = escapeDy / magnitude;
    
    const angle = Math.atan2(normalizedDy, normalizedDx);
    const directions = [
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
      { x: -1, y: 1 },
      { x: -1, y: 0 },
      { x: -1, y: -1 },
      { x: 0, y: -1 },
      { x: 1, y: -1 }
    ];
    
    const sector = Math.round(angle / (Math.PI / 4)) % 8;
    const directionIndex = (sector + 8) % 8;
    
    this.mouseTarget = directions[directionIndex];
    
    console.log("🏃 Scappo dalla mano in direzione:", this.mouseTarget);
  }

  async startEscapeBehavior() {
    if (this.isRespondingToMouse || this.isEscaping || this.isReturningToGrid) return;
    
    console.log("🚨 Mouse vicino! Inizio fuga!");
    this.isEscaping = true;
    this.isRespondingToMouse = true;
    this.escapeSteps = 0;
    
    this.kernel.stopMovement();
    
    for (let i = 0; i < 2; i++) {
      this.kernel.character.src = 'assets/fermo1.png';
      this.kernel.hideExclamation();
      await this.delay(this.frameTime);
      
      this.kernel.character.src = 'assets/alt1.png';
      this.kernel.showExclamation();
      // MODIFICA: Riproduci suono alt durante l'animazione
      this.kernel.playSound('alt', 1.0);
      await this.delay(this.frameTime);
    }
    
    this.kernel.character.src = 'assets/fermo1.png';
    this.kernel.hideExclamation();
    this.isRespondingToMouse = false;
    
    this.calculateEscapeDirection();
  }

  calculateEscapeDirection() {
    const charCenterX = this.kernel.currentPosition.x + (this.kernel.characterWidth / 2);
    const charCenterY = this.kernel.currentPosition.y + (this.kernel.characterHeight / 2);
    
    const mouseGridX = Math.floor(this.mousePosition.x / this.kernel.gridSize);
    const mouseGridY = Math.floor(this.mousePosition.y / this.kernel.gridSize);
    
    const dx = mouseGridX - charCenterX;
    const dy = mouseGridY - charCenterY;
    
    const escapeDx = -dx;
    const escapeDy = -dy;
    
    const magnitude = Math.sqrt(escapeDx * escapeDx + escapeDy * escapeDy);
    const normalizedDx = escapeDx / magnitude;
    const normalizedDy = escapeDy / magnitude;
    
    const angle = Math.atan2(normalizedDy, normalizedDx);
    const directions = [
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
      { x: -1, y: 1 },
      { x: -1, y: 0 },
      { x: -1, y: -1 },
      { x: 0, y: -1 },
      { x: 1, y: -1 }
    ];
    
    const sector = Math.round(angle / (Math.PI / 4)) % 8;
    const directionIndex = (sector + 8) % 8;
    
    this.mouseTarget = directions[directionIndex];
    
    console.log("🏃 Scappo in direzione:", this.mouseTarget);
  }

  stopEscapeBehavior() {
    console.log("✅ Pericolo scampato! Torno al comportamento normale");
    this.isEscaping = false;
    this.mouseTarget = null;
    this.escapeSteps = 0;
    
    if (!this.kernel.isValidPosition(this.kernel.currentPosition.x, this.kernel.currentPosition.y, false)) {
      this.startReturnToGrid();
    }
  }

  startReturnToGrid() {
    console.log("🗺️ Devo tornare nella griglia!");
    this.isReturningToGrid = true;
    this.calculateReturnDirection();
  }

  // MODIFICA QUI: Aggiornato per tornare ai bordi dello schermo invece che a una "griglia"
  calculateReturnDirection() {
    const currentX = this.kernel.currentPosition.x;
    const currentY = this.kernel.currentPosition.y;
    
    const totalCols = Math.floor(this.kernel.container.clientWidth / this.kernel.gridSize);
    const totalRows = Math.floor(this.kernel.container.clientHeight / this.kernel.gridSize);
    
    const minX = 0;
    const maxX = totalCols - this.kernel.characterWidth;
    const minY = 0;
    const maxY = totalRows - this.kernel.characterHeight;
    
    // Calcola la direzione verso il centro dell'area valida
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    
    const dx = centerX - currentX;
    const dy = centerY - currentY;
    
    const magnitude = Math.sqrt(dx * dx + dy * dy);
    
    if (magnitude === 0) {
      this.mouseTarget = { x: 0, y: 0 };
      return;
    }
    
    const normalizedDx = dx / magnitude;
    const normalizedDy = dy / magnitude;
    
    const angle = Math.atan2(normalizedDy, normalizedDx);
    const directions = [
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
      { x: -1, y: 1 },
      { x: -1, y: 0 },
      { x: -1, y: -1 },
      { x: 0, y: -1 },
      { x: 1, y: -1 }
    ];
    
    const sector = Math.round(angle / (Math.PI / 4)) % 8;
    const directionIndex = (sector + 8) % 8;
    
    this.mouseTarget = directions[directionIndex];
    
    console.log("📍 Direzione per tornare ai bordi dello schermo:", this.mouseTarget);
  }

  checkIfBackInGrid() {
    const isInGrid = this.kernel.isValidPosition(
      this.kernel.currentPosition.x, 
      this.kernel.currentPosition.y, 
      false
    );
    
    if (isInGrid) {
      console.log("🎯 Sono tornato nell'area valida!");
      this.isReturningToGrid = false;
      this.mouseTarget = null;
      return true;
    }
    return false;
  }

  startMainCycle() {
    if (!this.isActive) return;
    this.executeMainCycle();
  }

  async executeMainCycle() {
    try {
      await this.continuousMovement();
    } catch (error) {
      console.error('Error in behavior cycle:', error);
      this.restartCycle();
    }
  }

  async continuousMovement() {
    while (this.isActive && this.kernel.isActive) {
      if (Math.random() < 0.08 && !this.isEscaping && !this.isReturningToGrid && !this.kernel.isRunningFromCollision) {
        await this.idleBehavior();
        continue;
      }
      
      this.kernel.currentState = 'moving';
      
      let direction;
      let movementSpeedMultiplier = 1;
      let totalSteps;
      
      if (this.kernel.isRunningFromCollision) {
        // Se sta correndo da una collisione, lascia che il kernel gestisca
        await this.delay(50);
        continue;
      }
      
      if (this.isReturningToGrid) {
        this.calculateReturnDirection();
        direction = this.mouseTarget;
        movementSpeedMultiplier = 1.5;
        totalSteps = 20;
      } else if (this.isEscaping && this.mouseTarget) {
        direction = this.mouseTarget;
        movementSpeedMultiplier = this.escapeSpeedMultiplier;
        totalSteps = 15;
      } else {
        direction = this.getRandomDirection();
        totalSteps = 5 + Math.floor(Math.random() * 11);
      }
      
      const result = await this.executeMovementSequence(direction, totalSteps, movementSpeedMultiplier);
      
      if (this.isReturningToGrid) {
        const isBackInGrid = this.checkIfBackInGrid();
        if (isBackInGrid) {
          this.isReturningToGrid = false;
          this.mouseTarget = null;
        }
      }
      
      if (this.isEscaping) {
        this.escapeSteps++;
        if (this.escapeSteps >= this.maxEscapeSteps) {
          this.stopEscapeBehavior();
        } else {
          const charCenterX = this.kernel.currentPosition.x + (this.kernel.characterWidth / 2);
          const charCenterY = this.kernel.currentPosition.y + (this.kernel.characterHeight / 2);
          const mouseGridX = Math.floor(this.mousePosition.x / this.kernel.gridSize);
          const mouseGridY = Math.floor(this.mousePosition.y / this.kernel.gridSize);
          const distance = Math.sqrt(
            Math.pow(mouseGridX - charCenterX, 2) + 
            Math.pow(mouseGridY - charCenterY, 2)
          );
          
          if (this.kernel.isValidPosition(this.kernel.currentPosition.x, this.kernel.currentPosition.y, false) && 
              distance > this.escapeDistance) {
            this.stopEscapeBehavior();
          }
        }
      }
    }
  }

  async idleBehavior() {
    this.kernel.stopMovement();
    await this.kernel.playIdleAnimation();
    await this.delay((200 + Math.random() * 400) / this.speedMultiplier);
  }

  getRandomDirection() {
    const directions = [
      { x: 1, y: 0 }, { x: -1, y: 0 },
      { x: 0, y: 1 }, { x: 0, y: -1 },
      { x: 1, y: 1 }, { x: 1, y: -1 },
      { x: -1, y: 1 }, { x: -1, y: -1 }
    ];
    
    if (Math.random() < 0.4) {
      const diagonalDirections = [
        { x: 1, y: 1 }, { x: 1, y: -1 },
        { x: -1, y: 1 }, { x: -1, y: -1 }
      ];
      return diagonalDirections[Math.floor(Math.random() * diagonalDirections.length)];
    } else {
      const cardinalDirections = [
        { x: 1, y: 0 }, { x: -1, y: 0 },
        { x: 0, y: 1 }, { x: 0, y: -1 }
      ];
      return cardinalDirections[Math.floor(Math.random() * cardinalDirections.length)];
    }
  }

  async executeMovementSequence(direction, totalSteps, movementSpeedMultiplier = 1) {
    let stepsCompleted = 0;
    
    if (this.kernel.keyboardDetector) {
        const keyboardMultiplier = this.kernel.keyboardDetector.getActivityMultiplier();
        movementSpeedMultiplier *= keyboardMultiplier;
    }
    
    if (direction.x > 0) this.kernel.direction = 'right';
    if (direction.x < 0) this.kernel.direction = 'left';
    
    while (stepsCompleted < totalSteps && this.isActive && !this.isRespondingToMouse && !this.kernel.isRunningFromCollision) {
      if (!this.isGlitching && Math.random() < this.glitchChance) {
        await this.startMovementGlitch(direction);
      }
      
      if (this.isGlitching) {
        await this.delay(this.frameTime);
        continue;
      }
      
      const nextX = this.kernel.currentPosition.x + direction.x;
      const nextY = this.kernel.currentPosition.y + direction.y;
      
      const isValidForMovement = (this.isEscaping || this.isReturningToGrid) ? 
        this.kernel.isValidPositionForEscape(nextX, nextY) : 
        this.kernel.isValidPosition(nextX, nextY, false);
      
      // Controlla collisioni con altri personaggi
      const collisionCheck = this.kernel.checkCollisionWithOtherCharacters(nextX, nextY, false);
      
      if (isValidForMovement && !collisionCheck.collided) {
        this.kernel.currentPosition.x = nextX;
        this.kernel.currentPosition.y = nextY;
        this.kernel.updateCharacterPosition();
        
        // MODIFICA: Riproduci suono del passo SOLO se sta correndo (escaping o returning)
        if (this.isEscaping || this.isReturningToGrid) {
          this.playStepSound(movementSpeedMultiplier);
        }
        
        this.updateAnimationFrame(stepsCompleted);
        stepsCompleted++;
      } else {
        if (collisionCheck.collided) {
          // Gestisci collisione
          await this.handleCollision(collisionCheck.character);
          break;
        }
        
        if (this.isEscaping || this.isReturningToGrid) {
          const alternativeDirections = this.getAlternativeEscapeDirections(direction);
          for (const altDir of alternativeDirections) {
            const altX = this.kernel.currentPosition.x + altDir.x;
            const altY = this.kernel.currentPosition.y + altDir.y;
            const altCollisionCheck = this.kernel.checkCollisionWithOtherCharacters(altX, altY, false);
            if (this.kernel.isValidPositionForEscape(altX, altY) && !altCollisionCheck.collided) {
              this.mouseTarget = altDir;
              break;
            }
          }
        }
        break;
      }
      
      const speedDelay = this.frameTime / movementSpeedMultiplier;
      await this.delay(speedDelay);
    }
    
    return { moved: stepsCompleted > 0 };
  }

  // MODIFICA: Metodo per riprodurre il suono del passo (solo se il kernel ha i suoni)
  playStepSound(speedMultiplier = 1) {
    if (!this.kernel || !this.kernel.playSound) return;
    
    try {
      // MODIFICA: Controllo sovrapposizione - se troppi suoni, skippa
      if (window.activeStepSounds && window.activeStepSounds > 3) {
        return; // Troppi suoni di passo attivi, skippa
      }
      
      // Riproduci suono del passo con velocità adattata
      const stepRate = Math.min(1.3, Math.max(0.7, speedMultiplier * 0.7)); // RIDOTTO: range più stretto
      this.kernel.playSound('step', stepRate);
    } catch (error) {
      console.log("Step sound error:", error);
    }
  }

  async handleCollision(otherCharacter) {
    console.log("💥 Collisione rilevata! Avvio gestione...");
    
    this.isRespondingToMouse = true;
    this.kernel.stopMovement();
    
    // Gestisci collisione attraverso il kernel
    await this.kernel.handleCollision(otherCharacter);
    
    this.isRespondingToMouse = false;
  }

  getAlternativeEscapeDirections(blockedDirection) {
    const allDirections = [
      { x: 1, y: 0 }, { x: -1, y: 0 },
      { x: 0, y: 1 }, { x: 0, y: -1 },
      { x: 1, y: 1 }, { x: 1, y: -1 },
      { x: -1, y: 1 }, { x: -1, y: -1 }
    ];
    
    return allDirections
      .filter(dir => dir.x !== blockedDirection.x || dir.y !== blockedDirection.y)
      .sort((a, b) => {
        const similarityA = Math.abs(a.x - blockedDirection.x) + Math.abs(a.y - blockedDirection.y);
        const similarityB = Math.abs(b.x - blockedDirection.x) + Math.abs(b.y - blockedDirection.y);
        return similarityA - similarityB;
      });
  }

  async startMovementGlitch(originalDirection) {
    console.log("🌀 Inizio glitch di movimento!");
    
    this.isGlitching = true;
    this.glitchCounter = 0;
    this.glitchDirection = { ...originalDirection };
    this.glitchStartPosition = { ...this.kernel.currentPosition };
    
    const maxOscillations = 2 + Math.floor(Math.random() * 5);
    
    while (this.glitchCounter < maxOscillations && this.isActive) {
      const backX = this.kernel.currentPosition.x - this.glitchDirection.x;
      const backY = this.kernel.currentPosition.y - this.glitchDirection.y;
      
      if (this.kernel.isValidPositionForEscape(backX, backY)) {
        this.kernel.currentPosition.x = backX;
        this.kernel.currentPosition.y = backY;
        this.kernel.updateCharacterPosition();
        
        // MODIFICA: Riproduci suono del passo durante glitch
        this.playStepSound(1);
        
        this.updateAnimationFrame(this.glitchCounter);
        
        await this.delay(this.frameTime);
      }
      
      this.kernel.currentPosition.x = this.glitchStartPosition.x;
      this.kernel.currentPosition.y = this.glitchStartPosition.y;
      this.kernel.updateCharacterPosition();
        
      // MODIFICA: Riproduci suono del passo durante glitch
      this.playStepSound(1);
        
      this.updateAnimationFrame(this.glitchCounter);
        
      await this.delay(this.frameTime);
        
      this.glitchCounter++;
    }
    
    await this.executeGlitchTeleport();
  }

  async executeGlitchTeleport() {
    console.log(`⚡ Teletrasporto dopo ${this.glitchCounter} oscillazioni!`);
    
    const teleportDistance = this.glitchCounter + 1;
    
    const targetX = this.kernel.currentPosition.x + (this.glitchDirection.x * teleportDistance);
    const targetY = this.kernel.currentPosition.y + (this.glitchDirection.y * teleportDistance);
    
    // Controlla collisioni dopo il teletrasporto
    const collisionCheck = this.kernel.checkCollisionWithOtherCharacters(targetX, targetY, false);
    
    if (this.kernel.isValidPositionForEscape(targetX, targetY) && !collisionCheck.collided) {
      this.kernel.currentPosition.x = targetX;
      this.kernel.currentPosition.y = targetY;
      this.kernel.updateCharacterPosition();
      
      // MODIFICA: Riproduci suono del passo per teletrasporto
      this.playStepSound(2);
      
      console.log(`✨ Teletrasportato di ${teleportDistance} celle!`);
      
      if (this.isReturningToGrid) {
        this.checkIfBackInGrid();
      }
    } else {
      console.log("❌ Teletrasporto bloccato - posizione non valida o collisione");
    }
    
    this.isGlitching = false;
    this.glitchCounter = 0;
    this.glitchDirection = null;
    this.glitchStartPosition = null;
  }

  updateAnimationFrame(step) {
    const frames = this.kernel.states.running;
    const frameIndex = step % frames.length;
    const currentFrame = frames[frameIndex];
    
    // MODIFICA: Usa getSpriteName per ottenere la sprite corretta
    this.kernel.character.src = this.kernel.getSpriteName(currentFrame);
    
    // Piazza le impronte sempre quando si muove (non solo durante 'moving' state)
    if (!this.isGlitching) {
        this.kernel.placeFootprintPixel(currentFrame);
    }
}

  restartCycle() {
    this.startMainCycle();
  }

  stop() {
    this.isActive = false;
    if (this.handCheckInterval) {
      clearInterval(this.handCheckInterval);
      this.handCheckInterval = null;
    }
    // MODIFICA: Rimossa pulizia audio (gestita dal kernel)
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}