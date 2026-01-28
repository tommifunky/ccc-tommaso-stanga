/**
 * Audio Pool Manager
 * Sistema avanzato per gestire la riproduzione dei suoni senza sovrapposizioni eccessive
 */

class AudioPoolManager {
  constructor() {
    this.pools = {
      step: {
        maxInstances: 3, // Massimo 3 suoni di passo contemporaneamente
        instances: [],
        baseVolume: 0.03,
        cooldown: 100 // ms tra un suono e l'altro dello stesso tipo
      },
      spawn: {
        maxInstances: 1,
        instances: [],
        baseVolume: 0.1,
        cooldown: 50
      },
      alt: {
        maxInstances: 1,
        instances: [],
        baseVolume: 0.1,
        cooldown: 50
      },
      despawn: {
        maxInstances: 1,
        instances: [],
        baseVolume: 0.1,
        cooldown: 50
      }
    };
    
    this.lastPlayTime = {};
    this.isInitialized = false;
    
    this.init();
  }
  
  init() {
    // Precarica i suoni
    this.preloadSounds();
    this.isInitialized = true;
    console.log("🎵 Audio Pool Manager inizializzato");
  }
  
  preloadSounds() {
    // Crea elementi audio per il precaricamento
    const audioFiles = [
      { name: 'step', url: 'assets/step.mp3' },
      { name: 'spawn', url: 'assets/spawn.wav' },
      { name: 'alt', url: 'assets/alt.wav' }
    ];
    
    audioFiles.forEach(file => {
      const audio = new Audio(file.url);
      audio.preload = 'auto';
      audio.load();
      
      // Salva riferimento per clonazione
      if (!this.pools[file.name]) return;
      this.pools[file.name].audioTemplate = audio;
    });
  }
  
  /**
   * Riproduce un suono gestendo le sovrapposizioni
   * @param {string} soundType - Tipo di suono (step, spawn, alt, despawn)
   * @param {number} playbackRate - Velocità di riproduzione (default: 1.0)
   * @param {number} volumeMultiplier - Moltiplicatore volume (default: 1.0)
   * @returns {Audio|null} - Elemento audio riprodotto o null se non riprodotto
   */
  playSound(soundType, playbackRate = 1.0, volumeMultiplier = 1.0) {
    if (!this.isInitialized || !this.pools[soundType]) {
      return null;
    }
    
    const pool = this.pools[soundType];
    const now = Date.now();
    
    // Controllo cooldown: evita suoni troppo ravvicinati
    if (this.lastPlayTime[soundType] && 
        now - this.lastPlayTime[soundType] < pool.cooldown) {
      return null;
    }
    
    // Controllo massimo numero di istanze
    this.cleanupInstances(soundType);
    
    if (pool.instances.length >= pool.maxInstances) {
      // Troppe istanze attive, cerca di fermarne una vecchia
      const oldestInstance = this.findOldestInstance(soundType);
      if (oldestInstance) {
        oldestInstance.pause();
        oldestInstance.currentTime = 0;
        this.removeInstance(soundType, oldestInstance);
      } else {
        return null; // Non riprodurre
      }
    }
    
    // Crea o clona l'audio
    let audio;
    if (pool.audioTemplate) {
      audio = pool.audioTemplate.cloneNode();
    } else {
      // Fallback: crea nuovo audio
      const url = soundType === 'step' ? 'assets/step.mp3' : 
                  soundType === 'spawn' ? 'assets/spawn.wav' : 
                  soundType === 'alt' ? 'assets/alt.wav' :
                  'assets/spawn.wav'; // despawn usa spawn.wav
      audio = new Audio(url);
    }
    
    // Configura audio
    audio.volume = Math.min(1.0, pool.baseVolume * volumeMultiplier);
    audio.playbackRate = Math.max(0.6, Math.min(1.5, playbackRate));
    
    // Imposta eventi per la pulizia
    audio.onended = () => {
      this.removeInstance(soundType, audio);
    };
    
    audio.onerror = () => {
      console.log(`Audio error for ${soundType}`);
      this.removeInstance(soundType, audio);
    };
    
    // Riproduci
    audio.play().catch(error => {
      console.log(`Failed to play ${soundType}:`, error);
      this.removeInstance(soundType, audio);
      return null;
    });
    
    // Aggiungi all'istanza
    pool.instances.push({
      audio: audio,
      startTime: now,
      soundType: soundType
    });
    
    this.lastPlayTime[soundType] = now;
    return audio;
  }
  
  /**
   * Pulisce le istanze terminate
   */
  cleanupInstances(soundType) {
    const pool = this.pools[soundType];
    if (!pool) return;
    
    const now = Date.now();
    const maxAge = 5000; // 5 secondi max
    
    pool.instances = pool.instances.filter(instance => {
      // Rimuovi se:
      // 1. L'audio è terminato
      // 2. L'audio è in errore
      // 3. È troppo vecchio (timeout di sicurezza)
      if (instance.audio.ended || 
          instance.audio.error || 
          (now - instance.startTime > maxAge)) {
        
        // Ferma e pulisci
        instance.audio.pause();
        instance.audio.currentTime = 0;
        return false;
      }
      return true;
    });
  }
  
  /**
   * Trova l'istanza più vecchia di un tipo
   */
  findOldestInstance(soundType) {
    const pool = this.pools[soundType];
    if (!pool || pool.instances.length === 0) return null;
    
    let oldest = pool.instances[0];
    for (const instance of pool.instances) {
      if (instance.startTime < oldest.startTime) {
        oldest = instance;
      }
    }
    return oldest.audio;
  }
  
  /**
   * Rimuove un'istanza specifica
   */
  removeInstance(soundType, audioElement) {
    const pool = this.pools[soundType];
    if (!pool) return;
    
    pool.instances = pool.instances.filter(instance => 
      instance.audio !== audioElement
    );
  }
  
  /**
   * Ferma tutti i suoni di un tipo specifico
   */
  stopAllSounds(soundType = null) {
    if (soundType) {
      // Ferma solo un tipo specifico
      const pool = this.pools[soundType];
      if (pool) {
        pool.instances.forEach(instance => {
          instance.audio.pause();
          instance.audio.currentTime = 0;
        });
        pool.instances = [];
      }
    } else {
      // Ferma tutti i suoni
      Object.values(this.pools).forEach(pool => {
        pool.instances.forEach(instance => {
          instance.audio.pause();
          instance.audio.currentTime = 0;
        });
        pool.instances = [];
      });
    }
  }
  
  /**
   * Imposta il volume base per un tipo di suono
   */
  setBaseVolume(soundType, volume) {
    if (this.pools[soundType]) {
      this.pools[soundType].baseVolume = Math.max(0, Math.min(1, volume));
    }
  }
  
  /**
   * Ottiene statistiche sui suoni attivi
   */
  getStats() {
    const stats = {};
    Object.keys(this.pools).forEach(soundType => {
      stats[soundType] = {
        active: this.pools[soundType].instances.length,
        max: this.pools[soundType].maxInstances,
        volume: this.pools[soundType].baseVolume
      };
    });
    return stats;
  }
}

// Crea istanza globale
let audioPool = null;

/**
 * Inizializza l'audio pool (da chiamare al DOMContentLoaded)
 */
function initAudioPool() {
  if (!audioPool) {
    audioPool = new AudioPoolManager();
  }
  return audioPool;
}

/**
 * Funzione helper per riprodurre suoni tramite il pool
 */
function playPooledSound(soundType, playbackRate = 1.0, volumeMultiplier = 1.0) {
  if (!audioPool) {
    initAudioPool();
  }
  return audioPool.playSound(soundType, playbackRate, volumeMultiplier);
}

// Esponi globalmente
if (typeof window !== 'undefined') {
  window.AudioPoolManager = AudioPoolManager;
  window.initAudioPool = initAudioPool;
  window.playPooledSound = playPooledSound;
  
  // Inizializza quando il DOM è pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAudioPool);
  } else {
    initAudioPool();
  }
}