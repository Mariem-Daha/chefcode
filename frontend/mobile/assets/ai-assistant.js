/**
 * ChefCode AI Assistant
 * Intelligent voice and text assistant for inventory and recipe management
 */

const AI_ASSISTANT = (() => {
    // Configuration
    const API_BASE = window.CHEFCODE_CONFIG?.API_URL || 'http://localhost:8000';
    const API_KEY = window.CHEFCODE_CONFIG?.API_KEY || '';
    console.log('🤖 AI Assistant initialized with API_BASE:', API_BASE);
    
    // State
    let conversationContext = {};
    let pendingConfirmation = null;
    let recognition = null;
    let isListening = false;
    
    // DOM Elements
    let chatOverlay, chatMessages, commandInput, sendBtn, voiceBtn;
    let confirmationDialog;
    
    // Initialize
    function init() {
        console.log('🤖 Initializing AI Assistant...');
        
        // Get DOM elements
        commandInput = document.getElementById('ai-command-input');
        sendBtn = document.getElementById('ai-send-btn');
        voiceBtn = document.getElementById('ai-voice-btn');
        
        // Create chat overlay
        createChatOverlay();
        createConfirmationDialog();
        // Note: We use the existing web recipe search modal, no need to create our own
        
        // Setup voice recognition
        setupVoiceRecognition();
        
        // Event listeners
        if (sendBtn && commandInput) {
            sendBtn.addEventListener('click', handleSendCommand);
            commandInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSendCommand();
                }
            });
        }
        
        if (voiceBtn) {
            voiceBtn.addEventListener('click', toggleVoiceInput);
        }
        
        console.log('✅ AI Assistant initialized');
    }
    
    // Create chat overlay UI
    function createChatOverlay() {
        chatOverlay = document.createElement('div');
        chatOverlay.id = 'ai-chat-overlay';
        chatOverlay.className = 'ai-chat-overlay';
        chatOverlay.style.display = 'none';
        
        chatOverlay.innerHTML = `
            <div class="ai-chat-container">
                <div class="ai-chat-header">
                    <div>
                        <h3>🤖 ChefCode AI Assistant</h3>
                        <p>Ask me anything about recipes and inventory</p>
                    </div>
                    <button class="ai-chat-close" id="ai-chat-close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="ai-chat-messages" id="ai-chat-messages"></div>
                <div class="ai-chat-footer">
                    <button class="ai-chat-voice-btn" id="ai-chat-voice-btn" title="Voice Input">
                        <i class="fas fa-microphone"></i>
                    </button>
                    <p class="ai-chat-hint">💡 Try: "Add recipe Pizza" or "Search pasta recipes"</p>
                </div>
            </div>
        `;
        
        document.body.appendChild(chatOverlay);
        chatMessages = document.getElementById('ai-chat-messages');
        
        document.getElementById('ai-chat-close').addEventListener('click', closeChatOverlay);
        
        // Add voice button handler in chat panel
        const chatVoiceBtn = document.getElementById('ai-chat-voice-btn');
        if (chatVoiceBtn) {
            chatVoiceBtn.addEventListener('click', toggleVoiceInput);
        }
    }
    
    // Create confirmation dialog
    function createConfirmationDialog() {
        confirmationDialog = document.createElement('div');
        confirmationDialog.id = 'ai-confirmation-dialog';
        confirmationDialog.className = 'ai-confirmation-dialog';
        confirmationDialog.style.display = 'none';
        
        confirmationDialog.innerHTML = `
            <div class="ai-confirmation-content">
                <div class="ai-confirmation-icon">⚠️</div>
                <div class="ai-confirmation-message" id="ai-confirmation-message"></div>
                <div class="ai-confirmation-actions">
                    <button class="ai-btn ai-btn-secondary" id="ai-confirm-no">Cancel</button>
                    <button class="ai-btn ai-btn-primary" id="ai-confirm-yes">Confirm</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(confirmationDialog);
        
        document.getElementById('ai-confirm-yes').addEventListener('click', () => confirmAction(true));
        document.getElementById('ai-confirm-no').addEventListener('click', () => confirmAction(false));
    }
    
    // Note: Search results use the existing web recipe search modal
    // No separate overlay needed
    
    // Setup voice recognition
    function setupVoiceRecognition() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognition = new SpeechRecognition();
            recognition.lang = 'en-US';
            recognition.continuous = false;
            recognition.interimResults = false;
            
            recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                commandInput.value = transcript;
                addMessage('user', transcript);
                processCommand(transcript);
            };
            
            recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                isListening = false;
                updateVoiceButton();
            };
            
            recognition.onend = () => {
                isListening = false;
                updateVoiceButton();
            };
        } else {
            console.warn('Speech recognition not supported');
            if (voiceBtn) voiceBtn.style.display = 'none';
        }
    }
    
    // Handle send command
    async function handleSendCommand() {
        const command = commandInput.value.trim();
        if (!command) return;
        
        // Show chat overlay
        showChatOverlay();
        
        // Add user message
        addMessage('user', command);
        
        // Clear input
        commandInput.value = '';
        
        // Process command
        await processCommand(command);
    }
    
    // Process command via AI backend
    async function processCommand(command) {
        try {
            // Show typing indicator
            const typingId = addTypingIndicator();
            
            console.log('🔗 API Call: ai-assistant/command →', `${API_BASE}/api/ai-assistant/command`);
            const response = await fetch(`${API_BASE}/api/ai-assistant/command`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': API_KEY
                },
                body: JSON.stringify({
                    command: command,
                    context: conversationContext
                })
            });
            
            // Remove typing indicator
            removeTypingIndicator(typingId);
            
            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }
            
            const result = await response.json();
            
            console.log('AI Response:', result);
            
            // Handle response based on intent
            if (result.requires_confirmation) {
                // Store confirmation data
                pendingConfirmation = result.confirmation_data;
                
                // Show confirmation dialog
                showConfirmation(result.message);
                
            } else if (result.search_results) {
                // Use existing web recipe search modal
                addMessage('assistant', result.message);
                
                // Close AI chat and open web recipe search
                const query = result.action_result?.search_query || '';
                if (window.WEB_RECIPE_SEARCH && query) {
                    closeChatOverlay();
                    // Small delay to ensure smooth transition
                    setTimeout(() => {
                        window.WEB_RECIPE_SEARCH.searchWithQuery(query);
                    }, 300);
                }
                
            } else {
                // Just show message
                addMessage('assistant', result.message);
                
                // Update context
                conversationContext.last_intent = result.intent;
                conversationContext.last_result = result.action_result;
            }
            
        } catch (error) {
            console.error('Command processing error:', error);
            removeTypingIndicator();
            addMessage('assistant', '❌ Sorry, something went wrong. Make sure the backend is running.');
        }
    }
    
    // Show confirmation dialog
    function showConfirmation(message) {
        document.getElementById('ai-confirmation-message').innerHTML = message.replace(/\n/g, '<br>');
        confirmationDialog.style.display = 'flex';
    }
    
    // Handle confirmation response
    async function confirmAction(confirmed) {
        confirmationDialog.style.display = 'none';
        
        if (!pendingConfirmation) return;
        
        try {
            const typingId = addTypingIndicator();
            
            const response = await fetch(`${API_BASE}/api/ai-assistant/confirm`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': API_KEY
                },
                body: JSON.stringify({
                    confirmation_id: Date.now().toString(),
                    confirmed: confirmed,
                    data: pendingConfirmation
                })
            });
            
            removeTypingIndicator(typingId);
            
            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }
            
            const result = await response.json();
            
            addMessage('assistant', result.message);
            
            // Show success toast
            if (result.success) {
                showToast('✅ Action completed successfully', 'success');
            }
            
        } catch (error) {
            console.error('Confirmation error:', error);
            removeTypingIndicator();
            addMessage('assistant', '❌ Failed to execute action.');
        } finally {
            pendingConfirmation = null;
        }
    }
    
    // Note: Recipe search now uses the existing web recipe search modal
    // No need for separate display logic - we just trigger the existing modal
    
    // Add message to chat
    function addMessage(role, content) {
        if (!chatMessages) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `ai-message ai-message-${role}`;
        
        const bubble = document.createElement('div');
        bubble.className = 'ai-message-bubble';
        
        // Convert markdown-style formatting
        let formattedContent = content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>');
        
        bubble.innerHTML = formattedContent;
        messageDiv.appendChild(bubble);
        
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    // Add typing indicator
    function addTypingIndicator() {
        const id = 'typing-' + Date.now();
        const messageDiv = document.createElement('div');
        messageDiv.id = id;
        messageDiv.className = 'ai-message ai-message-assistant';
        
        messageDiv.innerHTML = `
            <div class="ai-message-bubble">
                <div class="ai-typing-indicator">
                    <span></span><span></span><span></span>
                </div>
            </div>
        `;
        
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        return id;
    }
    
    // Remove typing indicator
    function removeTypingIndicator(id = null) {
        if (id) {
            const element = document.getElementById(id);
            if (element) element.remove();
        } else {
            // Remove all typing indicators
            document.querySelectorAll('.ai-typing-indicator').forEach(el => {
                el.closest('.ai-message').remove();
            });
        }
    }
    
    // Toggle voice input
    function toggleVoiceInput() {
        if (!recognition) {
            alert('Voice recognition not supported in this browser.');
            return;
        }
        
        if (isListening) {
            recognition.stop();
            isListening = false;
        } else {
            showChatOverlay();
            addMessage('assistant', '🎤 Listening... Speak your command.');
            recognition.start();
            isListening = true;
        }
        
        updateVoiceButton();
    }
    
    // Update voice button appearance (both toolbar and chat panel)
    function updateVoiceButton() {
        const buttons = [voiceBtn, document.getElementById('ai-chat-voice-btn')];
        
        buttons.forEach(btn => {
            if (!btn) return;
            
            if (isListening) {
                btn.classList.add('listening');
                const icon = btn.querySelector('i');
                if (icon) icon.className = 'fas fa-microphone-slash';
            } else {
                btn.classList.remove('listening');
                const icon = btn.querySelector('i');
                if (icon) icon.className = 'fas fa-microphone';
            }
        });
    }
    
    // Show chat overlay
    function showChatOverlay() {
        if (chatOverlay) {
            chatOverlay.style.display = 'flex';
            // Add welcome message if empty
            if (chatMessages && chatMessages.children.length === 0) {
                addMessage('assistant', '👋 Hi! I\'m your ChefCode AI assistant. I can help you manage recipes and inventory. What would you like to do?');
            }
        }
    }
    
    // Close chat overlay
    function closeChatOverlay() {
        if (chatOverlay) {
            chatOverlay.style.display = 'none';
        }
    }
    
    // Note: Search results handled by existing web recipe search modal
    
    // Show toast notification
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `ai-toast ai-toast-${type}`;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    // Public API
    return {
        init,
        processCommand,
        showChatOverlay,
        closeChatOverlay
    };
})();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => AI_ASSISTANT.init());
} else {
    AI_ASSISTANT.init();
}

