class HandDetector {
    constructor(kernelFragment) {
        this.kernel = kernelFragment;
        this.video = null;
        this.canvas = null;
        this.ctx = null;
        this.isActive = false;
        this.handPixels = [];
        this.detectionInterval = null;
        this.hands = null;
        this.camera = null;
        
        this.occupiedPositions = new Set();
        
        this.handConnections = [
            [0, 1], [1, 2], [2, 3], [3, 4],
            [0, 5], [5, 6], [6, 7], [7, 8],
            [0, 9], [9, 10], [10, 11], [11, 12],
            [0, 13], [13, 14], [14, 15], [15, 16],
            [0, 17], [17, 18], [18, 19], [19, 20],
            [5, 9], [9, 13], [13, 17]
        ];
        
        this.handPolygons = [
            [1, 2, 3, 4],
            [5, 6, 7, 8],
            [9, 10, 11, 12],
            [13, 14, 15, 16],
            [17, 18, 19, 20],
            [0, 5, 9, 13, 17]
        ];
        
        this.init();
    }

    async init() {
        try {
            this.createCameraElements();
            
            this.hands = new Hands({
                locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
            });

            this.hands.setOptions({
                maxNumHands: 2,
                modelComplexity: 1,
                minDetectionConfidence: 0.7,
                minTrackingConfidence: 0.5
            });

            this.hands.onResults(this.onHandResults.bind(this));

            this.camera = new Camera(this.video, {
                onFrame: async () => {
                    if (this.hands) {
                        await this.hands.send({ image: this.video });
                    }
                },
                width: 640,
                height: 480
            });

            await this.camera.start();
            this.isActive = true;
            
            console.log("🎥 Hand detector attivato!");

        } catch (error) {
            console.error('Errore inizializzazione hand detection:', error);
        }
    }

    createCameraElements() {
        this.video = document.createElement('video');
        this.video.autoplay = true;
        this.video.playsinline = true;
        this.video.muted = true;
        this.video.style.display = 'none';
        document.body.appendChild(this.video);

        this.canvas = document.createElement('canvas');
        this.canvas.style.display = 'none';
        document.body.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');
    }

    onHandResults(results) {
        if (!this.isActive) return;

        this.canvas.width = this.video.videoWidth || 640;
        this.canvas.height = this.video.videoHeight || 480;

        this.clearHandPixels();

        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            for (const landmarks of results.multiHandLandmarks) {
                this.drawHandOnGrid(landmarks);
            }
            
            this.checkHandFootprintInteraction();
            this.checkHandCharacterInteraction();
        }
    }

    checkHandFootprintInteraction() {
        if (!this.kernel) {
            return;
        }

        // Ottimizzazione: controlla solo 1 pixel su 3 per ridurre carico
        for (let i = 0; i < this.handPixels.length; i += 3) {
            const handPixel = this.handPixels[i];
            const handRect = handPixel.getBoundingClientRect();
            const handCenterX = handRect.left + handRect.width / 2;
            const handCenterY = handRect.top + handRect.height / 2;
            
            const gridX = Math.floor(handCenterX / this.kernel.gridSize);
            const gridY = Math.floor(handCenterY / this.kernel.gridSize);
            
            this.removePixelsNearPosition(gridX, gridY, 3);
        }
    }

    checkHandCharacterInteraction() {
        if (!this.kernel || !this.handPixels.length) {
            return;
        }

        // Ottimizzazione: controlla solo 1 pixel su 5 per ridurre carico
        for (let i = 0; i < this.handPixels.length; i += 5) {
            const handPixel = this.handPixels[i];
            const handRect = handPixel.getBoundingClientRect();
            const handCenterX = handRect.left + handRect.width / 2;
            const handCenterY = handRect.top + handRect.height / 2;
            
            const handGridX = Math.floor(handCenterX / this.kernel.gridSize);
            const handGridY = Math.floor(handCenterY / this.kernel.gridSize);
            
            // Controlla collisione con personaggio principale
            if (this.kernel.isActive && !this.kernel.isRunningFromCollision) {
                const charCenterX = this.kernel.currentPosition.x + (this.kernel.characterWidth / 2);
                const charCenterY = this.kernel.currentPosition.y + (this.kernel.characterHeight / 2);
                
                const distance = Math.sqrt(
                    Math.pow(handGridX - charCenterX, 2) + 
                    Math.pow(handGridY - charCenterY, 2)
                );
                
                if (distance <= 8) { // Stesso raggio delle collisioni tra personaggi
                    console.log("🖐️ Mano tocca personaggio principale!");
                    // Il behavior cycle gestirà la fuga quando rileva la mano vicina
                }
            }
            
            // Controlla collisione con personaggi aggiuntivi
            if (window.additionalCharacters) {
                for (const char of window.additionalCharacters) {
                    if (!char.isActive || char.isRunningFromCollision) continue;
                    
                    const charCenterX = char.currentPosition.x + (char.characterWidth / 2);
                    const charCenterY = char.currentPosition.y + (char.characterHeight / 2);
                    
                    const distance = Math.sqrt(
                        Math.pow(handGridX - charCenterX, 2) + 
                        Math.pow(handGridY - charCenterY, 2)
                    );
                    
                    if (distance <= 8) { // Stesso raggio delle collisioni tra personaggi
                        console.log(`🖐️ Mano tocca personaggio ${char.color}!`);
                        // Il behavior cycle gestirà la fuga quando rileva la mano vicina
                    }
                }
            }
        }
    }

    drawHandOnGrid(landmarks) {
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        
        const gridLandmarks = [];
        
        for (let i = 0; i < landmarks.length; i++) {
            const landmark = landmarks[i];
            
            const mirroredX = 1 - landmark.x;
            
            const gridX = Math.floor(mirroredX * (screenWidth / this.kernel.gridSize));
            const gridY = Math.floor(landmark.y * (screenHeight / this.kernel.gridSize));
            
            gridLandmarks.push({ x: gridX, y: gridY });
        }
        
        this.occupiedPositions.clear();
        
        this.drawHandConnections(gridLandmarks);
        
        this.fillHandAreas(gridLandmarks);
    }

    drawHandConnections(landmarks) {
        for (const connection of this.handConnections) {
            const start = landmarks[connection[0]];
            const end = landmarks[connection[1]];
            
            if (start && end) {
                this.drawLine(start.x, start.y, end.x, end.y);
            }
        }
    }

    drawLine(x1, y1, x2, y2) {
        const dx = Math.abs(x2 - x1);
        const dy = Math.abs(y2 - y1);
        const sx = (x1 < x2) ? 1 : -1;
        const sy = (y1 < y2) ? 1 : -1;
        let err = dx - dy;
        
        let currentX = x1;
        let currentY = y1;
        
        while (true) {
            this.createHandPixel(currentX, currentY);
            
            if (currentX === x2 && currentY === y2) break;
            
            const e2 = 2 * err;
            if (e2 > -dy) {
                err -= dy;
                currentX += sx;
            }
            if (e2 < dx) {
                err += dx;
                currentY += sy;
            }
        }
    }

    fillHandAreas(landmarks) {
        for (const polygon of this.handPolygons) {
            const points = polygon.map(index => landmarks[index]);
            
            const minX = Math.min(...points.map(p => p.x));
            const maxX = Math.max(...points.map(p => p.x));
            const minY = Math.min(...points.map(p => p.y));
            const maxY = Math.max(...points.map(p => p.y));
            
            for (let x = minX; x <= maxX; x++) {
                for (let y = minY; y <= maxY; y++) {
                    if (this.isPointInPolygon(x, y, points)) {
                        this.createHandPixel(x, y);
                    }
                }
            }
        }
    }

    isPointInPolygon(x, y, polygon) {
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i].x, yi = polygon[i].y;
            const xj = polygon[j].x, yj = polygon[j].y;
            
            const intersect = ((yi > y) !== (yj > y)) &&
                (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            
            if (intersect) inside = !inside;
        }
        return inside;
    }

    createHandPixel(x, y) {
    if (!this.isValidScreenPosition(x, y)) return;

    const positionKey = `${x},${y}`;
    if (this.occupiedPositions.has(positionKey)) {
        return;
    }
    
    this.occupiedPositions.add(positionKey);

    // MODIFICA QUI: Crea un div invece di un'immagine per avere colore bianco puro
    const pixelElement = document.createElement('div'); // Cambia da 'img' a 'div'
    pixelElement.className = 'hand-pixel';
    
    // Rimuovi la src dell'immagine e usa background-color bianco
    // pixelElement.src = 'assets/pixel.png'; // ELIMINA QUESTA RIGA
    
    pixelElement.style.position = 'absolute';
    pixelElement.style.left = `${x * this.kernel.gridSize}px`;
    pixelElement.style.top = `${y * this.kernel.gridSize}px`;
    pixelElement.style.width = `${this.kernel.gridSize}px`;
    pixelElement.style.height = `${this.kernel.gridSize}px`;
    pixelElement.style.zIndex = '300';
    pixelElement.style.backgroundColor = '#FFFFFF'; // AGGIUNGI - BIANCO PURO
    pixelElement.style.imageRendering = 'pixelated';
    pixelElement.style.pointerEvents = 'none';
    pixelElement.style.opacity = '1'; // Puoi regolare l'opacità se vuoi

    this.kernel.container.appendChild(pixelElement);
    this.handPixels.push(pixelElement);
}

    isValidScreenPosition(x, y) {
        // Estendo l'area per includere anche fuori dalla griglia (dove entrano i personaggi)
        const totalCols = Math.floor(window.innerWidth / this.kernel.gridSize);
        const totalRows = Math.floor(window.innerHeight / this.kernel.gridSize);
        
        // Margine esteso per coprire aree fuori griglia
        const margin = 20;
        
        return x >= -margin && x <= totalCols + margin && y >= -margin && y <= totalRows + margin;
    }

    clearHandPixels() {
        for (const pixel of this.handPixels) {
            if (pixel.parentNode) {
                pixel.parentNode.removeChild(pixel);
            }
        }
        this.handPixels = [];
        
        this.occupiedPositions.clear();
    }

    removePixelsNearPosition(gridX, gridY, radius = 3) {
        if (!this.kernel) return 0;
        
        let pixelsRemoved = 0;
        
        if (this.kernel.footprintPixels && this.kernel.footprintPixels.length > 0) {
            const pixelsToRemove = [];
            
            for (let i = 0; i < this.kernel.footprintPixels.length; i++) {
                const pixel = this.kernel.footprintPixels[i];
                const distanceX = Math.abs(pixel.x - gridX);
                const distanceY = Math.abs(pixel.y - gridY);
                
                if (distanceX <= radius && distanceY <= radius) {
                    pixelsToRemove.push(i);
                }
            }
            
            for (let i = pixelsToRemove.length - 1; i >= 0; i--) {
                const pixelIndex = pixelsToRemove[i];
                const pixelElement = this.kernel.footprintPixels[pixelIndex].element;
                
                if (pixelElement) {
                    pixelElement.style.transition = 'opacity 0.3s ease';
                    pixelElement.style.opacity = '0';
                    
                    setTimeout(() => {
                        if (pixelElement.parentNode) {
                            pixelElement.parentNode.removeChild(pixelElement);
                        }
                    }, 300);
                }
                
                this.kernel.footprintPixels.splice(pixelIndex, 1);
                pixelsRemoved++;
            }
        }
        
        if (window.additionalCharacters) {
            for (let charIndex = 0; charIndex < window.additionalCharacters.length; charIndex++) {
                const character = window.additionalCharacters[charIndex];
                
                if (!character || !character.footprintPixels || !character.isActive) {
                    continue;
                }
                
                const pixelsToRemove = [];
                
                for (let i = 0; i < character.footprintPixels.length; i++) {
                    const pixel = character.footprintPixels[i];
                    if (!pixel) continue;
                    
                    const distanceX = Math.abs(pixel.x - gridX);
                    const distanceY = Math.abs(pixel.y - gridY);
                    
                    if (distanceX <= radius && distanceY <= radius) {
                        pixelsToRemove.push(i);
                    }
                }
                
                for (let i = pixelsToRemove.length - 1; i >= 0; i--) {
                    const pixelIndex = pixelsToRemove[i];
                    const pixelElement = character.footprintPixels[pixelIndex].element;
                    
                    if (pixelElement) {
                        pixelElement.style.transition = 'opacity 0.3s ease';
                        pixelElement.style.opacity = '0';
                        
                        setTimeout(() => {
                            if (pixelElement.parentNode) {
                                pixelElement.parentNode.removeChild(pixelElement);
                            }
                        }, 300);
                    }
                    
                    character.footprintPixels.splice(pixelIndex, 1);
                    pixelsRemoved++;
                }
            }
        }
        
        if (window.globalFootprintPixels && window.globalFootprintPixels.length > 0) {
            const pixelsToRemove = [];
            
            for (let i = 0; i < window.globalFootprintPixels.length; i++) {
                const pixel = window.globalFootprintPixels[i];
                if (!pixel || !pixel.element) continue;
                
                const distanceX = Math.abs(pixel.x - gridX);
                const distanceY = Math.abs(pixel.y - gridY);
                
                if (distanceX <= radius && distanceY <= radius) {
                    pixelsToRemove.push(i);
                }
            }
            
            for (let i = pixelsToRemove.length - 1; i >= 0; i--) {
                const pixelIndex = pixelsToRemove[i];
                const pixelElement = window.globalFootprintPixels[pixelIndex].element;
                
                if (pixelElement) {
                    pixelElement.style.transition = 'opacity 0.3s ease';
                    pixelElement.style.opacity = '0';
                    
                    setTimeout(() => {
                        if (pixelElement.parentNode) {
                            pixelElement.parentNode.removeChild(pixelElement);
                        }
                    }, 300);
                }
                
                window.globalFootprintPixels.splice(pixelIndex, 1);
                pixelsRemoved++;
            }
        }
        
        return pixelsRemoved;
    }

    stop() {
        this.isActive = false;
        
        if (this.camera) {
            this.camera.stop();
        }
        
        this.clearHandPixels();
        
        if (this.video && this.video.parentNode) {
            this.video.parentNode.removeChild(this.video);
        }
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
        
        console.log("🛑 Hand detector fermato");
    }
}