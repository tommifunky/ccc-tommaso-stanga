(function () {
  const hoursLine = document.querySelector('.hours-line');
  const minutesLine = document.querySelector('.minutes-line');
  const secondsLine = document.querySelector('.seconds-line');
  const hoursRect = document.querySelector('.hours-rect');
  const minutesRect = document.querySelector('.minutes-rect');
  const secondsRect = document.querySelector('.seconds-rect');
  const timeDisplay = docuyxc vbnxcv x ment.getElementById('time-display');
  const cpuDisplay = document.querySelector('.cpu-display');

  let isTimeVisible = false;
  let updateInterval;
  let currentCpuLoad = 0;

  function hideAllElements() {
    [hoursRect, minutesRect, secondsRect, hoursLine, minutesLine, secondsLine, cpuDisplay].forEach(element => {
      if (element) {
        element.style.opacity = '0';
        element.style.transform = 'translate(-50%, -50%) scale(0.8)';
      }
    });
  }

  function animateElement(element, delay) {
    setTimeout(() => {
      if (element) {
        element.style.opacity = '1';
        element.style.transform = 'translate(-50%, -50%) scale(1)';
      }
    }, delay);
  }

  function startAnimationSequence() {
    hideAllElements();
    animateElement(hoursRect, 200);
    animateElement(minutesRect, 500);
    animateElement(secondsRect, 800);
    animateElement(hoursLine, 1100);
    animateElement(minutesLine, 1400);
    animateElement(secondsLine, 1700);
    animateElement(cpuDisplay, 2000);
  }

  function updateTimeDisplay() {
    const now = new Date();
    timeDisplay.textContent = now.toTimeString().split(' ')[0];
  }

  function updateCpuDisplay() {
    if (cpuDisplay) {
      cpuDisplay.textContent = `CPU: ${currentCpuLoad.toFixed(1)}%`;
    }
  }

  function updateShadows() {
    const intensity = 0.1 + (currentCpuLoad / 100) * 0.9;
    const blur = 5 + (currentCpuLoad / 100) * 25;
    const spread = (currentCpuLoad / 100) * 10;
    
    const shadowColor = `rgba(255, 255, 255, ${0.05 + intensity * 0.2})`;
    const strongShadowColor = `rgba(255, 255, 255, ${0.1 + intensity * 0.3})`;
    
    const boxShadow = `0 0 ${blur}px ${spread}px ${shadowColor}, 0 0 ${blur * 2}px ${spread}px ${strongShadowColor}`;

    [hoursRect, minutesRect, secondsRect].forEach(rect => {
      if (rect) rect.style.boxShadow = boxShadow;
    });
  }

  function toggleTime() {
    if (isTimeVisible) {
      timeDisplay.style.display = 'none';
      isTimeVisible = false;
      clearInterval(updateInterval);
    } else {
      updateTimeDisplay();
      timeDisplay.style.display = 'block';
      isTimeVisible = true;
      clearInterval(updateInterval);
      updateInterval = setInterval(updateTimeDisplay, 1000);
    }
  }

  function updateLines() {
    const now = new Date();
    const hours = now.getHours();
    const hoursInCycle = hours >= 12 ? hours - 12 : hours;
    const hoursProgress = hoursInCycle / 12;
    hoursLine.style.left = `calc(50% - 40px + ${hoursProgress * 80}px)`;
    
    const minutes = now.getMinutes();
    const minutesProgress = minutes / 60;
    minutesLine.style.top = `calc(50% - 75px + ${minutesProgress * 150}px)`;
    
    const seconds = now.getSeconds();
    const secondsProgress = seconds / 60;
    secondsLine.style.left = `calc(50% - 150px + ${secondsProgress * 300}px)`;
  }

  window.addEventListener('cpuLoadUpdate', (e) => {
    currentCpuLoad = e.detail.currentLoad;
    updateShadows();
    updateCpuDisplay();
  });

  [hoursRect, minutesRect, secondsRect].forEach(rect => {
    rect.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleTime();
    });
  });

  function init() {
    hideAllElements();
    startAnimationSequence();
    updateLines();
    updateShadows();
    updateCpuDisplay();
    setInterval(updateLines, 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();