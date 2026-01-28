if (!window.globalFootprintPixels) {
    window.globalFootprintPixels = [];
}

if (!window.allCharacters) {
    window.allCharacters = [];
}

if (!window.additionalCharacters) {
    window.additionalCharacters = [];
}

class CPUMonitor {
    constructor() {
        this.cpuUsage = 0;
        this.monitorInterval = null;
        this.isMonitoring = false;
        
        this.cpuThresholds = [
            { threshold: 15, color: 'red', character: null, cooldown: false, despawnTimer: null, lifetimeTimer: null, canBeRemoved: false, spawnTimer: null, spawnConfirmed: false },
            { threshold: 30, color: 'green', character: null, cooldown: false, despawnTimer: null, lifetimeTimer: null, canBeRemoved: false, spawnTimer: null, spawnConfirmed: false },
            { threshold: 40, color: 'yellow', character: null, cooldown: false, despawnTimer: null, lifetimeTimer: null, canBeRemoved: false, spawnTimer: null, spawnConfirmed: false },
            { threshold: 50, color: 'purple', character: null, cooldown: false, despawnTimer: null, lifetimeTimer: null, canBeRemoved: false, spawnTimer: null, spawnConfirmed: false }
        ];
        
        // Tracking ultima modalità di entrata per alternare (mai 2 volte uguale)
        this.lastEntryMode = null; // 'running' o 'spawn'
        
        // Tracking ultima modalità di despawn per alternare (mai 2 volte uguale)
        this.lastExitMode = null; // 'despawn-animation' o 'running-exit'
        
        // Sistema di coda per spawn SEQUENZIALE (uno alla volta)
        this.spawnQueue = []; // Lista di slotIndex in attesa
        this.isSpawning = false; // Flag per sapere se sto già spawnando
        
        this.init();
    }

    async init() {
        console.log("🖥️ CPU Monitor inizializzato");
        this.startMonitoring();
    }

    startMonitoring() {
        this.isMonitoring = true;
        
        this.monitorInterval = setInterval(async () => {
            await this.checkCPUUsage();
        }, 200);
    }

    async checkCPUUsage() {
        try {
            if (window.electronAPI && window.electronAPI.getCPUUsage) {
                this.cpuUsage = await window.electronAPI.getCPUUsage();
            } else {
                this.cpuUsage = Math.random() * 100;
            }
            
            this.manageCharacters();
            
        } catch (error) {
            console.error('Errore nel monitoraggio CPU:', error);
            this.cpuUsage = Math.random() * 100;
            this.manageCharacters();
        }
    }

    manageCharacters() {
        for (let i = 0; i < this.cpuThresholds.length; i++) {
            const slot = this.cpuThresholds[i];
            
            if (this.cpuUsage >= slot.threshold) {
                // CPU sopra soglia
                if (!slot.character && !slot.cooldown) {
                    // Avvia timer di 1 secondo per confermare lo spawn
                    if (!slot.spawnTimer && !slot.spawnConfirmed) {
                        console.log(`⏱️ CPU ${this.cpuUsage.toFixed(2)}% >= ${slot.threshold}% - Timer 1s per ${slot.color}`);
                        slot.spawnTimer = setTimeout(() => {
                            // Dopo 1 secondo, controlla se CPU è ancora sopra soglia
                            if (this.cpuUsage >= slot.threshold && !slot.character && !slot.cooldown) {
                                console.log(`✅ CPU confermata sopra ${slot.threshold}% per 1s - Aggiungo ${slot.color} alla coda`);
                                slot.spawnConfirmed = true;
                                this.addToSpawnQueue(i); // Aggiunge alla coda sequenziale
                            } else {
                                console.log(`❌ CPU scesa sotto ${slot.threshold}% prima di 1s - No spawn ${slot.color}`);
                            }
                            slot.spawnTimer = null;
                            slot.spawnConfirmed = false;
                        }, 1000);
                    }
                } else if (slot.despawnTimer) {
                    console.log(`⏸️ CPU torna sopra ${slot.threshold}% - Cancello despawn di ${slot.color}`);
                    clearTimeout(slot.despawnTimer);
                    slot.despawnTimer = null;
                }
            } else {
                // CPU sotto soglia
                
                // Cancella timer di spawn se CPU scende prima di 1 secondo
                if (slot.spawnTimer) {
                    console.log(`❌ CPU scesa sotto ${slot.threshold}% - Cancello timer spawn ${slot.color}`);
                    clearTimeout(slot.spawnTimer);
                    slot.spawnTimer = null;
                }
                
                if (slot.character && slot.canBeRemoved && !slot.despawnTimer) {
                    console.log(`➖ CPU ${this.cpuUsage.toFixed(2)}% < ${slot.threshold}% - Avvio timer despawn ${slot.color}`);
                    slot.despawnTimer = setTimeout(() => {
                        if (this.cpuUsage < slot.threshold) {
                            console.log(`🗑️ Despawn personaggio ${slot.color} dopo 3s sotto soglia`);
                            this.despawnCharacter(i);
                        } else {
                            console.log(`⏸️ Despawn ${slot.color} cancellato - CPU risalita`);
                            slot.despawnTimer = null;
                        }
                    }, 3000);
                }
            }
        }
    }

    addToSpawnQueue(slotIndex) {
        // Aggiunge alla coda solo se non è già presente
        if (!this.spawnQueue.includes(slotIndex)) {
            this.spawnQueue.push(slotIndex);
            const colors = this.spawnQueue.map(i => this.cpuThresholds[i].color);
            console.log(`📋 Coda spawn: [${colors.join(', ')}] (${this.spawnQueue.length} in attesa)`);
        }
        
        // Avvia processamento della coda se non sta già spawnando
        if (!this.isSpawning) {
            this.processSpawnQueue();
        }
    }

    async processSpawnQueue() {
        // Se sta già spawnando o coda vuota, esci
        if (this.isSpawning || this.spawnQueue.length === 0) {
            return;
        }
        
        this.isSpawning = true;
        console.log(`🚀 Inizio processamento coda spawn...`);
        
        while (this.spawnQueue.length > 0) {
            const slotIndex = this.spawnQueue.shift(); // Prende il primo della coda
            const slot = this.cpuThresholds[slotIndex];
            
            console.log(`🎯 Processando ${slot.color} dalla coda (${this.spawnQueue.length} rimasti in attesa)`);
            
            // Controlla se ancora necessario spawnare
            if (!slot.character && !slot.cooldown && this.cpuUsage >= slot.threshold) {
                await this.spawnCharacter(slotIndex);
                
                // Pausa di 1 secondo tra uno spawn e l'altro
                if (this.spawnQueue.length > 0) {
                    console.log(`⏳ Pausa 1s prima del prossimo spawn...`);
                    await this.delay(1000);
                }
            } else {
                console.log(`⏭️ Skip spawn ${slot.color} - non più necessario (CPU: ${this.cpuUsage.toFixed(2)}%)`);
            }
        }
        
        this.isSpawning = false;
        console.log(`✅ Coda spawn completata`);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
  }

    async spawnCharacter(slotIndex) {
        const slot = this.cpuThresholds[slotIndex];
        
        if (slot.cooldown) {
            console.log(`⚠️ Slot ${slot.color} in cooldown`);
            return;
        }

        console.log(`🎮 Creando personaggio ${slot.color} per soglia ${slot.threshold}%...`);
        
        try {
            slot.cooldown = true;
            
            // MODIFICA: Passa il threshold come parametro
            const newCharacter = new AdditionalCharacter(slotIndex, slot.color, slot.threshold);
            slot.character = newCharacter;
            window.additionalCharacters.push(newCharacter);
            
            // ALTERNANZA: mai 2 volte uguale di fila
            let useSpawnAnimation;
            if (this.lastEntryMode === null) {
                // Prima volta: random
                useSpawnAnimation = Math.random() < 0.5;
            } else if (this.lastEntryMode === 'running') {
                // Ultima volta running → ora spawn
                useSpawnAnimation = true;
            } else {
                // Ultima volta spawn → ora running
                useSpawnAnimation = false;
            }
            
            if (useSpawnAnimation) {
                console.log(`✨ ${slot.color} - Usando animazione spawn (ultima: ${this.lastEntryMode || 'nessuna'})`);
                this.lastEntryMode = 'spawn';
                await newCharacter.enterWithSpawnAnimation();
            } else {
                console.log(`🏃 ${slot.color} - Entrando correndo da bordo (ultima: ${this.lastEntryMode || 'nessuna'})`);
                this.lastEntryMode = 'running';
                await newCharacter.enterRunningFromEdge();
            }
            
            newCharacter.startBehavior();
            
            slot.lifetimeTimer = setTimeout(() => {
                console.log(`⏰ Timer vita minima scaduto - ${slot.color} può essere rimosso`);
                slot.canBeRemoved = true;
            }, 3000);
            
            console.log(`✅ Personaggio ${slot.color} spawnato completamente`);
            
        } catch (error) {
            console.error(`❌ Errore nella creazione del personaggio ${slot.color}:`, error);
            slot.cooldown = false;
        }
    }

    async despawnCharacter(slotIndex) {
        const slot = this.cpuThresholds[slotIndex];
        
        if (!slot.character) {
            return;
        }

        console.log(`🗑️ Inizio despawn personaggio ${slot.color}`);
        
        try {
            const character = slot.character;
            
            if (character.behaviorCycle) {
                character.behaviorCycle.stop();
            }
            
            console.log(`📦 Trasferimento ${character.footprintPixels.length} impronte di ${slot.color} a global`);
            if (character.footprintPixels && character.footprintPixels.length > 0) {
                window.globalFootprintPixels.push(...character.footprintPixels);
            }
            
            // ALTERNANZA: scegli casualmente tra despawn animation e running exit
            let useDespawnAnimation;
            if (this.lastExitMode === null) {
                // Prima volta: random
                useDespawnAnimation = Math.random() < 0.5;
            } else if (this.lastExitMode === 'running-exit') {
                // Ultima volta running exit → ora despawn animation
                useDespawnAnimation = true;
            } else {
                // Ultima volta despawn animation → ora running exit
                useDespawnAnimation = false;
            }
            
            if (useDespawnAnimation) {
                console.log(`🎬 ${slot.color} - Usando animazione despawn (ultima: ${this.lastExitMode || 'nessuna'})`);
                this.lastExitMode = 'despawn-animation';
                await character.playDespawnAnimation();
            } else {
                console.log(`🏃 ${slot.color} - Uscendo correndo da bordo (ultima: ${this.lastExitMode || 'nessuna'})`);
                this.lastExitMode = 'running-exit';
                await character.exitRunningFromEdge();
            }
            
            character.destroy();
            
            const indexInArray = window.additionalCharacters.indexOf(character);
            if (indexInArray !== -1) {
                window.additionalCharacters.splice(indexInArray, 1);
            }
            
            slot.character = null;
            slot.canBeRemoved = false;
            slot.despawnTimer = null;
            
            // Cleanup anche del spawnTimer se presente
            if (slot.spawnTimer) {
                clearTimeout(slot.spawnTimer);
                slot.spawnTimer = null;
                slot.spawnConfirmed = false;
            }
            
            if (slot.lifetimeTimer) {
                clearTimeout(slot.lifetimeTimer);
                slot.lifetimeTimer = null;
            }
            
            setTimeout(() => {
                slot.cooldown = false;
                console.log(`✅ Cooldown terminato per slot ${slot.color}`);
            }, 3000);
            
            console.log(`✅ Personaggio ${slot.color} despawnato completamente`);
            
        } catch (error) {
            console.error(`❌ Errore nel despawn del personaggio ${slot.color}:`, error);
        }
    }

    stop() {
        this.isMonitoring = false;
        
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
            this.monitorInterval = null;
        }
        
        for (const slot of this.cpuThresholds) {
            if (slot.despawnTimer) {
                clearTimeout(slot.despawnTimer);
            }
            if (slot.lifetimeTimer) {
                clearTimeout(slot.lifetimeTimer);
            }
            if (slot.spawnTimer) {
                clearTimeout(slot.spawnTimer);
            }
        }
        
        // Svuota la coda e resetta flag
        this.spawnQueue = [];
        this.isSpawning = false;
        
        for (const character of window.additionalCharacters) {
            if (character.behaviorCycle) {
                character.behaviorCycle.stop();
            }
            character.destroy();
        }
        window.additionalCharacters = [];
        
        console.log("🛑 CPU Monitor fermato");
    }
}

class AdditionalCharacter {
    // MODIFICA: Aggiunto cpuThreshold al costruttore
    constructor(slotIndex, color, cpuThreshold) {
        this.slotIndex = slotIndex;
        this.color = color;
        this.cpuThreshold = cpuThreshold; // MODIFICA: Aggiunto per usare sprite specifiche
        
        this.mainKernel = window.kernelFragment || document.querySelector('.character')?.__kernelFragment;
        
        this.gridSize = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--grid-size'));
        this.characterWidth = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--character-width'));
        this.characterHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--character-height'));
        
        this.container = document.getElementById('grid-container');
        this.character = null;
        this.exclamation = null;
        
        this.currentState = 'moving';
        this.currentPosition = { x: 0, y: 0 };
        this.direction = 'right';
        
        this.colorFilters = {
            blue: 'hue-rotate(0deg) brightness(1.2) saturate(1.5)',
            red: 'hue-rotate(180deg) brightness(5) saturate(2) contrast(2)',
            green: 'hue-rotate(90deg) brightness(1.5) saturate(2)',
            yellow: 'hue-rotate(50deg) brightness(1.8) saturate(2)',
            purple: 'hue-rotate(270deg) brightness(1.5) saturate(2)'
        };
        
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
        
        this.isActive = true;
        this.isColliding = false;
        this.collisionTarget = null;
        this.isRunningFromCollision = false;
        
        // Ottimizzazione: throttling impronte
        this.lastFootprintTime = 0;
        this.footprintThrottle = 30; // ms tra una creazione e l'altra
        
        // Flag per sapere se sta entrando (per mouse detection)
        this.isEntering = false;
        
        // Flag per sapere se sta uscendo (per collision detection)
        this.isExiting = false;
        
        // MODIFICA: Aggiunti suoni
        this.sounds = {
            step: null,
            spawn: null,
            alt: null,
            despawn: null
        };
        
        this.createCharacter();
        this.createExclamation();
        this.loadSounds();
    }

    // MODIFICA: Nuovo metodo per ottenere il nome file corretto in base alla soglia CPU
    getSpriteName(baseName) {
        // Personaggi aggiuntivi usano sempre sprite con suffisso CPU
        return `assets/${baseName.replace('.png', '')}-${this.cpuThreshold}cpu.png`;
    }

    createCharacter() {
        this.character = document.createElement('img');
        this.character.className = 'character additional-character';
        
        // MODIFICA: Usa getSpriteName per ottenere la sprite corretta
        this.character.src = this.getSpriteName('corsa1.png');
        
        this.character.style.filter = this.colorFilters[this.color];
        
        this.container.appendChild(this.character);
    }

    createExclamation() {
        this.exclamation = document.createElement('img');
        this.exclamation.className = 'exclamation';
        
        // MODIFICA: Usa getSpriteName per ottenere la sprite corretta
        this.exclamation.src = this.getSpriteName('alt2.png');
        
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

    loadSounds() {
        // Carica i suoni
        this.sounds.step = new Audio('assets/step.mp3');
        this.sounds.step.volume = 0.02; // RIDOTTO: da 0.05 a 0.02 (meno volume per personaggi aggiuntivi)
        this.sounds.step.preload = 'auto';
        
        this.sounds.spawn = new Audio('assets/spawn.wav');
        this.sounds.spawn.volume = 0.08; // RIDOTTO: da 0.15 a 0.08 (meno volume)
        this.sounds.spawn.preload = 'auto';
        
        this.sounds.alt = new Audio('assets/alt.wav');
        this.sounds.alt.volume = 0.08; // RIDOTTO: da 1 a 0.08 (MOLTO meno volume)
        this.sounds.alt.preload = 'auto';
        
        this.sounds.despawn = new Audio('assets/spawn.wav');
        this.sounds.despawn.volume = 0.08; // RIDOTTO: da 1 a 0.08 (MOLTO meno volume)
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

    async enterRunningFromEdge() {
        console.log(`🏃 ${this.color} - Entrata running da bordo schermo`);
        
        const edges = ['top', 'right', 'bottom', 'left'];
        const edge = edges[Math.floor(Math.random() * edges.length)];
        
        const maxX = Math.floor(this.container.clientWidth / this.gridSize) - this.characterWidth;
        const maxY = Math.floor(this.container.clientHeight / this.gridSize) - this.characterHeight;
        
        switch (edge) {
            case 'top':
                this.currentPosition.x = Math.floor(Math.random() * maxX);
                this.currentPosition.y = -this.characterHeight - 5;
                this.targetPosition = {
                    x: Math.floor(Math.random() * maxX),
                    y: Math.floor(Math.random() * maxY)
                };
                break;
            case 'right':
                this.currentPosition.x = maxX + 10;
                this.currentPosition.y = Math.floor(Math.random() * maxY);
                this.targetPosition = {
                    x: Math.floor(Math.random() * maxX),
                    y: Math.floor(Math.random() * maxY)
                };
                break;
            case 'bottom':
                this.currentPosition.x = Math.floor(Math.random() * maxX);
                this.currentPosition.y = maxY + 10;
                this.targetPosition = {
                    x: Math.floor(Math.random() * maxX),
                    y: Math.floor(Math.random() * maxY)
                };
                break;
            case 'left':
                this.currentPosition.x = -this.characterWidth - 10;
                this.currentPosition.y = Math.floor(Math.random() * maxY);
                this.targetPosition = {
                    x: Math.floor(Math.random() * maxX),
                    y: Math.floor(Math.random() * maxY)
                };
                break;
        }
        
        this.updateCharacterPosition();
        
        console.log(`📍 ${this.color} - Partenza:`, this.currentPosition, "Target:", this.targetPosition);
        
        await this.moveToTargetWithRandomness();
        
        console.log(`✅ ${this.color} - Raggiunta posizione target`);
    }

    async enterWithSpawnAnimation() {
        console.log(`✨ ${this.color} - Spawn animation come personaggio principale`);
        
        // Posiziona casualmente nella griglia come il personaggio base
        const maxX = this.getMaxX();
        const maxY = this.getMaxY();
        const minX = this.getMinX();
        const minY = this.getMinY();
        
        this.currentPosition = {
            x: Math.floor(Math.random() * (maxX - minX + 1)) + minX,
            y: Math.floor(Math.random() * (maxY - minY + 1)) + minY
        };
        
        this.updateCharacterPosition();
        
        // Animazione spawn identica al personaggio base
        const spawnFrames = this.states.spawn;
        
        for (let i = 0; i < spawnFrames.length; i++) {
            // MODIFICA: Usa getSpriteName per ottenere la sprite corretta
            this.character.src = this.getSpriteName(spawnFrames[i]);
            
            // MODIFICA: Riproduci suono spawn per ogni frame
            this.playSound('spawn', 1.5 - (i * 0.1)); // Leggermente più veloce ad ogni frame
            
            await this.delay(this.frameTime);
        }
        
        // MODIFICA: Usa getSpriteName per ottenere la sprite corretta
        this.character.src = this.getSpriteName('fermo1.png');
        console.log(`✅ ${this.color} - Animazione spawn completata`);
    }

    async exitRunningFromEdge() {
        console.log(`🏃 ${this.color} - Uscita running da bordo schermo`);
        
        this.isExiting = true; // Segnala che sta uscendo
        this.currentState = 'moving';
        
        const edges = ['top', 'right', 'bottom', 'left'];
        const edge = edges[Math.floor(Math.random() * edges.length)];
        
        const maxX = Math.floor(this.container.clientWidth / this.gridSize) - this.characterWidth;
        const maxY = Math.floor(this.container.clientHeight / this.gridSize) - this.characterHeight;
        
        let targetPosition;
        
        switch (edge) {
            case 'top':
                targetPosition = {
                    x: this.currentPosition.x,
                    y: -this.characterHeight - 10
                };
                break;
            case 'right':
                targetPosition = {
                    x: maxX + 15,
                    y: this.currentPosition.y
                };
                break;
            case 'bottom':
                targetPosition = {
                    x: this.currentPosition.x,
                    y: maxY + 15
                };
                break;
            case 'left':
                targetPosition = {
                    x: -this.characterWidth - 15,
                    y: this.currentPosition.y
                };
                break;
        }
        
        console.log(`📍 ${this.color} - Partenza:`, this.currentPosition, "Target uscita:", targetPosition);
        
        const exitSpeed = 2.5;
        let reachedTarget = false;
        
        while (this.isActive && !reachedTarget && this.isExiting) {
            const dx = targetPosition.x - this.currentPosition.x;
            const dy = targetPosition.y - this.currentPosition.y;
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
            
            // Controlla collisioni durante l'uscita (same as during entry)
            const collisionCheck = this.checkCollisionWithOtherCharacters(nextX, nextY, true);
            if (collisionCheck.collided) {
                console.log(`💥 ${this.color} - Collisione durante uscita!`);
                this.isExiting = false; // Ferma l'uscita
                await this.handleCollision(collisionCheck.character);
                return; // Uscita, handleCollision gestirà la fuga
            }
            
            if (this.isValidPositionForEscape(nextX, nextY)) {
                this.currentPosition.x = nextX;
                this.currentPosition.y = nextY;
                this.updateCharacterPosition();
                
                // MODIFICA: Riproduci suono del passo durante l'uscita
                if (this.behaviorCycle && this.behaviorCycle.playStepSound) {
                    this.behaviorCycle.playStepSound(exitSpeed);
                }
                
                // Animazione corsa
                const frames = this.states.running;
                const frameIndex = Math.floor(Date.now() / 100) % frames.length;
                const currentFrame = frames[frameIndex];
                
                // MODIFICA: Usa getSpriteName per ottenere la sprite corretta
                this.character.src = this.getSpriteName(currentFrame);
                
                this.placeFootprintPixel(currentFrame);
            }
            
            await this.delay(this.frameTime / exitSpeed);
        }
        
        if (reachedTarget) {
            console.log(`✅ ${this.color} - Raggiunto bordo schermo, uscita completata`);
        }
        
        this.isExiting = false;
    }

    // MODIFICA: Aggiunto playStepSound al behavior cycle
    playStepSound(speedMultiplier = 1) {
        // MODIFICA: Ridotto il volume generale dei passi
        const baseVolume = 0.5; // RIDOTTO: da 1.0 a 0.5
        const rate = Math.min(1.3, Math.max(0.7, speedMultiplier * 0.7)); // RIDOTTO: range più stretto
        this.playSound('step', rate);
    }

    async moveToTargetWithRandomness() {
        const entrySpeed = 2.5;
        let step = 0;
        this.isEntering = true; // Segnala che sta entrando
        
        while (this.isActive && this.isEntering) {
            // Controlla se il mouse è molto veloce durante l'entrata
            if (this.mainKernel?.keyboardDetector) {
                const intensity = this.mainKernel.keyboardDetector.getActivityIntensity();
                if (intensity === 'very-high') {
                    // TELETRASPORTO durante entrata!
                    console.log(`⚡ ${this.color} - Teletrasporto durante entrata!`);
                    this.randomizePosition();
                    this.character.classList.add('glitching');
                    await this.delay(500);
                    this.character.classList.remove('glitching');
                    // Continua l'entrata dal nuovo punto
                }
            }
            
            const dx = this.targetPosition.x - this.currentPosition.x;
            const dy = this.targetPosition.y - this.currentPosition.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 2) {
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
            
            // Controlla collisioni durante l'entrata
            const collisionCheck = this.checkCollisionWithOtherCharacters(nextX, nextY, true);
            if (collisionCheck.collided) {
                console.log(`💥 ${this.color} - Collisione durante entrata!`);
                this.isEntering = false; // Ferma l'entrata
                await this.handleCollision(collisionCheck.character);
                return; // Uscita, handleCollision gestirà la fuga
            }
            
            if (this.isValidPositionForEscape(nextX, nextY)) {
                this.currentPosition.x = nextX;
                this.currentPosition.y = nextY;
                this.updateCharacterPosition();
                
                // MODIFICA: Riproduci suono del passo durante l'entrata
                this.playStepSound(entrySpeed);
                
                const frames = this.states.running;
                const frameIndex = step % frames.length;
                const currentFrame = frames[frameIndex];
                
                // MODIFICA: Usa getSpriteName per ottenere la sprite corretta
                this.character.src = this.getSpriteName(currentFrame);
                
                this.placeFootprintPixel(currentFrame);
                
                step++;
            }
            
            await this.delay(this.frameTime / entrySpeed);
        }
        
        this.isEntering = false; // Finita l'entrata
    }

    placeFootprintPixel(currentFrame) {
        if (currentFrame === 'corsa1.png' || currentFrame === 'corsa3.png') {
            // Throttling: controlla se è passato abbastanza tempo
            const now = Date.now();
            if (now - this.lastFootprintTime < this.footprintThrottle) {
                return; // Skip questa impronta
            }
            this.lastFootprintTime = now;
            
            const audioDetector = this.mainKernel?.audioDetector;
            const footprintMultiplier = audioDetector ? audioDetector.getFootprintMultiplier() : 1;
            
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
                for (let dy = -areaSize; dy <= areaSize; dy++) {
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

    startBehavior() {
        console.log(`🎮 ${this.color} - Avvio behavior cycle`);
        this.behaviorCycle = new AdditionalBehaviorCycle(this);
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
        
        // Controlla con il personaggio principale
        if (this.mainKernel && this.mainKernel.isActive && 
            !this.mainKernel.isRunningFromCollision &&
            (!this.mainKernel.isEntering || checkDuringEntry)) {
            
            const mainX = this.mainKernel.currentPosition.x;
            const mainY = this.mainKernel.currentPosition.y;
            
            const distanceX = Math.abs(x - mainX);
            const distanceY = Math.abs(y - mainY);
            
            if (distanceX <= checkRadius && distanceY <= checkRadius) {
                return { 
                    collided: true, 
                    character: this.mainKernel,
                    distanceX: distanceX,
                    distanceY: distanceY
                };
            }
        }
        
        // Controlla con altri personaggi aggiuntivi
        for (const otherChar of window.additionalCharacters) {
            if (otherChar === this || !otherChar.isActive || 
                otherChar.isRunningFromCollision ||
                (otherChar.isEntering && !checkDuringEntry) ||
                (otherChar.isExiting && !checkDuringEntry)) continue;
            
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
        
        return { collided: false, character: null };
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
                
                // MODIFICA: Riproduci suono del passo durante la fuga
                this.playStepSound(entrySpeed);
                
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

    async playDespawnAnimation() {
        console.log(`🎬 ${this.color} - Animazione despawn (spawn reverse)`);
        
        const spawnFrames = this.states.spawn;
        
        for (let i = spawnFrames.length - 1; i >= 0; i--) {
            // MODIFICA: Usa getSpriteName per ottenere la sprite corretta
            this.character.src = this.getSpriteName(spawnFrames[i]);
            
            // MODIFICA: Riproduci suono despawn al contrario per ogni frame
            // Usiamo un playbackRate negativo per riprodurlo al contrario (se supportato)
            // Altrimenti, usiamo un rate < 1 per rallentarlo
            const playbackRate = 0.7 + (i * 0.05); // Progressivamente più veloce
            this.playSound('despawn', playbackRate);
            
            await this.delay(this.frameTime);
        }
        
        console.log(`✅ ${this.color} - Animazione despawn completata`);
    }

    glitch() {
        this.character.classList.add('glitching');
        setTimeout(() => {
            this.character.classList.remove('glitching');
        }, 300 / this.speedMultiplier);
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

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    destroy() {
        this.isActive = false;
        this.isRunningFromCollision = false;
        this.isColliding = false;
        this.isEntering = false;
        this.isExiting = false;
        
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
        
        console.log(`🗑️ ${this.color} - Destroy completato`);
    }
}

class AdditionalBehaviorCycle {
    constructor(character) {
        this.character = character;
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
        
        // AGGIUNTA: Inizializzazione audio step
        this.stepSound = new Audio('assets/step.mp3');
        this.stepSound.volume = 0.02; // RIDOTTO: da 0.3 a 0.02 (MOLTO meno volume)
        this.stepSound.preload = 'auto';
        
        this.setupMouseTracking();
        this.setupHandTracking();
        this.startMainCycle();
    }

    setupMouseTracking() {
        this.mouseTrackingHandler = (e) => {
            this.mousePosition.x = e.clientX;
            this.mousePosition.y = e.clientY;
            
            const gridX = Math.floor(e.clientX / this.character.gridSize);
            const gridY = Math.floor(e.clientY / this.character.gridSize);
            
            const charCenterX = this.character.currentPosition.x + (this.character.characterWidth / 2);
            const charCenterY = this.character.currentPosition.y + (this.character.characterHeight / 2);
            
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
        };
        
        document.addEventListener('mousemove', this.mouseTrackingHandler);
    }

    setupHandTracking() {
        this.handCheckInterval = setInterval(() => {
            if (!this.character.mainKernel?.handDetector || 
                !this.character.mainKernel.handDetector.handPixels || 
                this.character.mainKernel.handDetector.handPixels.length === 0) {
                return;
            }

            const charCenterX = this.character.currentPosition.x + (this.character.characterWidth / 2);
            const charCenterY = this.character.currentPosition.y + (this.character.characterHeight / 2);
            
            let minDistance = Infinity;
            let closestHandPixel = null;

            for (const handPixel of this.character.mainKernel.handDetector.handPixels) {
                const rect = handPixel.getBoundingClientRect();
                const handGridX = Math.floor((rect.left + rect.width / 2) / this.character.gridSize);
                const handGridY = Math.floor((rect.top + rect.height / 2) / this.character.gridSize);
                
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
        
        console.log(`🖐️ ${this.character.color} - Mano vicina! Scappo!`);
        this.isEscaping = true;
        this.isRespondingToMouse = true;
        this.escapeSteps = 0;
        
        this.character.stopMovement();
        
        for (let i = 0; i < 2; i++) {
            // MODIFICA: Usa getSpriteName per ottenere la sprite corretta
            this.character.character.src = this.character.getSpriteName('fermo1.png');
            this.character.hideExclamation();
            await this.delay(this.frameTime);
            
            // MODIFICA: Usa getSpriteName per ottenere la sprite corretta
            this.character.character.src = this.character.getSpriteName('alt1.png');
            this.character.showExclamation();
            await this.delay(this.frameTime);
        }
        
        // MODIFICA: Usa getSpriteName per ottenere la sprite corretta
        this.character.character.src = this.character.getSpriteName('fermo1.png');
        this.character.hideExclamation();
        this.isRespondingToMouse = false;
        
        this.calculateEscapeDirectionFromHand(handPosition);
    }

    calculateEscapeDirectionFromHand(handPosition) {
        const charCenterX = this.character.currentPosition.x + (this.character.characterWidth / 2);
        const charCenterY = this.character.currentPosition.y + (this.character.characterHeight / 2);
        
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
    }

    async startEscapeBehavior() {
        if (this.isRespondingToMouse || this.isEscaping || this.isReturningToGrid) return;
        
        console.log(`🚨 ${this.character.color} - Mouse vicino! Inizio fuga!`);
        this.isEscaping = true;
        this.isRespondingToMouse = true;
        this.escapeSteps = 0;
        
        this.character.stopMovement();
        
        for (let i = 0; i < 2; i++) {
            // MODIFICA: Usa getSpriteName per ottenere la sprite corretta
            this.character.character.src = this.character.getSpriteName('fermo1.png');
            this.character.hideExclamation();
            await this.delay(this.frameTime);
            
            // MODIFICA: Usa getSpriteName per ottenere la sprite corretta
            this.character.character.src = this.character.getSpriteName('alt1.png');
            this.character.showExclamation();
            await this.delay(this.frameTime);
        }
        
        // MODIFICA: Usa getSpriteName per ottenere la sprite corretta
        this.character.character.src = this.character.getSpriteName('fermo1.png');
        this.character.hideExclamation();
        this.isRespondingToMouse = false;
        
        this.calculateEscapeDirection();
    }

    calculateEscapeDirection() {
        const charCenterX = this.character.currentPosition.x + (this.character.characterWidth / 2);
        const charCenterY = this.character.currentPosition.y + (this.character.characterHeight / 2);
        
        const mouseGridX = Math.floor(this.mousePosition.x / this.character.gridSize);
        const mouseGridY = Math.floor(this.mousePosition.y / this.character.gridSize);
        
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
    }

    stopEscapeBehavior() {
        console.log(`✅ ${this.character.color} - Pericolo scampato! Torno al comportamento normale`);
        this.isEscaping = false;
        this.mouseTarget = null;
        this.escapeSteps = 0;
        
        if (!this.character.isValidPosition(this.character.currentPosition.x, this.character.currentPosition.y, false)) {
            this.startReturnToGrid();
        }
    }

    startReturnToGrid() {
        console.log(`🗺️ ${this.character.color} - Devo tornare nella griglia!`);
        this.isReturningToGrid = true;
        this.calculateReturnDirection();
    }

    calculateReturnDirection() {
        const currentX = this.character.currentPosition.x;
        const currentY = this.character.currentPosition.y;
        
        const minX = this.character.getMinX();
        const maxX = this.character.getMaxX();
        const minY = this.character.getMinY();
        const maxY = this.character.getMaxY();
        
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        
        const dx = centerX - currentX;
        const dy = centerY - currentY;
        
        const magnitude = Math.sqrt(dx * dx + dy * dy);
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
    }

    checkIfBackInGrid() {
        const isInGrid = this.character.isValidPosition(
            this.character.currentPosition.x, 
            this.character.currentPosition.y, 
            false
        );
        
        if (isInGrid) {
            console.log(`✅ ${this.character.color} - Sono tornato nella griglia!`);
            return true;
        }
        
        return false;
    }

    async startMainCycle() {
        console.log(`🎮 ${this.character.color} - Ciclo comportamento principale avviato`);
        
        while (this.isActive) {
            if (Math.random() < 0.08 && !this.isEscaping && !this.isReturningToGrid && !this.character.isRunningFromCollision) {
                this.character.currentState = 'idle';
                await this.idleBehavior();
            }
            
            this.character.currentState = 'moving';
            
            let direction;
            let totalSteps;
            let movementSpeedMultiplier = 1;
            
            if (this.character.isRunningFromCollision) {
                // Se sta correndo da una collisione, lascia che il character gestisca
                await this.delay(50);
                continue;
            }
            
            if (this.isReturningToGrid && this.mouseTarget) {
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
                    const charCenterX = this.character.currentPosition.x + (this.character.characterWidth / 2);
                    const charCenterY = this.character.currentPosition.y + (this.character.characterHeight / 2);
                    const mouseGridX = Math.floor(this.mousePosition.x / this.character.gridSize);
                    const mouseGridY = Math.floor(this.mousePosition.y / this.character.gridSize);
                    const distance = Math.sqrt(
                        Math.pow(mouseGridX - charCenterX, 2) + 
                        Math.pow(mouseGridY - charCenterY, 2)
                    );
                    
                    if (this.character.isValidPosition(this.character.currentPosition.x, this.character.currentPosition.y, false) && 
                        distance > this.escapeDistance) {
                        this.stopEscapeBehavior();
                    }
                }
            }
        }
    }

    async idleBehavior() {
        this.character.stopMovement();
        await this.character.playIdleAnimation();
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
        
        if (this.character.mainKernel?.keyboardDetector) {
            const keyboardMultiplier = this.character.mainKernel.keyboardDetector.getActivityMultiplier();
            movementSpeedMultiplier *= keyboardMultiplier;
        }
        
        if (direction.x > 0) this.character.direction = 'right';
        if (direction.x < 0) this.character.direction = 'left';
        
        while (stepsCompleted < totalSteps && this.isActive && !this.isRespondingToMouse && !this.character.isRunningFromCollision) {
            if (!this.isGlitching && Math.random() < this.glitchChance) {
                await this.startMovementGlitch(direction);
            }
            
            if (this.isGlitching) {
                await this.delay(this.frameTime);
                continue;
            }
            
            const nextX = this.character.currentPosition.x + direction.x;
            const nextY = this.character.currentPosition.y + direction.y;
            
            const isValidForMovement = (this.isEscaping || this.isReturningToGrid) ? 
                this.character.isValidPositionForEscape(nextX, nextY) : 
                this.character.isValidPosition(nextX, nextY, false);
            
            // Controlla collisioni con altri personaggi
            const collisionCheck = this.character.checkCollisionWithOtherCharacters(nextX, nextY, false);
            
            if (isValidForMovement && !collisionCheck.collided) {
                this.character.currentPosition.x = nextX;
                this.character.currentPosition.y = nextY;
                this.character.updateCharacterPosition();
                
                // AGGIUNTA: Riproduci suono del passo
                this.playStepSound(movementSpeedMultiplier);
                
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
                        const altX = this.character.currentPosition.x + altDir.x;
                        const altY = this.character.currentPosition.y + altDir.y;
                        const altCollisionCheck = this.character.checkCollisionWithOtherCharacters(altX, altY, false);
                        if (this.character.isValidPositionForEscape(altX, altY) && !altCollisionCheck.collided) {
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

    // AGGIUNTA: Metodo per riprodurre il suono del passo
    playStepSound(speedMultiplier = 1) {
        try {
            // MODIFICA: Controllo sovrapposizione - se troppi suoni, skippa
            if (window.activeStepSounds && window.activeStepSounds > 3) {
                return; // Troppi suoni di passo attivi, skippa
            }
            
            // Clona l'audio per permettere sovrapposizioni rapide
            const stepClone = this.stepSound.cloneNode();
            stepClone.volume = 0.02; // RIDOTTO: da 0.3 a 0.02
            
            // Regola la velocità di riproduzione in base al moltiplicatore di velocità
            // Più veloce = suono più veloce
            stepClone.playbackRate = Math.min(1.3, Math.max(0.7, speedMultiplier * 0.7)); // RIDOTTO: range più stretto
            
            // Riproduci il suono
            stepClone.play().catch(e => console.log("Step sound play error:", e));
            
            // MODIFICA: Traccia suoni attivi per i passi
            if (!window.activeStepSounds) window.activeStepSounds = 0;
            window.activeStepSounds++;
            
            // Quando il suono finisce, decrementa il contatore
            stepClone.onended = () => {
                if (window.activeStepSounds > 0) window.activeStepSounds--;
            };
        } catch (error) {
            console.log("Step sound error:", error);
        }
    }

    async handleCollision(otherCharacter) {
        console.log(`💥 ${this.character.color} - Gestione collisione con ${otherCharacter.color}`);
        
        this.isRespondingToMouse = true;
        this.character.stopMovement();
        
        // Gestisci collisione attraverso il character
        await this.character.handleCollision(otherCharacter);
        
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
        this.isGlitching = true;
        this.glitchCounter = 0;
        this.glitchDirection = { ...originalDirection };
        this.glitchStartPosition = { ...this.character.currentPosition };
        
        const maxOscillations = 2 + Math.floor(Math.random() * 5);
        
        while (this.glitchCounter < maxOscillations && this.isActive) {
            const backX = this.character.currentPosition.x - this.glitchDirection.x;
            const backY = this.character.currentPosition.y - this.glitchDirection.y;
            
            if (this.character.isValidPositionForEscape(backX, backY)) {
                this.character.currentPosition.x = backX;
                this.character.currentPosition.y = backY;
                this.character.updateCharacterPosition();
                
                // AGGIUNTA: Riproduci suono del passo durante glitch
                this.playStepSound(1);
                
                this.updateAnimationFrame(this.glitchCounter);
                
                await this.delay(this.frameTime);
            }
            
            this.character.currentPosition.x = this.glitchStartPosition.x;
            this.character.currentPosition.y = this.glitchStartPosition.y;
            this.character.updateCharacterPosition();
                
            // AGGIUNTA: Riproduci suono del passo durante glitch
            this.playStepSound(1);
                
            this.updateAnimationFrame(this.glitchCounter);
                
            await this.delay(this.frameTime);
                
            this.glitchCounter++;
        }
        
        await this.executeGlitchTeleport();
    }

    async executeGlitchTeleport() {
        const teleportDistance = this.glitchCounter + 1;
        
        const targetX = this.character.currentPosition.x + (this.glitchDirection.x * teleportDistance);
        const targetY = this.character.currentPosition.y + (this.glitchDirection.y * teleportDistance);
        
        // Controlla collisioni dopo il teletrasporto
        const collisionCheck = this.character.checkCollisionWithOtherCharacters(targetX, targetY, false);
        
        if (this.character.isValidPositionForEscape(targetX, targetY) && !collisionCheck.collided) {
            this.character.currentPosition.x = targetX;
            this.character.currentPosition.y = targetY;
            this.character.updateCharacterPosition();
            
            // AGGIUNTA: Riproduci suono del passo per teletrasporto
            this.playStepSound(2);
            
            if (this.isReturningToGrid) {
                this.checkIfBackInGrid();
            }
        }
        
        this.isGlitching = false;
        this.glitchCounter = 0;
        this.glitchDirection = null;
        this.glitchStartPosition = null;
    }

    updateAnimationFrame(step) {
        const frames = this.character.states.running;
        const frameIndex = step % frames.length;
        const currentFrame = frames[frameIndex];
        
        // MODIFICA: Usa getSpriteName per ottenere la sprite corretta
        this.character.character.src = this.character.getSpriteName(currentFrame);
        
        if (this.character.currentState === 'moving' && !this.isGlitching) {
            this.character.placeFootprintPixel(currentFrame);
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
        if (this.mouseTrackingHandler) {
            document.removeEventListener('mousemove', this.mouseTrackingHandler);
            this.mouseTrackingHandler = null;
        }
        // AGGIUNTA: Pulisci l'audio
        if (this.stepSound) {
            this.stepSound.pause();
            this.stepSound.currentTime = 0;
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 Inizializzazione CPU Monitor...");
    
    setTimeout(() => {
        const mainCharacter = document.querySelector('.character');
        if (mainCharacter && mainCharacter.parentElement) {
            window.kernelFragment = window.kernelFragment || 
                (document.querySelector('.character')?.__kernelFragment);
        }
        
        window.cpuMonitor = new CPUMonitor();
        console.log("✅ CPU Monitor avviato con successo");
    }, 3000);
});