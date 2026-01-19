/**
 * Text2Mindmap - Main JavaScript
 */

// DOM Elements
const textInput = document.getElementById('text-input');
const charCount = document.querySelector('.char-count');
const generateBtn = document.getElementById('generate-btn');
const statusSection = document.getElementById('status-section');
const statusText = document.getElementById('status-text');
const resultSection = document.getElementById('result-section');
const resultOutput = document.getElementById('result-output');
const copyBtn = document.getElementById('copy-btn');

// API Endpoint
const API_BASE = '/mindmap';

/**
 * Update character count
 */
function updateCharCount() {
    const count = textInput.value.length;
    charCount.textContent = `${count.toLocaleString()} ký tự`;
}

/**
 * Show status section with message
 */
function showStatus(message) {
    statusSection.classList.remove('hidden');
    resultSection.classList.add('hidden');
    statusText.textContent = message;
}

/**
 * Hide status section
 */
function hideStatus() {
    statusSection.classList.add('hidden');
}

/**
 * Show result section with CTM content
 */
function showResult(ctm) {
    hideStatus();
    resultSection.classList.remove('hidden');
    resultOutput.textContent = ctm;
}

/**
 * Show error message
 */
function showError(message) {
    hideStatus();
    resultSection.classList.remove('hidden');
    resultOutput.textContent = `Lỗi: ${message}`;
    document.querySelector('.result-title').innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" class="result-icon" style="color: var(--color-error);">
            <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/>
            <path d="M15 9l-6 6M9 9l6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <span style="color: var(--color-error);">Có lỗi xảy ra</span>
    `;
}

/**
 * Reset result section to success state
 */
function resetResultTitle() {
    document.querySelector('.result-title').innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" class="result-icon">
            <path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/>
        </svg>
        Kết quả Mindmap
    `;
}

/**
 * Generate mindmap using streaming API
 */
async function generateMindmap() {
    const text = textInput.value.trim();
    
    if (!text) {
        alert('Vui lòng nhập văn bản để tạo mindmap!');
        return;
    }
    
    // Disable button and show status
    generateBtn.disabled = true;
    resetResultTitle();
    showStatus('Đang kết nối...');
    
    try {
        const response = await fetch(`${API_BASE}/generate/stream`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text }),
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        
        while (true) {
            const { done, value } = await reader.read();
            
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            
            // Process complete JSON objects (separated by newlines)
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep incomplete line in buffer
            
            for (const line of lines) {
                if (!line.trim()) continue;
                
                try {
                    const data = JSON.parse(line);
                    handleStreamEvent(data);
                } catch (e) {
                    console.warn('Failed to parse stream event:', line);
                }
            }
        }
        
        // Process any remaining data in buffer
        if (buffer.trim()) {
            try {
                const data = JSON.parse(buffer);
                handleStreamEvent(data);
            } catch (e) {
                console.warn('Failed to parse final buffer:', buffer);
            }
        }
        
    } catch (error) {
        console.error('Error generating mindmap:', error);
        showError(error.message || 'Không thể kết nối đến server');
    } finally {
        generateBtn.disabled = false;
    }
}

/**
 * Handle streaming event data
 */
function handleStreamEvent(data) {
    const { status, message, data: eventData } = data;
    
    switch (status) {
        case 'PROCESSING':
            showStatus(message || 'Đang tạo mindmap...');
            break;
            
        case 'VALIDATING':
            showStatus(message || 'Đang kiểm tra định dạng...');
            break;
            
        case 'RETRY':
            showStatus(message || 'Đang thử lại...');
            break;
            
        case 'SUCCESS':
            if (eventData && eventData.ctm) {
                showResult(eventData.ctm);
            }
            break;
            
        case 'ERROR':
            showError(message || 'Có lỗi xảy ra');
            break;
            
        default:
            console.log('Unknown status:', status);
    }
}

/**
 * Copy result to clipboard
 */
async function copyResult() {
    const text = resultOutput.textContent;
    
    try {
        await navigator.clipboard.writeText(text);
        
        // Show feedback
        const originalText = copyBtn.innerHTML;
        copyBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" class="copy-icon">
                <path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            Đã sao chép!
        `;
        copyBtn.style.color = 'var(--color-success)';
        
        setTimeout(() => {
            copyBtn.innerHTML = originalText;
            copyBtn.style.color = '';
        }, 2000);
        
    } catch (error) {
        console.error('Failed to copy:', error);
        alert('Không thể sao chép. Vui lòng thử lại!');
    }
}

// Event Listeners
textInput.addEventListener('input', updateCharCount);
generateBtn.addEventListener('click', generateMindmap);
copyBtn.addEventListener('click', copyResult);

// Keyboard shortcut: Ctrl+Enter to generate
textInput.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
        generateMindmap();
    }
});

// Initialize
updateCharCount();
