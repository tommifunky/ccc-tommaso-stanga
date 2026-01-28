class AudioDetector {
    constructor(kernelFragment) {
        this.kernel = kernelFragment;
        this.audioContext = null;
        this.analyser = null;
        this.microphone = null;
        this.isActive = false;
        this.volumeLevel = 0;
        this.volumeThresholds = {
            low: 0.1,
            medium: 0.3,
            high: 0.6
        };
        
        this.init();
    }

    async init() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false
                } 
            });
            
            this.microphone = this.audioContext.createMediaStreamSource(stream);
            this.microphone.connect(this.analyser);
            
            this.isActive = true;
            this.startVolumeAnalysis();
            
            console.log("🎤 Audio detector attivato!");
            
        } catch (error) {
            console.error('Errore inizializzazione audio detector:', error);
            this.simulateVolumeForTesting();
        }
    }

    startVolumeAnalysis() {
        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        
        const analyzeVolume = () => {
            if (!this.isActive) return;
            
            this.analyser.getByteFrequencyData(dataArray);
            
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i];
            }
            const average = sum / dataArray.length;
            
            this.volumeLevel = Math.min(average / 128, 1);
            
            requestAnimationFrame(analyzeVolume);
        };
        
        analyzeVolume();
    }

    simulateVolumeForTesting() {
        console.log("🔊 Modalità testing audio attivata - usa setTestVolume(level) per testare");
        this.isActive = true;
        this.volumeLevel = 0;
        
        window.setTestVolume = (level) => {
            this.volumeLevel = Math.max(0, Math.min(1, level));
            console.log(`🔊 Volume di test impostato a: ${this.volumeLevel.toFixed(2)}`);
        };
    }

    getVolumeLevel() {
        return this.volumeLevel;
    }

    getVolumeIntensity() {
        const volume = this.volumeLevel;
        if (volume < this.volumeThresholds.low) return 'low';
        if (volume < this.volumeThresholds.medium) return 'medium';
        if (volume < this.volumeThresholds.high) return 'high';
        return 'very-high';
    }

    getFootprintMultiplier() {
        const intensity = this.getVolumeIntensity();
        switch (intensity) {
            case 'low': return 1;
            case 'medium': return 3;
            case 'high': return 6;
            case 'very-high': return 10;
            default: return 1;
        }
    }

    stop() {
        this.isActive = false;
        if (this.microphone) {
            this.microphone.disconnect();
        }
        if (this.audioContext) {
            this.audioContext.close();
        }
        console.log("🔇 Audio detector fermato");
    }
}