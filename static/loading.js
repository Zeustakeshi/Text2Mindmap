/**
 * Rocket Loading Page - Mission Control
 * Immersive space-themed loading experience with streaming status updates
 */

// ===== Constants =====
const API_BASE = '/mindmap';

// Status configurations
const STATUS_CONFIG = {
    CONNECTING: {
        label: 'Kết nối hệ thống',
        icon: '🔗',
        phase: 'THIẾT LẬP KẾT NỐI',
        subtitle: 'Đang liên lạc với trung tâm điều khiển...'
    },
    PREPARING: {
        label: 'Chuẩn bị dữ liệu',
        icon: '📦',
        phase: 'CHUẨN BỊ NHIÊN LIỆU',
        subtitle: 'Đang nạp dữ liệu vào hệ thống...'
    },
    READING_FILE: {
        label: 'Đọc file',
        icon: '📄',
        phase: 'PHÂN TÍCH TÀI LIỆU',
        subtitle: 'Đang quét và trích xuất nội dung...'
    },
    LOADING_WEB: {
        label: 'Tải trang web',
        icon: '🌐',
        phase: 'THU THẬP DỮ LIỆU',
        subtitle: 'Đang kết nối và tải nội dung web...'
    },
    EXTRACTING_TEXT: {
        label: 'Trích xuất văn bản',
        icon: '📝',
        phase: 'XỬ LÝ NỘI DUNG',
        subtitle: 'Đang phân tích và chuẩn hóa văn bản...'
    },
    PROCESSING: {
        label: 'AI đang xử lý',
        icon: '🤖',
        phase: 'TĂNG TỐC TỐI ĐA',
        subtitle: 'AI đang tạo cấu trúc mindmap...'
    },
    VALIDATING: {
        label: 'Kiểm tra định dạng',
        icon: '✅',
        phase: 'KIỂM TRA HỆ THỐNG',
        subtitle: 'Đang xác thực và tối ưu kết quả...'
    },
    RETRY: {
        label: 'Thử lại',
        icon: '🔄',
        phase: 'TÁI KHỞI ĐỘNG',
        subtitle: 'Đang điều chỉnh và thử lại...'
    },
    SUCCESS: {
        label: 'Hoàn thành',
        icon: '🎉',
        phase: 'ĐẾN ĐÍCH!',
        subtitle: 'Mindmap đã sẵn sàng!'
    },
    ERROR: {
        label: 'Lỗi',
        icon: '❌',
        phase: 'MISSION FAILED',
        subtitle: 'Có sự cố xảy ra'
    }
};

// Icons SVG
const ICONS = {
    pending: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" opacity="0.3"/></svg>',
    active: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>',
    completed: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>',
    error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'
};

// ===== DOM Elements =====
const canvas = document.getElementById('space-canvas');
const ctx = canvas.getContext('2d');
const rocketContainer = document.getElementById('rocket-container');
const rocketScene = document.getElementById('rocket-scene');
const missionPanel = document.getElementById('mission-panel');
const errorPanel = document.getElementById('error-panel');
const successPanel = document.getElementById('success-panel');
const phaseTitle = document.getElementById('phase-title');
const phaseSubtitle = document.getElementById('phase-subtitle');
const journeyProgress = document.getElementById('journey-progress');
const journeyMarkers = document.getElementById('journey-markers');
const missionSteps = document.getElementById('mission-steps');
const missionHint = document.getElementById('mission-hint');
const errorMessage = document.getElementById('error-message');
const retryBtn = document.getElementById('retry-btn');
const smokeContainer = document.getElementById('smoke-container');

// Stats elements
const statSpeed = document.getElementById('stat-speed');
const statAltitude = document.getElementById('stat-altitude');
const statProgress = document.getElementById('stat-progress');

// ===== State =====
let steps = [];
let requestData = null;
let isTurbo = false;
let currentProgress = 0;
let targetProgress = 0;
let isComplete = false;
let animationId = null;

// Space animation state
let stars = [];
let shootingStars = [];
let planets = [];

// ===== Canvas Setup =====
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// ===== Star Class =====
class Star {
    constructor() {
        this.reset();
    }

    reset() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2 + 0.5;
        this.speed = this.size * 0.5;
        this.brightness = Math.random() * 0.5 + 0.5;
        this.twinkleSpeed = Math.random() * 0.02 + 0.01;
        this.twinklePhase = Math.random() * Math.PI * 2;
    }

    update() {
        // Move down (simulating rocket going up)
        const speedMultiplier = isTurbo ? 15 : 1;
        this.y += this.speed * speedMultiplier;

        // Twinkle
        this.twinklePhase += this.twinkleSpeed;
        this.currentBrightness = this.brightness * (0.5 + 0.5 * Math.sin(this.twinklePhase));

        // Reset if off screen
        if (this.y > canvas.height + 10) {
            this.y = -10;
            this.x = Math.random() * canvas.width;
        }
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${this.currentBrightness})`;
        ctx.fill();

        // Draw trail in turbo mode
        if (isTurbo && this.size > 1) {
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.x, this.y - 20 * this.size);
            ctx.strokeStyle = `rgba(255, 255, 255, ${this.currentBrightness * 0.3})`;
            ctx.lineWidth = this.size * 0.5;
            ctx.stroke();
        }
    }
}

// ===== Shooting Star Class =====
class ShootingStar {
    constructor() {
        this.reset();
    }

    reset() {
        this.x = Math.random() * canvas.width;
        this.y = -50;
        this.length = Math.random() * 80 + 40;
        this.speed = Math.random() * 15 + 10;
        this.angle = Math.PI / 4 + (Math.random() - 0.5) * 0.3;
        this.opacity = 1;
        this.active = false;
    }

    activate() {
        this.reset();
        this.active = true;
    }

    update() {
        if (!this.active) return;

        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
        this.opacity -= 0.015;

        if (this.opacity <= 0 || this.y > canvas.height || this.x > canvas.width) {
            this.active = false;
        }
    }

    draw() {
        if (!this.active) return;

        const tailX = this.x - Math.cos(this.angle) * this.length;
        const tailY = this.y - Math.sin(this.angle) * this.length;

        const gradient = ctx.createLinearGradient(tailX, tailY, this.x, this.y);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
        gradient.addColorStop(1, `rgba(255, 255, 255, ${this.opacity})`);

        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(this.x, this.y);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Head glow
        ctx.beginPath();
        ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
        ctx.fill();
    }
}

// ===== Planet Class =====
class Planet {
    constructor(type) {
        this.type = type;
        this.reset();
    }

    reset() {
        this.x = Math.random() * canvas.width;
        this.y = -100;
        this.radius = this.type === 'large' ? Math.random() * 30 + 20 : Math.random() * 15 + 8;
        this.speed = this.radius * 0.03;
        this.color = this.getRandomColor();
        this.ringAngle = Math.random() * 0.3;
        this.hasRing = this.type === 'large' && Math.random() > 0.5;
    }

    getRandomColor() {
        const colors = [
            { main: '#f59e0b', shadow: '#d97706' }, // Orange
            { main: '#8b5cf6', shadow: '#7c3aed' }, // Purple
            { main: '#ec4899', shadow: '#db2777' }, // Pink
            { main: '#14b8a6', shadow: '#0d9488' }, // Teal
            { main: '#f43f5e', shadow: '#e11d48' }  // Rose
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    update() {
        const speedMultiplier = isTurbo ? 8 : 1;
        this.y += this.speed * speedMultiplier;

        if (this.y > canvas.height + this.radius * 2) {
            this.reset();
        }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);

        // Planet shadow
        ctx.beginPath();
        ctx.arc(2, 2, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fill();

        // Planet body gradient
        const gradient = ctx.createRadialGradient(
            -this.radius * 0.3, -this.radius * 0.3, 0,
            0, 0, this.radius
        );
        gradient.addColorStop(0, this.color.main);
        gradient.addColorStop(1, this.color.shadow);

        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Ring if applicable
        if (this.hasRing) {
            ctx.beginPath();
            ctx.ellipse(0, 0, this.radius * 1.8, this.radius * 0.3, this.ringAngle, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255, 255, 255, 0.4)`;
            ctx.lineWidth = 3;
            ctx.stroke();
        }

        // Highlight
        ctx.beginPath();
        ctx.arc(-this.radius * 0.3, -this.radius * 0.3, this.radius * 0.2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fill();

        ctx.restore();
    }
}

// ===== Initialize Space Objects =====
function initSpace() {
    // Stars
    for (let i = 0; i < 150; i++) {
        stars.push(new Star());
    }

    // Shooting stars
    for (let i = 0; i < 3; i++) {
        shootingStars.push(new ShootingStar());
    }

    // Planets
    planets.push(new Planet('large'));
    planets.push(new Planet('small'));
    planets.push(new Planet('small'));
}

// ===== Animation Loop =====
function animateSpace() {
    ctx.fillStyle = 'rgba(10, 10, 26, 0.3)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Update and draw stars
    stars.forEach(star => {
        star.update();
        star.draw();
    });

    // Update and draw planets
    planets.forEach(planet => {
        planet.update();
        planet.draw();
    });

    // Shooting stars
    shootingStars.forEach(star => {
        star.update();
        star.draw();
    });

    // Random shooting star
    if (Math.random() < 0.005) {
        const inactiveStar = shootingStars.find(s => !s.active);
        if (inactiveStar) inactiveStar.activate();
    }

    animationId = requestAnimationFrame(animateSpace);
}

// ===== Smoke Effect =====
function createSmoke() {
    const smoke = document.createElement('div');
    smoke.className = 'smoke';
    smoke.style.left = `${40 + Math.random() * 20}px`;
    smoke.style.width = `${20 + Math.random() * 30}px`;
    smoke.style.height = smoke.style.width;
    smokeContainer.appendChild(smoke);

    setTimeout(() => smoke.remove(), 1500);
}

// ===== Turbo Mode =====
function enableTurbo() {
    if (isTurbo) return;
    isTurbo = true;
    rocketContainer.classList.add('turbo');
    missionHint.classList.add('turbo');
    missionHint.querySelector('.hint-icon').textContent = '⚡';
    missionHint.querySelector('.hint-text').textContent = 'TURBO MODE ACTIVATED!';
}

function disableTurbo() {
    if (!isTurbo) return;
    isTurbo = false;
    rocketContainer.classList.remove('turbo');
    missionHint.classList.remove('turbo');
    missionHint.querySelector('.hint-icon').textContent = '💡';
    missionHint.querySelector('.hint-text').textContent = 'Di chuột vào tên lửa để kích hoạt Turbo Mode!';
}

// ===== Stats Animation =====
function updateStats() {
    if (isComplete) return;

    // Interpolate progress
    currentProgress += (targetProgress - currentProgress) * 0.1;

    // Calculate stats based on progress
    const speed = isTurbo ? Math.floor(currentProgress * 3 + Math.random() * 50) : Math.floor(currentProgress * 1.5 + Math.random() * 10);
    const altitude = Math.floor(currentProgress * 4.2);
    const progressPercent = Math.floor(currentProgress);

    statSpeed.textContent = speed.toLocaleString();
    statAltitude.textContent = altitude.toLocaleString();
    statProgress.textContent = progressPercent;

    // Update journey progress bar
    journeyProgress.style.width = `${currentProgress}%`;
}

// ===== Step Management =====
function createStepElement(status, message, isActive = false, isCompleted = false, isError = false) {
    const step = document.createElement('div');
    step.className = 'step';
    step.dataset.status = status;

    if (isActive) step.classList.add('active');
    if (isCompleted) step.classList.add('completed');
    if (isError) step.classList.add('error');

    const config = STATUS_CONFIG[status] || { icon: '📌', label: status };
    const iconClass = isError ? 'error' : (isCompleted ? 'completed' : (isActive ? 'active' : 'pending'));
    const iconContent = isError ? ICONS.error : (isCompleted ? ICONS.completed : (isActive ? config.icon : ICONS.pending));

    step.innerHTML = `
        <div class="step-icon ${iconClass}">${iconContent}</div>
        <div class="step-content">
            <div class="step-label">${config.label}</div>
            <div class="step-detail">${message || ''}</div>
        </div>
    `;

    return step;
}

function addStep(status, message) {
    // Check if step already exists
    const existingStep = missionSteps.querySelector(`[data-status="${status}"]`);
    if (existingStep) {
        updateStepState(status, true, false);
        return;
    }

    // Mark previous active steps as completed
    const activeSteps = missionSteps.querySelectorAll('.step.active');
    activeSteps.forEach(s => {
        s.classList.remove('active');
        s.classList.add('completed');
        const icon = s.querySelector('.step-icon');
        icon.className = 'step-icon completed';
        icon.innerHTML = ICONS.completed;
    });

    // Add new step
    const stepElement = createStepElement(status, message, true, false, false);
    missionSteps.appendChild(stepElement);
    steps.push({ status, message });

    // Update phase display
    const config = STATUS_CONFIG[status];
    if (config) {
        phaseTitle.textContent = config.phase;
        phaseSubtitle.textContent = config.subtitle;
    }

    // Scroll to new step
    missionSteps.scrollTop = missionSteps.scrollHeight;

    // Update target progress
    updateProgressByStatus(status);
}

function updateStepState(status, isActive, isCompleted, isError = false) {
    const step = missionSteps.querySelector(`[data-status="${status}"]`);
    if (!step) return;

    step.classList.toggle('active', isActive);
    step.classList.toggle('completed', isCompleted);
    step.classList.toggle('error', isError);

    const icon = step.querySelector('.step-icon');
    const config = STATUS_CONFIG[status] || { icon: '📌' };
    const iconClass = isError ? 'error' : (isCompleted ? 'completed' : (isActive ? 'active' : 'pending'));
    const iconContent = isError ? ICONS.error : (isCompleted ? ICONS.completed : (isActive ? config.icon : ICONS.pending));
    icon.className = `step-icon ${iconClass}`;
    icon.innerHTML = iconContent;
}

function markAllStepsCompleted() {
    const allSteps = missionSteps.querySelectorAll('.step');
    allSteps.forEach(s => {
        s.classList.remove('active');
        s.classList.add('completed');
        const icon = s.querySelector('.step-icon');
        icon.className = 'step-icon completed';
        icon.innerHTML = ICONS.completed;
    });
}

function markCurrentStepError() {
    const activeStep = missionSteps.querySelector('.step.active');
    if (activeStep) {
        activeStep.classList.remove('active');
        activeStep.classList.add('error');
        const icon = activeStep.querySelector('.step-icon');
        icon.className = 'step-icon error';
        icon.innerHTML = ICONS.error;
    }
}

function updateProgressByStatus(status) {
    const progressMap = {
        'CONNECTING': 10,
        'PREPARING': 20,
        'READING_FILE': 30,
        'LOADING_WEB': 30,
        'EXTRACTING_TEXT': 45,
        'PROCESSING': 70,
        'VALIDATING': 85,
        'RETRY': 75,
        'SUCCESS': 100
    };
    targetProgress = progressMap[status] || targetProgress;
}

// ===== UI Updates =====
function showError(message) {
    isComplete = true;
    missionPanel.classList.add('hidden');
    rocketScene.classList.add('hidden');
    errorPanel.classList.add('visible');
    errorMessage.textContent = message;
    markCurrentStepError();
}

function showSuccess() {
    isComplete = true;
    targetProgress = 100;
    missionPanel.classList.add('hidden');
    rocketScene.classList.add('hidden');
    successPanel.classList.add('visible');

    // Trigger celebration
    enableTurbo();
    markAllStepsCompleted();
}

function showLoading() {
    missionPanel.classList.remove('hidden');
    rocketScene.classList.remove('hidden');
    errorPanel.classList.remove('visible');
    successPanel.classList.remove('visible');
    isComplete = false;
    currentProgress = 0;
    targetProgress = 0;
}

// ===== Stream Processing =====
async function processStreamResponse(response) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let finalCtm = null;

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
            if (!line.trim()) continue;
            try {
                const data = JSON.parse(line);
                const result = handleStreamEvent(data);
                if (result) finalCtm = result;
            } catch (e) {
                console.warn('Failed to parse stream event:', line);
            }
        }
    }

    // Process remaining buffer
    if (buffer.trim()) {
        try {
            const data = JSON.parse(buffer);
            const result = handleStreamEvent(data);
            if (result) finalCtm = result;
        } catch (e) {
            console.warn('Failed to parse final buffer:', buffer);
        }
    }

    return finalCtm;
}

function handleStreamEvent(data) {
    const { status, message, data: eventData } = data;

    console.log('Stream event:', status, message);

    switch (status) {
        case 'CONNECTING':
        case 'PREPARING':
        case 'READING_FILE':
        case 'LOADING_WEB':
        case 'EXTRACTING_TEXT':
            addStep(status, message);
            break;

        case 'PROCESSING':
            addStep(status, message);
            enableTurbo(); // AI processing = Turbo mode!
            break;

        case 'VALIDATING':
            addStep(status, message);
            disableTurbo();
            break;

        case 'RETRY':
            addStep(status, message);
            break;

        case 'SUCCESS':
            if (eventData && eventData.ctm) {
                showSuccess();
                return eventData.ctm;
            }
            break;

        case 'ERROR':
            showError(message || 'Có lỗi xảy ra');
            break;

        default:
            console.log('Unknown status:', status);
    }

    return null;
}

// ===== API Calls =====
async function generateFromText(text) {
    addStep('CONNECTING', 'Đang kết nối đến server...');

    const response = await fetch(`${API_BASE}/generate/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            text: text,
            llm_config: requestData.llm_config 
        })
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await processStreamResponse(response);
}

async function generateFromUrl(url) {
    addStep('CONNECTING', 'Đang kết nối đến server...');

    const llmConfig = requestData.llm_config || {};
    const params = new URLSearchParams({
        site_url: url,
        llm_type: llmConfig.llm_type || 'ollama'
    });
    if (llmConfig.api_key) params.append('api_key', llmConfig.api_key);

    const response = await fetch(`${API_BASE}/web/generate/stream?${params.toString()}`, {
        method: 'POST'
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return await processStreamResponse(response);
}

async function generateFromFile(fileData, fileName) {
    addStep('CONNECTING', 'Đang kết nối đến server...');
    addStep('READING_FILE', `Đang đọc ${fileName}...`);

    // Convert base64 back to file
    const byteCharacters = atob(fileData);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/pdf' });
    const file = new File([blob], fileName, { type: 'application/pdf' });

    const formData = new FormData();
    formData.append('file', file);

    const llmConfig = requestData.llm_config || {};
    const params = new URLSearchParams({
        llm_type: llmConfig.llm_type || 'ollama'
    });
    if (llmConfig.api_key) params.append('api_key', llmConfig.api_key);

    const response = await fetch(`${API_BASE}/file/generate/stream?${params.toString()}`, {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return await processStreamResponse(response);
}

// ===== Main Process =====
async function startGeneration() {
    // Get request data from localStorage
    const storedData = localStorage.getItem('mindmap_request');
    if (!storedData) {
        showError('Không tìm thấy dữ liệu yêu cầu. Vui lòng thử lại.');
        return;
    }

    try {
        requestData = JSON.parse(storedData);
    } catch (e) {
        showError('Dữ liệu yêu cầu không hợp lệ.');
        return;
    }

    showLoading();
    missionSteps.innerHTML = '';
    steps = [];

    try {
        let ctm = null;

        switch (requestData.type) {
            case 'text':
                ctm = await generateFromText(requestData.text);
                break;
            case 'url':
                ctm = await generateFromUrl(requestData.url);
                break;
            case 'file':
                ctm = await generateFromFile(requestData.fileData, requestData.fileName);
                break;
            default:
                throw new Error('Loại yêu cầu không hợp lệ');
        }

        if (ctm) {
            // Save CTM to localStorage and redirect
            localStorage.setItem('mindmap_ctm', ctm);
            localStorage.removeItem('mindmap_request'); // Clean up

            // Small delay to show success state
            setTimeout(() => {
                window.location.href = '/static/mindmap.html';
            }, 1500);
        }
    } catch (error) {
        console.error('Error generating mindmap:', error);
        showError(error.message || 'Không thể kết nối đến server');
    }
}

// ===== Main Loop =====
function mainLoop() {
    updateStats();

    // Create smoke periodically
    if (!isComplete && Math.random() < 0.1) {
        createSmoke();
    }

    requestAnimationFrame(mainLoop);
}

// ===== Event Listeners =====
rocketScene.addEventListener('mouseenter', enableTurbo);
rocketScene.addEventListener('mouseleave', () => {
    if (!isComplete) disableTurbo();
});
rocketScene.addEventListener('touchstart', enableTurbo);
rocketScene.addEventListener('touchend', () => {
    if (!isComplete) disableTurbo();
});

retryBtn.addEventListener('click', () => {
    errorPanel.classList.remove('visible');
    startGeneration();
});

// ===== Initialize =====
document.addEventListener('DOMContentLoaded', () => {
    initSpace();
    animateSpace();
    mainLoop();
    startGeneration();
});
