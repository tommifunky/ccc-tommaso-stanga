class MouseMovementDetector {
    constructor(kernelFragment) {
        this.kernel = kernelFragment;
        this.isActive = false;
        
        this.mouseMovements = [];
        this.movementTimeout = 100;
        this.activityLevel = 0;
        this.maxActivityHistory = 15;
        
        this.activityThresholds = {
            low: 0.3,
            medium: 0.6,
            high: 0.95
        };
        
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        this.movementThreshold = 5;
        
        this.originalSpeedMultiplier = null;
        
        this.inactivityTimer = null;
        this.inactivityTimeout = 500;
        
        this.init();
    }

    init() {
        this.setupMouseListeners();
        this.isActive = true;
        console.log("🖱️ Mouse movement detector attivato!");
    }

    setupMouseListeners() {
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        
        document.addEventListener('wheel', this.handleMouseWheel.bind(this));
        
        setInterval(this.cleanOldMovements.bind(this), 1000);
    }

    handleMouseMove(event) {
        if (!this.isActive) return;
        
        const now = Date.now();
        const deltaX = Math.abs(event.clientX - this.lastMouseX);
        const deltaY = Math.abs(event.clientY - this.lastMouseY);
        const movementDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        if (movementDistance > this.movementThreshold) {
            this.mouseMovements.push({
                time: now,
                distance: movementDistance
            });
            
            if (this.mouseMovements.length > this.maxActivityHistory) {
                this.mouseMovements = this.mouseMovements.slice(-this.maxActivityHistory);
            }
            
            this.calculateActivityLevel();
            
            this.reactToMouseActivity();
            
            this.resetInactivityTimer();
        }
        
        this.lastMouseX = event.clientX;
        this.lastMouseY = event.clientY;
    }

    handleMouseWheel(event) {
        if (!this.isActive) return;
        
        const now = Date.now();
        const wheelIntensity = Math.abs(event.deltaY) + Math.abs(event.deltaX);
        
        this.mouseMovements.push({
            time: now,
            distance: wheelIntensity * 2
        });
        
        if (this.mouseMovements.length > this.maxActivityHistory) {
            this.mouseMovements = this.mouseMovements.slice(-this.maxActivityHistory);
        }
        
        this.calculateActivityLevel();
        this.reactToMouseActivity();
        this.resetInactivityTimer();
    }

    resetInactivityTimer() {
        if (this.inactivityTimer) {
            clearTimeout(this.inactivityTimer);
        }
        
        this.inactivityTimer = setTimeout(() => {
            this.returnToNormal();
        }, this.inactivityTimeout);
    }

    returnToNormal() {
        console.log("🔄 Mouse fermo - Ritorno al comportamento normale");
        
        if (this.kernel.behaviorCycle && this.originalSpeedMultiplier !== null) {
            this.kernel.behaviorCycle.speedMultiplier = this.originalSpeedMultiplier;
        }
        
        if (this.kernel.behaviorCycle) {
            this.kernel.behaviorCycle.isEscaping = false;
            this.kernel.behaviorCycle.mouseTarget = null;
        }
        
        this.activityLevel = 0;
    }

    calculateActivityLevel() {
        if (this.mouseMovements.length < 2) {
            this.activityLevel = 0;
            return;
        }
        
        const now = Date.now();
        const recentMovements = this.mouseMovements.filter(movement => 
            now - movement.time < 2000
        );
        
        if (recentMovements.length < 2) {
            this.activityLevel = 0;
            return;
        }
        
        let totalInterval = 0;
        let totalDistance = 0;
        
        for (let i = 1; i < recentMovements.length; i++) {
            totalInterval += recentMovements[i].time - recentMovements[i - 1].time;
            totalDistance += recentMovements[i].distance;
        }
        
        const averageInterval = totalInterval / (recentMovements.length - 1);
        const averageDistance = totalDistance / recentMovements.length;
        
        const speedFactor = Math.min(1, this.movementTimeout / averageInterval);
        const distanceFactor = Math.min(1, averageDistance / 50);
        
        this.activityLevel = Math.min(1, (speedFactor * 0.6 + distanceFactor * 0.4));
    }

    reactToMouseActivity() {
        if (!this.kernel.behaviorCycle || !this.kernel.behaviorCycle.isActive) return;
        
        const intensity = this.getActivityIntensity();
        
        // Applica anche ai personaggi aggiuntivi
        if (window.additionalCharacters && intensity !== 'low') {
            for (const char of window.additionalCharacters) {
                if (char && char.isActive && char.behaviorCycle) {
                    this.reactToMouseForCharacter(char, intensity);
                }
            }
        }
        
        switch (intensity) {
            case 'low':
                break;
                
            case 'medium':
                if (Math.random() < 0.3) {
                    this.triggerMinorGlitch();
                }
                break;
                
            case 'high':
                this.triggerHyperactiveBehavior();
                break;
                
            case 'very-high':
                this.triggerPanicBehavior();
                break;
        }
    }

    reactToMouseForCharacter(character, intensity) {
        // Reagisce anche durante l'entrata
        switch (intensity) {
            case 'medium':
                if (Math.random() < 0.3) {
                    character.glitch();
                }
                break;
                
            case 'high':
                if (character.behaviorCycle) {
                    const originalSpeed = character.behaviorCycle.speedMultiplier;
                    character.behaviorCycle.speedMultiplier = originalSpeed * 1.8;
                    
                    setTimeout(() => {
                        if (character.behaviorCycle) {
                            character.behaviorCycle.speedMultiplier = originalSpeed;
                        }
                    }, 2000);
                }
                break;
                
            case 'very-high':
                // Teletrasporto per personaggi aggiuntivi (anche durante entrata)
                if (!character.isEntering) {
                    // Solo se NON sta entrando (l'entrata ha il suo controllo)
                    character.randomizePosition();
                    character.character.classList.add('glitching');
                    setTimeout(() => {
                        character.character.classList.remove('glitching');
                    }, 500);
                }
                // Se sta entrando, moveToTargetWithRandomness gestisce il teletrasporto
                break;
        }
    }

    getActivityIntensity() {
        if (this.activityLevel < this.activityThresholds.low) return 'low';
        if (this.activityLevel < this.activityThresholds.medium) return 'medium';
        if (this.activityLevel < this.activityThresholds.high) return 'high';
        return 'very-high';
    }

    triggerMinorGlitch() {
        console.log("🖱️ Glitch minore da movimento mouse");
        this.kernel.glitch();
        
        if (this.kernel.behaviorCycle && !this.kernel.behaviorCycle.isRespondingToMouse) {
            const directions = [
                { x: 1, y: 0 }, { x: -1, y: 0 },
                { x: 0, y: 1 }, { x: 0, y: -1 }
            ];
            const randomDir = directions[Math.floor(Math.random() * directions.length)];
            
            setTimeout(() => {
                if (this.kernel.behaviorCycle) {
                    this.kernel.behaviorCycle.mouseTarget = randomDir;
                }
            }, 100);
        }
    }

    triggerHyperactiveBehavior() {
        console.log("🖱️ Comportamento iperattivo da movimento mouse!");
        
        if (this.kernel.behaviorCycle) {
            if (this.originalSpeedMultiplier === null) {
                this.originalSpeedMultiplier = this.kernel.behaviorCycle.speedMultiplier;
            }
            
            this.kernel.behaviorCycle.speedMultiplier = this.originalSpeedMultiplier * 1.8;
            
            this.startHyperactiveMovement();
        }
    }

    triggerPanicBehavior() {
        console.log("🖱️ PANICO da movimento mouse! Scappo!");
        
        if (this.kernel.behaviorCycle) {
            if (this.originalSpeedMultiplier === null) {
                this.originalSpeedMultiplier = this.kernel.behaviorCycle.speedMultiplier;
            }
            
            this.kernel.behaviorCycle.isEscaping = true;
            this.kernel.behaviorCycle.escapeSteps = 0;
            
            this.calculateEscapeDirection();
            
            setTimeout(() => {
                if (this.kernel.behaviorCycle && this.kernel.behaviorCycle.isEscaping) {
                    this.triggerMouseTeleport();
                }
            }, 800);
        }
    }

    calculateEscapeDirection() {
        const charCenterX = this.kernel.currentPosition.x + (this.kernel.characterWidth / 2);
        const charCenterY = this.kernel.currentPosition.y + (this.kernel.characterHeight / 2);
        
        const mouseGridX = Math.floor(this.lastMouseX / this.kernel.gridSize);
        const mouseGridY = Math.floor(this.lastMouseY / this.kernel.gridSize);
        
        const dx = mouseGridX - charCenterX;
        const dy = mouseGridY - charCenterY;
        
        const escapeDx = -dx;
        const escapeDy = -dy;
        
        const magnitude = Math.sqrt(escapeDx * escapeDx + escapeDy * escapeDy);
        if (magnitude > 0) {
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
            
            this.kernel.behaviorCycle.mouseTarget = directions[directionIndex];
        }
    }

    startHyperactiveMovement() {
        if (!this.kernel.behaviorCycle) return;
        
        let hyperactiveCounter = 0;
        const maxHyperactiveMoves = 5;
        
        const hyperactiveMove = () => {
            if (hyperactiveCounter >= maxHyperactiveMoves || 
                !this.kernel.behaviorCycle || 
                !this.isActive) return;
            
            const directions = [
                { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 },
                { x: 1, y: 1 }, { x: 1, y: -1 }, { x: -1, y: 1 }, { x: -1, y: -1 }
            ];
            
            this.kernel.behaviorCycle.mouseTarget = 
                directions[Math.floor(Math.random() * directions.length)];
            
            hyperactiveCounter++;
            
            if (hyperactiveCounter < maxHyperactiveMoves) {
                setTimeout(hyperactiveMove, 200);
            }
        };
        
        hyperactiveMove();
    }

    triggerMouseTeleport() {
        console.log("🖱️ Teletrasporto da movimento mouse!");
        
        this.kernel.randomizePosition();
        
        this.kernel.character.classList.add('glitching');
        setTimeout(() => {
            this.kernel.character.classList.remove('glitching');
        }, 500);
        
        setTimeout(() => {
            if (this.kernel.behaviorCycle) {
                this.kernel.behaviorCycle.isEscaping = false;
                this.kernel.behaviorCycle.mouseTarget = null;
            }
        }, 1000);
    }

    cleanOldMovements() {
        const now = Date.now();
        this.mouseMovements = this.mouseMovements.filter(movement => 
            now - movement.time < 3000
        );
    }

    getActivityMultiplier() {
        return 1 + (this.activityLevel * 2);
    }

    stop() {
        this.isActive = false;
        this.mouseMovements = [];
        this.activityLevel = 0;
        
        if (this.inactivityTimer) {
            clearTimeout(this.inactivityTimer);
        }
        
        if (this.kernel.behaviorCycle && this.originalSpeedMultiplier !== null) {
            this.kernel.behaviorCycle.speedMultiplier = this.originalSpeedMultiplier;
        }
        
        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('wheel', this.handleMouseWheel);
        
        console.log("🛑 Mouse movement detector fermato");
    }
}

class KeyboardDetector extends MouseMovementDetector {
    constructor(kernelFragment) {
        super(kernelFragment);
    }
}