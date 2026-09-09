/* ==========================================================================
   BHAVYA JANGID'S PORTFOLIO JS ENGINE
   ========================================================================== */

// State variables
let pose = 'standing'; // 'standing', 'left-strafe', 'left-move', 'right-strafe', 'right-move'
let lastKey = null; // 'left' or 'right'
let charXPercent = 12.5; // Starts aligned with About tab (index 0)

// Configurable settings
let stepSize = 1.2; // percentage step size per walk cycle
let spriteScale = 20; // % of viewport height / track width
let clickVolume = 0.4; // mechanical click volume
let waveVolume = 0.0; // default waves volume (0% = sound off by default)
let isSoundMuted = true; // start muted by default

// Long-press walking state
let keysHeld = { left: false, right: false };
let inputLoopInterval = null;
let isFastTravelling = false;

// DOM Elements
const spriteWrapper = document.getElementById('spriteWrapper');
const characterSprite = document.getElementById('characterSprite');
const navTabs = document.querySelectorAll('.nav-tab');
const cardSections = document.querySelectorAll('.card-section');

// Key Caps & Controls
const keyLeft = document.getElementById('keyLeft');
const keyRight = document.getElementById('keyRight');
const soundToggle = document.getElementById('soundToggle');
const soundStateLbl = document.querySelector('.sound-state-lbl');

// Modals & Sub-pages
const btnReadMore = document.getElementById('btnReadMore');
const modals = {
    0: document.getElementById('modal-about'),
    1: document.getElementById('modal-projects'),
    2: document.getElementById('modal-blogs'),
    3: document.getElementById('modal-contact')
};
const closeButtons = document.querySelectorAll('.modal-close-btn');
const modalOverlays = document.querySelectorAll('.modal-overlay');

// Settings Sidebar
const btnSettings = document.getElementById('btnSettings');
const settingsSidebar = document.getElementById('settingsSidebar');
const btnCloseSettings = document.getElementById('btnCloseSettings');
const settingsOverlay = document.getElementById('settingsOverlay');

const sliderSize = document.getElementById('sliderSize');
const valSize = document.getElementById('valSize');
const sliderStep = document.getElementById('sliderStep');
const valStep = document.getElementById('valStep');
const sliderVolume = document.getElementById('sliderVolume');
const valVolume = document.getElementById('valVolume');
const sliderWaveVolume = document.getElementById('sliderWaveVolume');
const valWaveVolume = document.getElementById('valWaveVolume');
const inputColorTheme = document.getElementById('inputColorTheme');
const lblColorHex = document.getElementById('lblColorHex');

// Sidebar Logs
const debugX = document.getElementById('debugX');
const debugState = document.getElementById('debugState');

/* ==========================================================================
   AUDIO SYNTHESIZER ENGINE (WEB AUDIO API)
   ========================================================================== */
let audioCtx = null;
let wavesSource = null;
let wavesGain = null;
let wavesLFO = null;
let wavesActive = false;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

/**
 * Synthesizes mechanical keyboard click and key bottom clack
 */
function playMechanicalClick() {
    if (isSoundMuted || clickVolume <= 0) return;
    
    try {
        initAudio();
        const now = audioCtx.currentTime;
        
        // High frequency transient (noise click)
        const bufferSize = audioCtx.sampleRate * 0.01;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        const noiseNode = audioCtx.createBufferSource();
        noiseNode.buffer = buffer;
        
        const bandpass = audioCtx.createBiquadFilter();
        bandpass.type = 'bandpass';
        bandpass.frequency.setValueAtTime(5800, now);
        bandpass.Q.setValueAtTime(5, now);
        
        const noiseGain = audioCtx.createGain();
        noiseGain.gain.setValueAtTime(clickVolume * 0.14, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.008);
        
        noiseNode.connect(bandpass);
        bandpass.connect(noiseGain);
        noiseGain.connect(audioCtx.destination);
        
        // Low frequency bottom-out resonance (clack)
        const osc = audioCtx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(165, now);
        
        const clackGain = audioCtx.createGain();
        clackGain.gain.setValueAtTime(clickVolume * 0.09, now);
        clackGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
        
        osc.connect(clackGain);
        clackGain.connect(audioCtx.destination);
        
        noiseNode.start(now);
        osc.start(now);
        osc.stop(now + 0.07);
    } catch (e) {
        console.warn("Click Synth Error: ", e);
    }
}

/**
 * Synthesizes ambient waves with half-frequency modulation (0.075Hz)
 */
function startWaves() {
    if (wavesActive) return;
    try {
        initAudio();
        const now = audioCtx.currentTime;

        // Loopable Noise Buffer (3 seconds)
        const sampleRate = audioCtx.sampleRate;
        const bufferSize = sampleRate * 3.0;
        const buffer = audioCtx.createBuffer(1, bufferSize, sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        wavesSource = audioCtx.createBufferSource();
        wavesSource.buffer = buffer;
        wavesSource.loop = true;

        // Lowpass Filter for waves tone (deeper baseline cutoff)
        const wavesFilter = audioCtx.createBiquadFilter();
        wavesFilter.type = 'lowpass';
        wavesFilter.frequency.setValueAtTime(320, now);
        wavesFilter.Q.setValueAtTime(1.0, now);

        wavesGain = audioCtx.createGain();
        // Fall back to default config volume if waveVolume is set to 0 initially
        const vol = waveVolume > 0 ? waveVolume : 0.25;
        wavesGain.gain.setValueAtTime(vol * 0.12, now);

        wavesSource.connect(wavesFilter);
        wavesFilter.connect(wavesGain);
        wavesGain.connect(audioCtx.destination);

        // Slow Modulator LFO (0.075 Hz - sweeps every 13.3 seconds)
        wavesLFO = audioCtx.createOscillator();
        wavesLFO.type = 'sine';
        wavesLFO.frequency.setValueAtTime(0.075, now);

        // Modulate Filter Frequency +/- 200Hz
        const filterGain = audioCtx.createGain();
        filterGain.gain.setValueAtTime(200, now);
        wavesLFO.connect(filterGain);
        filterGain.connect(wavesFilter.frequency);

        // Modulate Volume Gain
        const volumeLfoGain = audioCtx.createGain();
        volumeLfoGain.gain.setValueAtTime(vol * 0.05, now);
        wavesLFO.connect(volumeLfoGain);
        volumeLfoGain.connect(wavesGain.gain);

        wavesSource.start(now);
        wavesLFO.start(now);
        wavesActive = true;
        isSoundMuted = false;
        
        soundToggle.classList.add('sound-on');
        soundStateLbl.textContent = 'Sound On';
        
        // Sync wave volume slider if it was at 0
        if (waveVolume === 0) {
            waveVolume = 0.25;
            sliderWaveVolume.value = 25;
            valWaveVolume.textContent = '25%';
        }
    } catch (e) {
        console.warn("Waves Synth Error:", e);
    }
}

function stopWaves() {
    if (!wavesActive) return;
    try {
        wavesSource.stop();
        wavesLFO.stop();
        wavesSource = null;
        wavesLFO = null;
        wavesActive = false;
        isSoundMuted = true;
        
        soundToggle.classList.remove('sound-on');
        soundStateLbl.textContent = 'Sound Off';
    } catch (e) {
        console.warn(e);
    }
}

function toggleSound() {
    initAudio();
    if (wavesActive) {
        stopWaves();
    } else {
        startWaves();
        playMechanicalClick();
    }
}

soundToggle.addEventListener('click', toggleSound);

/* ==========================================================================
   TRANSITION STATE MACHINE & WALKPHYSICS
   ========================================================================== */

/**
 * Handle walking leftwards (Subtract position)
 */
function handleLeftMovement() {
    if (isFastTravelling) return;
    
    let nextPose = 'standing';
    if (pose === 'standing') {
        nextPose = 'left-strafe';
    } else if (pose === 'left-strafe') {
        nextPose = 'left-move';
    } else if (pose === 'left-move') {
        nextPose = 'left-strafe';
    } else if (pose === 'right-strafe') {
        nextPose = 'standing';
    } else if (pose === 'right-move') {
        nextPose = 'standing';
    }
    
    pose = nextPose;
    lastKey = 'left';
    
    // Walk step
    charXPercent -= stepSize;
    if (charXPercent < 12.5) charXPercent = 12.5;
    
    updateUI();
}

/**
 * Handle walking rightwards (Add position)
 */
function handleRightMovement() {
    if (isFastTravelling) return;
    
    let nextPose = 'standing';
    if (pose === 'standing') {
        nextPose = 'right-strafe';
    } else if (pose === 'right-strafe') {
        nextPose = 'right-move';
    } else if (pose === 'right-move') {
        nextPose = 'right-strafe';
    } else if (pose === 'left-strafe') {
        nextPose = 'standing';
    } else if (pose === 'left-move') {
        nextPose = 'standing';
    }
    
    pose = nextPose;
    lastKey = 'right';
    
    charXPercent += stepSize;
    if (charXPercent > 87.5) charXPercent = 87.5;
    
    updateUI();
}

/* ==========================================================================
   LONG-PRESS INPUT LOOPS
   ========================================================================== */

function startInputLoop() {
    if (inputLoopInterval) return;
    inputLoopInterval = setInterval(() => {
        if (keysHeld.left) {
            handleLeftMovement();
        } else if (keysHeld.right) {
            handleRightMovement();
        } else {
            stopInputLoop();
        }
    }, 70); // 70ms step updates for smooth holding speed
}

function stopInputLoop() {
    if (inputLoopInterval) {
        clearInterval(inputLoopInterval);
        inputLoopInterval = null;
    }
    if (!isFastTravelling && pose !== 'standing') {
        pose = 'standing';
        updateUI();
    }
}

/* ==========================================================================
   FAST-TRAVEL DIRECT GLIDES
   ========================================================================== */

function fastTravelTo(index) {
    if (isFastTravelling) return;
    
    // Target coordinate matching tab center
    const targetX = 12.5 + index * 25;
    if (charXPercent === targetX) return;
    
    isFastTravelling = true;
    stopInputLoop();
    playMechanicalClick();
    
    // Determine direction
    const isGoingRight = targetX > charXPercent;
    pose = isGoingRight ? 'right-move' : 'left-move';
    
    // Enable CSS transition temporarily
    spriteWrapper.style.setProperty('--char-transition', 'left 0.5s cubic-bezier(0.25, 1, 0.5, 1)');
    
    // Slide position
    charXPercent = targetX;
    updateUI();
    
    // Change to standing upon completion
    setTimeout(() => {
        spriteWrapper.style.setProperty('--char-transition', 'none');
        pose = 'standing';
        isFastTravelling = false;
        updateUI();
        playMechanicalClick();
    }, 500);
}

/* ==========================================================================
   UI HIGHLIGHT CUSTOM HEX COLOR PICKER
   ========================================================================== */

function hexToRgb(hex) {
    let shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
    let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

function applyCustomColor(hex) {
    const rgb = hexToRgb(hex);
    if (!rgb) return;
    
    document.documentElement.style.setProperty('--accent-color', hex);
    document.documentElement.style.setProperty('--accent-color-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
    document.documentElement.style.setProperty('--accent-glow', `0 0 12px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.7), 0 0 30px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.35)`);
    lblColorHex.textContent = hex.toUpperCase();
    
    // Persist highlight color to localStorage so subpages read it
    localStorage.setItem('portfolio-custom-color', hex);
}

inputColorTheme.addEventListener('input', (e) => {
    applyCustomColor(e.target.value);
});

/* ==========================================================================
   UI RE-RENDER ENGINE
   ========================================================================== */

function updateUI() {
    // 1. Update sprite class matching pose (DOM caching triggers visibility)
    spriteWrapper.className = `sprite-wrapper pose-${pose}`;
    
    // 2. Set horizontal coordinate
    document.documentElement.style.setProperty('--char-left', `${charXPercent}%`);
    
    // 3. Sync Active Tab & Central Content Card
    // Determine closest section based on current percentage position
    const closestSectionIndex = Math.min(3, Math.max(0, Math.round((charXPercent - 12.5) / 25)));
    
    // Highlights active tab highlight
    navTabs.forEach((tab, index) => {
        if (index === closestSectionIndex) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    // Fades in active center content section
    cardSections.forEach((section, index) => {
        if (index === closestSectionIndex) {
            section.classList.add('active');
        } else {
            section.classList.remove('active');
        }
    });

    // Dynamically sync Read More link href for crawlers and middle-clicks
    if (btnReadMore) {
        const tabUrls = { 0: '/about', 1: '/projects', 2: '/blogs', 3: '/contact' };
        btnReadMore.setAttribute('href', tabUrls[closestSectionIndex] || '/about');
    }
    
    // 4. Update Logs
    debugX.textContent = `${Math.round(charXPercent * 10) / 10}%`;
    debugState.textContent = pose.replace('-', ' ').toUpperCase();
}

/* ==========================================================================
   READ MORE DIRECT SUBPAGE NAVIGATOR
   ========================================================================== */

let isNavigating = false;

function triggerJumpAndNavigate(url) {
    if (isNavigating) return;
    isNavigating = true;
    
    stopInputLoop();
    pose = 'jumping';
    updateUI();
    playMechanicalClick();
    
    setTimeout(() => {
        window.location.href = url;
    }, 400);
}

if (btnReadMore) {
    btnReadMore.addEventListener('click', (e) => {
        e.preventDefault();
        const activeIndex = Math.min(3, Math.max(0, Math.round((charXPercent - 12.5) / 25)));
        const urls = {
            0: '/about',
            1: '/projects',
            2: '/blogs',
            3: '/contact'
        };
        triggerJumpAndNavigate(urls[activeIndex]);
    });
}

/* ==========================================================================
   INPUT EVENT LISTENERS
   ========================================================================== */

// Keyboard
document.addEventListener('keydown', (e) => {
    if (e.repeat) return; // let our inputLoop handle longpress instead of browser
    
    switch (e.key) {
        case 'ArrowRight':
        case 'd':
        case 'D':
            keysHeld.right = true;
            playMechanicalClick();
            startInputLoop();
            break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
            keysHeld.left = true;
            playMechanicalClick();
            startInputLoop();
            break;
        case ' ': // Space Bar triggers travel
            e.preventDefault();
            const activeIndex = Math.min(3, Math.max(0, Math.round((charXPercent - 12.5) / 25)));
            const urls = {
                0: '/about',
                1: '/projects',
                2: '/blogs',
                3: '/contact'
            };
            triggerJumpAndNavigate(urls[activeIndex]);
            break;
    }
});

document.addEventListener('keyup', (e) => {
    switch (e.key) {
        case 'ArrowRight':
        case 'd':
        case 'D':
            keysHeld.right = false;
            break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
            keysHeld.left = false;
            break;
    }
});

// Mechanical arrow buttons HUD mouse events (Long Press support)
keyLeft.addEventListener('mousedown', () => {
    keysHeld.left = true;
    playMechanicalClick();
    startInputLoop();
});
keyLeft.addEventListener('mouseup', () => { keysHeld.left = false; });
keyLeft.addEventListener('mouseleave', () => { keysHeld.left = false; });

keyRight.addEventListener('mousedown', () => {
    keysHeld.right = true;
    playMechanicalClick();
    startInputLoop();
});
keyRight.addEventListener('mouseup', () => { keysHeld.right = false; });
keyRight.addEventListener('mouseleave', () => { keysHeld.right = false; });

// Mechanical buttons mobile touches (Long Press support)
keyLeft.addEventListener('touchstart', (e) => {
    e.preventDefault();
    keysHeld.left = true;
    playMechanicalClick();
    startInputLoop();
});
keyLeft.addEventListener('touchend', (e) => {
    e.preventDefault();
    keysHeld.left = false;
});

keyRight.addEventListener('touchstart', (e) => {
    e.preventDefault();
    keysHeld.right = true;
    playMechanicalClick();
    startInputLoop();
});
keyRight.addEventListener('touchend', (e) => {
    e.preventDefault();
    keysHeld.right = false;
});

// Stepping Tabs trigger direct page navigation with jump animation
navTabs.forEach((tab) => {
    tab.addEventListener('click', (e) => {
        e.preventDefault();
        const target = e.currentTarget || e.target;
        const index = parseInt(target.getAttribute('data-index'));
        if (!isNaN(index)) {
            const urls = {
                0: '/about',
                1: '/projects',
                2: '/blogs',
                3: '/contact'
            };
            triggerJumpAndNavigate(urls[index]);
        }
    });
});

// Card tap/click triggers jump-travel on mobile
const mainContentCard = document.getElementById('mainContentCard');
if (mainContentCard) {
    mainContentCard.addEventListener('click', (e) => {
        // Prevent click if settings are open or if clicking read-more button (already handled)
        if (e.target.id === 'btnReadMore' || settingsSidebar.classList.contains('open')) return;
        const activeIndex = Math.min(3, Math.max(0, Math.round((charXPercent - 12.5) / 25)));
        const urls = {
            0: '/about',
            1: '/projects',
            2: '/blogs',
            3: '/contact'
        };
        triggerJumpAndNavigate(urls[activeIndex]);
    });
}

// Sprite click/tap triggers jump-travel on mobile
const avatarTrack = document.getElementById('avatarTrack');
if (avatarTrack) {
    avatarTrack.addEventListener('click', (e) => {
        e.stopPropagation();
        const activeIndex = Math.min(3, Math.max(0, Math.round((charXPercent - 12.5) / 25)));
        const urls = {
            0: '/about',
            1: '/projects',
            2: '/blogs',
            3: '/contact'
        };
        triggerJumpAndNavigate(urls[activeIndex]);
    });
}

/* ==========================================================================
   SETTINGS PANEL HANDLERS
   ========================================================================== */

btnSettings.addEventListener('click', () => {
    settingsSidebar.classList.add('open');
    settingsOverlay.classList.add('active');
    playMechanicalClick();
});

function closeSidebar() {
    settingsSidebar.classList.remove('open');
    settingsOverlay.classList.remove('active');
}

btnCloseSettings.addEventListener('click', closeSidebar);
settingsOverlay.addEventListener('click', closeSidebar);

// Sprite scale control
sliderSize.addEventListener('input', (e) => {
    spriteScale = parseInt(e.target.value);
    valSize.textContent = `${spriteScale}%`;
    document.documentElement.style.setProperty('--sprite-scale', `${spriteScale}vw`);
    updateUI();
});

// Walking step size control
sliderStep.addEventListener('input', (e) => {
    stepSize = parseFloat(e.target.value) / 10;
    valStep.textContent = `${stepSize * 10}px`;
});

// Volume mechanical click control
sliderVolume.addEventListener('input', (e) => {
    clickVolume = parseInt(e.target.value) / 100;
    valVolume.textContent = `${e.target.value}%`;
    playMechanicalClick();
});

// Volume waves control
sliderWaveVolume.addEventListener('input', (e) => {
    waveVolume = parseInt(e.target.value) / 100;
    valWaveVolume.textContent = `${e.target.value}%`;
    
    if (waveVolume > 0 && !wavesActive) {
        startWaves();
    } else if (waveVolume === 0 && wavesActive) {
        stopWaves();
    } else if (wavesActive && wavesGain) {
        const now = audioCtx.currentTime;
        wavesGain.gain.setValueAtTime(waveVolume * 0.12, now);
    }
});

/* ==========================================================================
   INITIALIZATION
   ========================================================================== */

async function loadHomepagePreviews() {
    try {
        // Fetch Projects
        const projectsRes = await fetch('/api/projects');
        if (projectsRes.ok) {
            const projects = await projectsRes.json();
            const latestProjects = [...projects].reverse().slice(0, 2);
            if (latestProjects.length > 0) {
                const projectsBody = document.querySelector('#card-projects .card-section-body');
                if (projectsBody) {
                    projectsBody.innerHTML = `
                        <h2>My Engineering Projects</h2>
                        <div class="project-preview-row">
                            ${latestProjects.map(p => `
                                <div class="preview-item" style="cursor: pointer;" onclick="event.stopPropagation(); playMechanicalClick(); window.location.href='/projects'">
                                    <h3>● ${p.title}</h3>
                                    <p>${p.description.length > 95 ? p.description.substring(0, 92) + '...' : p.description}</p>
                                </div>
                            `).join('')}
                        </div>
                    `;
                }
            }
        }
        
        // Fetch Blogs
        const blogsRes = await fetch('/api/blogs');
        if (blogsRes.ok) {
            const blogs = await blogsRes.json();
            const latestBlogs = [...blogs]
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice(0, 4);
            const blogsBody = document.querySelector('#card-blogs .card-section-body');
            if (blogsBody) {
                if (latestBlogs.length > 0) {
                    blogsBody.innerHTML = `
                        <h2>Latest Engineering Logs</h2>
                        <ul class="blog-preview-list">
                            ${latestBlogs.map(b => `
                                <li style="cursor: pointer;" onclick="event.stopPropagation(); playMechanicalClick(); window.location.href='/Blog/${b.year}/${b.slug}'">
                                    <strong>${b.date.substring(0, 7)}</strong>: ${b.title}
                                </li>
                            `).join('')}
                        </ul>
                    `;
                } else {
                    blogsBody.innerHTML = `
                        <h2>Latest Engineering Logs</h2>
                        <p class="details-text" style="color: var(--text-muted); font-style: italic; font-size: 0.9rem; margin-top: 1rem;">Coming up with lot's of human written thoughts soon.</p>
                    `;
                }
            }
        }
    } catch (e) {
        console.warn("Failed to load previews:", e);
    }
}

function initWebMcp() {
    if (typeof navigator !== 'undefined' && navigator.modelContext) {
        console.log("WebMCP detected! Registering tools...");
        const tools = [
            {
                name: 'get_projects',
                description: 'Retrieve the list of engineering projects built by Bhavya Jangid',
                inputSchema: {
                    type: 'object',
                    properties: {}
                },
                execute: async () => {
                    try {
                        const res = await fetch('/api/projects');
                        const data = await res.json();
                        return { projects: data };
                    } catch (e) {
                        return { error: e.message };
                    }
                }
            },
            {
                name: 'get_blogs',
                description: 'Retrieve the list of engineering blogs and logs by Bhavya Jangid',
                inputSchema: {
                    type: 'object',
                    properties: {}
                },
                execute: async () => {
                    try {
                        const res = await fetch('/api/blogs');
                        const data = await res.json();
                        return { blogs: data };
                    } catch (e) {
                        return { error: e.message };
                    }
                }
            }
        ];

        if (typeof navigator.modelContext.registerTool === 'function') {
            tools.forEach(tool => {
                try {
                    navigator.modelContext.registerTool(tool);
                    console.log(`Registered WebMCP tool: ${tool.name}`);
                } catch (e) {
                    console.error(`Error registering WebMCP tool ${tool.name}:`, e);
                }
            });
        }

        if (typeof navigator.modelContext.provideContext === 'function') {
            try {
                navigator.modelContext.provideContext({ tools });
                console.log('Provided WebMCP tools context');
            } catch (e) {
                console.error('Error in WebMCP provideContext:', e);
            }
        }
    } else {
        console.log("WebMCP API not available in this browser environment.");
    }
}

function init() {
    // Apply Default Theme Color: Yellow
    applyCustomColor("#ffcc00");
    inputColorTheme.value = "#ffcc00";
    
    // Set custom property scale
    document.documentElement.style.setProperty('--sprite-scale', `${spriteScale}vw`);
    
    updateUI();
    loadHomepagePreviews();
    initWebMcp();
}

// Reset navigation lock when page is restored from Back/Forward Cache (bfcache)
window.addEventListener('pageshow', (event) => {
    isNavigating = false;
    keysHeld.left = false;
    keysHeld.right = false;
    if (pose === 'jumping') {
        pose = 'standing';
    }
    updateUI();
});

init();
