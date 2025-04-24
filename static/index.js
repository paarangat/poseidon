document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const messageForm = document.getElementById('messageForm');
  const messageInput = document.getElementById('messageInput');
  const messagesContainer = document.getElementById('messagesContainer');
  const mobileNavTabs = document.querySelectorAll('.nav-tab');
  const historySidebar = document.getElementById('historySidebar');
  const chatContainer = document.getElementById('chatContainer');
  const analysisSidebar = document.getElementById('analysisSidebar');
  
  // Analysis metrics elements
  const depressionBar = document.getElementById('depressionBar');
  const anxietyBar = document.getElementById('anxietyBar');
  const happinessBar = document.getElementById('happinessBar');
  const suicidalBar = document.getElementById('suicidalBar');
  const stressBar = document.getElementById('stressBar');
  
  const depressionValue = document.getElementById('depressionValue');
  const anxietyValue = document.getElementById('anxietyValue');
  const happinessValue = document.getElementById('happinessValue');
  const suicidalValue = document.getElementById('suicidalValue');
  const stressValue = document.getElementById('stressValue');
  
  const recommendationsContainer = document.getElementById('recommendationsContainer');
  
  // API endpoint
  const API_URL = '/chat';  // Using relative URL which works both locally and when deployed
  
  // Load chat history from localStorage if available
  let messages;
  const storedMessages = localStorage.getItem('chatMessages');
  if (storedMessages) {
    messages = JSON.parse(storedMessages).map(msg => ({ ...msg, timestamp: new Date(msg.timestamp) }));
  } else {
    messages = [
      {
        id: 1,
        text: "Hello! I'm your therapy assistant. How are you feeling today?",
        sender: 'bot',
        timestamp: new Date()
      }
    ];
    localStorage.setItem('chatMessages', JSON.stringify(messages));
  }
  
  // Function to save chat history
  function saveMessagesToStorage() {
    localStorage.setItem('chatMessages', JSON.stringify(messages));
  }
  
  // Initial analysis values
  let analysis = {
    depression: 25,
    anxiety: 30,
    happiness: 65,
    suicidal: 5,
    stress: 40
  };

  // Store analysis history for trend visualization
  let analysisHistory = localStorage.getItem('analysisHistory');
  if (analysisHistory) {
    analysisHistory = JSON.parse(analysisHistory);
  } else {
    // Initialize with some dummy data for demonstration
    analysisHistory = [
      {
        date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 14 days ago
        depression: 40,
        anxiety: 45,
        happiness: 50,
        suicidal: 10,
        stress: 55
      },
      {
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days ago
        depression: 35,
        anxiety: 38,
        happiness: 55,
        suicidal: 8,
        stress: 48
      },
      {
        date: new Date().toISOString().split('T')[0], // today
        depression: 25,
        anxiety: 30,
        happiness: 65,
        suicidal: 5,
        stress: 40
      }
    ];
    localStorage.setItem('analysisHistory', JSON.stringify(analysisHistory));
  }
  
  // Set active tab for mobile
  let activeTab = 'chat';
  
  // Initialize the chat with the first message
  renderMessages();
  
  // Set chat as active on mobile by default
  if (window.innerWidth < 768) {
    setActiveTab('chat');
  }
  
  // Populate Therapy History Dates
  const now = new Date('2025-04-20T20:44:59+05:30');
  const sessionDates = [
    new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    now // today (current session)
  ];
  [1, 2, 3].forEach((i, idx) => {
    const el = document.getElementById(`session-date-${i}`);
    if (el) {
      el.textContent = formatDate(sessionDates[idx]);
    }
  });

  // Load and display chat history sessions
  function loadChatHistorySessions() {
    const sessionsListEl = document.querySelector('.sessions-list');
    if (!sessionsListEl) return;
    
    // Get chat history from localStorage
    const chatHistory = localStorage.getItem('chatHistorySessions');
    if (!chatHistory) return;
    
    const sessions = JSON.parse(chatHistory);
    
    // Clear existing static sessions
    sessionsListEl.innerHTML = '';
    
    // Add current session
    const currentSessionEl = document.createElement('div');
    currentSessionEl.className = 'session-item current';
    currentSessionEl.innerHTML = `
      <div class="session-header">
        <h4 class="session-date">${formatDate(new Date())}</h4>
        <span class="session-badge current">Current Session</span>
      </div>
      <p class="session-summary">Session in progress...</p>
    `;
    sessionsListEl.appendChild(currentSessionEl);
    
    // Add past sessions
    sessions.slice().reverse().forEach((session, index) => {
      if (index >= 5) return; // Limit to 5 past sessions
      
      const sessionEl = document.createElement('div');
      sessionEl.className = 'session-item';
      
      // Get first few messages for summary
      const firstUserMsg = session.messages.find(msg => msg.sender === 'user');
      const summary = firstUserMsg ? 
        firstUserMsg.text.substring(0, 40) + (firstUserMsg.text.length > 40 ? '...' : '') : 
        'Therapy session';
      
      sessionEl.innerHTML = `
        <div class="session-header">
          <h4 class="session-date">${formatDate(new Date(session.timestamp))}</h4>
          <span class="session-badge">Session #${sessions.length - index}</span>
        </div>
        <p class="session-summary">${summary}</p>
        <div class="session-actions">
          <button class="action-btn primary" onclick="viewSessionHistory(${session.id})">View Details</button>
          <button class="action-btn secondary" onclick="downloadSessionHistory(${session.id})">Download Report</button>
        </div>
      `;
      
      sessionsListEl.appendChild(sessionEl);
    });
    
    // Update session count
    const sessionsCompletedEl = document.querySelector('.stat-value');
    if (sessionsCompletedEl) {
      sessionsCompletedEl.textContent = sessions.length;
    }
  }
  
  // Function to view session history
  window.viewSessionHistory = function(sessionId) {
    const chatHistory = localStorage.getItem('chatHistorySessions');
    if (!chatHistory) return;
    
    const sessions = JSON.parse(chatHistory);
    const session = sessions.find(s => s.id === sessionId);
    
    if (session) {
      // Store the selected session in localStorage for the therapy_history.html page
      localStorage.setItem('selectedSession', JSON.stringify(session));
      window.location.href = 'therapy_history.html';
    }
  };
  
  // Function to download session history
  window.downloadSessionHistory = function(sessionId) {
    const chatHistory = localStorage.getItem('chatHistorySessions');
    if (!chatHistory) return;
    
    const sessions = JSON.parse(chatHistory);
    const session = sessions.find(s => s.id === sessionId);
    
    if (session) {
      // Store the selected session in localStorage
      localStorage.setItem('selectedSession', JSON.stringify(session));
      window.location.href = 'therapy_history.html#download';
    }
  };
  
  // Initialize the chat history sidebar
  loadChatHistorySessions();
  
  // Mobile menu functionality
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const mainNav = document.getElementById('mainNav');
  
  if (mobileMenuBtn && mainNav) {
    mobileMenuBtn.addEventListener('click', function() {
      mainNav.classList.toggle('mobile-nav-active');
      this.classList.toggle('active');
    });
  }
  
  // Initialize mental health chart
  let mentalHealthChart;
  if (document.getElementById('mentalHealthChart')) {
    initMentalHealthChart();
  }
  
  // Event Listeners
  messageForm.addEventListener('submit', handleSendMessage);
  
  mobileNavTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.getAttribute('data-tab');
      setActiveTab(tabName);
    });
  });

  // Add logout functionality
  const logoutBtn = document.querySelector('.auth-buttons .btn-secondary');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function() {
      // Save current session to history before logging out
      saveCurrentSessionToHistory();
      
      // Redirect to home page
      window.location.href = 'home.html';
    });
  }
  
  // Function to save current session to history
  function saveCurrentSessionToHistory() {
    // Get current chat messages
    const currentMessages = localStorage.getItem('chatMessages');
    
    if (currentMessages && JSON.parse(currentMessages).length > 1) {
      // Get existing chat history or initialize new array
      let chatHistory = localStorage.getItem('chatHistorySessions');
      chatHistory = chatHistory ? JSON.parse(chatHistory) : [];
      
      // Create a new session object
      const newSession = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        messages: JSON.parse(currentMessages)
      };
      
      // Add new session to history
      chatHistory.push(newSession);
      
      // Save updated history
      localStorage.setItem('chatHistorySessions', JSON.stringify(chatHistory));
    }
  }
  
  // Functions
  async function handleSendMessage(e) {
    e.preventDefault();
    
    const text = messageInput.value.trim();
    if (!text) return;
    
    // Add user message
    const userMessage = {
      id: messages.length + 1,
      text: text,
      sender: 'user',
      timestamp: new Date()
    };
    
    messages.push(userMessage);
    saveMessagesToStorage();
    messageInput.value = '';
    
    // Re-render messages
    renderMessages();
    
    // Show typing indicator
    showTypingIndicator();
    
    try {
      // Send message to API
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: text,
          history: messages.slice(0, -1) // Send all messages except the current one
        })
      });
      
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      
      const data = await response.json();
      
      // Remove typing indicator
      removeTypingIndicator();
      
      // Add bot response
      const botMessage = {
        id: messages.length + 1,
        text: data.response,
        sender: 'bot',
        timestamp: new Date()
      };
      
      messages.push(botMessage);
      saveMessagesToStorage();
      
      // Update analysis with the new values
      updateAnalysisWithAPI(data.analysis);
      
      // Re-render messages
      renderMessages();
      
    } catch (error) {
      console.error('Error:', error);
      
      // Remove typing indicator
      removeTypingIndicator();
      
      // Show error message
      const errorMessage = {
        id: messages.length + 1,
        text: "I'm sorry, I'm having trouble connecting right now. Please try again in a moment.",
        sender: 'bot',
        timestamp: new Date()
      };
      
      messages.push(errorMessage);
      saveMessagesToStorage();
      renderMessages();
    }
  }
  
  function showTypingIndicator() {
    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'message bot typing-indicator';
    typingIndicator.innerHTML = `
      <div class="message-bubble">
        <div class="typing-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    `;
    
    messagesContainer.appendChild(typingIndicator);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
  
  function removeTypingIndicator() {
    const typingIndicator = document.querySelector('.typing-indicator');
    if (typingIndicator) {
      typingIndicator.remove();
    }
  }
  
  function renderMessages() {
    messagesContainer.innerHTML = '';
    
    messages.forEach(message => {
      const messageElement = document.createElement('div');
      messageElement.className = `message ${message.sender}`;
      
      const formattedTime = formatDate(message.timestamp);
      
      messageElement.innerHTML = `
        <div class="message-bubble">
          <p>${message.text}</p>
          <p class="message-time">${formattedTime}</p>
        </div>
      `;
      
      messagesContainer.appendChild(messageElement);
    });
    
    // Scroll to the bottom each time new messages render
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
  
  function updateAnalysisWithAPI(newAnalysis) {
    // Update the analysis object with the new values from the API response
    // Ensure values stay within 0-100 range (though backend values are small)
    analysis.depression = Math.min(100, Math.max(0, newAnalysis.depression || 0));
    analysis.anxiety = Math.min(100, Math.max(0, newAnalysis.anxiety || 0));
    analysis.happiness = Math.min(100, Math.max(0, newAnalysis.happiness || 0));
    // Keep the higher weight for suicidal in mind if backend logic changes
    analysis.suicidal = Math.min(100, Math.max(0, newAnalysis.suicidal || 0));
    analysis.stress = Math.min(100, Math.max(0, newAnalysis.stress || 0));
    
    // Update the UI
    updateAnalysisUI();
    
    // Save to analysis history
    saveAnalysisToHistory();
  }
  
  function saveAnalysisToHistory() {
    const today = new Date().toISOString().split('T')[0];
    
    // Check if we already have an entry for today
    const existingEntryIndex = analysisHistory.findIndex(entry => entry.date === today);
    
    if (existingEntryIndex >= 0) {
      // Update existing entry
      analysisHistory[existingEntryIndex] = {
        date: today,
        ...analysis
      };
    } else {
      // Add new entry
      analysisHistory.push({
        date: today,
        ...analysis
      });
      
      // Keep only the last 30 entries
      if (analysisHistory.length > 30) {
        analysisHistory = analysisHistory.slice(-30);
      }
    }
    
    // Save to localStorage
    localStorage.setItem('analysisHistory', JSON.stringify(analysisHistory));
    
    // Update chart if it exists
    if (mentalHealthChart) {
      updateMentalHealthChart();
    }
  }
  
  function updateAnalysisUI() {
    // Update progress bars
    depressionBar.style.width = `${analysis.depression}%`;
    anxietyBar.style.width = `${analysis.anxiety}%`;
    happinessBar.style.width = `${analysis.happiness}%`;
    suicidalBar.style.width = `${analysis.suicidal}%`;
    stressBar.style.width = `${analysis.stress}%`;
    
    // Update numeric values
    depressionValue.textContent = `${analysis.depression}%`;
    anxietyValue.textContent = `${analysis.anxiety}%`;
    happinessValue.textContent = `${analysis.happiness}%`;
    suicidalValue.textContent = `${analysis.suicidal}%`;
    stressValue.textContent = `${analysis.stress}%`;
    
    // Update recommendations
    updateRecommendations();
  }
  
  function updateRecommendations() {
    let recommendationsHTML = '';
    
    // Check for suicidal risk - highest priority
    if (analysis.suicidal > 50) {
      recommendationsHTML = `
        <div class="alert severe">
          <div class="alert-header">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
                 viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16
                       a2 2 0 0 0 1.73-3Z"></path>
              <path d="M12 9v4"></path>
              <path d="M12 17h.01"></path>
            </svg>
            <p>Immediate professional help recommended</p>
          </div>
          <p>
            Please contact a mental health professional or call a crisis helpline immediately.
            National Suicide Prevention Lifeline: 988 or 1-800-273-8255<br>
            Mental Health Helpline (India - iCall): +91-9152987821<br>
            Emergency Services (India): 112
          </p>
        </div>
      `;
    } else if (analysis.suicidal > 30) {
      recommendationsHTML = `
        <div class="alert warning">
          <div class="alert-header">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
                 viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16
                       a2 2 0 0 0 1.73-3Z"></path>
              <path d="M12 9v4"></path>
              <path d="M12 17h.01"></path>
            </svg>
            <p>Professional support recommended</p>
          </div>
          <p>
            It seems you may be experiencing difficult thoughts. Consider speaking with a mental health professional.
            Remember that support is available and these feelings can improve with proper help.
          </p>
        </div>
      `;
    }
    
    let recommendations = [];
    
    // Depression recommendations based on severity
    if (analysis.depression > 70) {
      recommendations.push("Your responses suggest significant feelings of depression. Please consider speaking with a mental health professional as soon as possible.");
      recommendations.push("Try to maintain daily routines and engage in small activities that have brought you joy in the past.");
    } else if (analysis.depression > 50) {
      recommendations.push("Consider speaking with a mental health professional about your feelings of depression.");
      recommendations.push("Regular physical activity, even just a short daily walk, can help improve mood.");
    } else if (analysis.depression > 30) {
      recommendations.push("Practice self-care activities that boost your mood, such as spending time in nature or connecting with supportive friends.");
    }
    
    // Anxiety recommendations based on severity
    if (analysis.anxiety > 70) {
      recommendations.push("Your responses indicate high levels of anxiety. Professional support could be beneficial.");
      recommendations.push("Try the 5-4-3-2-1 grounding technique: Acknowledge 5 things you see, 4 things you can touch, 3 things you hear, 2 things you smell, and 1 thing you taste.");
    } else if (analysis.anxiety > 50) {
      recommendations.push("Practice deep breathing exercises: Breathe in slowly for 4 counts, hold for 2, and exhale for 6 counts. Repeat for 2-3 minutes.");
      recommendations.push("Consider limiting caffeine and alcohol, which can worsen anxiety symptoms.");
    } else if (analysis.anxiety > 30) {
      recommendations.push("Try mindfulness meditation or guided relaxation exercises to help manage feelings of anxiety.");
    }
    
    // Stress recommendations based on severity
    if (analysis.stress > 70) {
      recommendations.push("Your stress levels appear quite high. Consider ways to reduce commitments or delegate tasks where possible.");
      recommendations.push("Schedule short breaks throughout your day - even 5-minute pauses can help reset your stress response.");
    } else if (analysis.stress > 50) {
      recommendations.push("Regular physical activity and adequate sleep can significantly help reduce stress levels.");
      recommendations.push("Try journaling about your stressors and potential solutions to help process your thoughts.");
    } else if (analysis.stress > 30) {
      recommendations.push("Practice stress-reduction techniques like progressive muscle relaxation or gentle yoga.");
    }
    
    // Happiness/positive recommendations
    if (analysis.happiness > 70) {
      recommendations.push("You're showing strong positive emotions! Consider journaling about what's going well to reference during more difficult times.");
    } else if (analysis.happiness < 30 && analysis.depression < 30 && analysis.anxiety < 30) {
      recommendations.push("Try incorporating small pleasurable activities into your daily routine to boost your mood.");
      recommendations.push("Practicing gratitude by noting three things you're thankful for each day can help increase positive emotions.");
    }
    
    // If all metrics are low, provide general wellness recommendations
    if (analysis.depression < 30 && analysis.anxiety < 30 && analysis.stress < 30 && analysis.suicidal < 10) {
      if (recommendations.length === 0) {
        recommendations.push("Continue practicing self-care and maintaining your mental well-being.");
        recommendations.push("Regular exercise, healthy eating, adequate sleep, and social connection are key pillars of mental health.");
      }
    }
    
    // Add recommendations to HTML
    if (recommendations.length > 0) {
      recommendationsHTML += `
        <h4>Recommendations:</h4>
        <ul class="recommendations-list">
          ${recommendations.map(rec => `<li>${rec}</li>`).join('')}
        </ul>
      `;
    }
    
    // Add a disclaimer
    recommendationsHTML += `
      <div class="disclaimer">
        <p><small>Note: These recommendations are generated based on your conversation patterns and are not a substitute for professional medical advice, diagnosis, or treatment.</small></p>
      </div>
    `;
    
    recommendationsContainer.innerHTML = recommendationsHTML;
  }
  
  function setActiveTab(tabName) {
    activeTab = tabName;
    
    // Update which tab is active
    mobileNavTabs.forEach(tab => {
      if (tab.getAttribute('data-tab') === tabName) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });
    
    // Show/hide content based on active tab (mobile only)
    if (tabName === 'history') {
      historySidebar.classList.add('active');
      chatContainer.classList.remove('active');
      analysisSidebar.classList.remove('active');
    } else if (tabName === 'chat') {
      historySidebar.classList.remove('active');
      chatContainer.classList.add('active');
      analysisSidebar.classList.remove('active');
    } else if (tabName === 'analysis') {
      historySidebar.classList.remove('active');
      chatContainer.classList.remove('active');
      analysisSidebar.classList.add('active');
    }
  }
  
  function formatDate(date) {
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  // Initialize Mental Health Chart
  function initMentalHealthChart() {
    const ctx = document.getElementById('mentalHealthChart').getContext('2d');
    
    // Get the last 7 entries or fewer if not available
    const recentEntries = analysisHistory.slice(-7);
    
    const labels = recentEntries.map(entry => {
      const date = new Date(entry.date);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
    
    mentalHealthChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Depression',
            data: recentEntries.map(entry => entry.depression),
            borderColor: '#2563eb', // blue-600
            backgroundColor: 'rgba(37, 99, 235, 0.1)',
            tension: 0.3,
            borderWidth: 2
          },
          {
            label: 'Anxiety',
            data: recentEntries.map(entry => entry.anxiety),
            borderColor: '#eab308', // yellow-500
            backgroundColor: 'rgba(234, 179, 8, 0.1)',
            tension: 0.3,
            borderWidth: 2
          },
          {
            label: 'Happiness',
            data: recentEntries.map(entry => entry.happiness),
            borderColor: '#22c55e', // green-500
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            tension: 0.3,
            borderWidth: 2
          },
          {
            label: 'Stress',
            data: recentEntries.map(entry => entry.stress),
            borderColor: '#a855f7', // purple-500
            backgroundColor: 'rgba(168, 85, 247, 0.1)',
            tension: 0.3,
            borderWidth: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              boxWidth: 12,
              font: {
                size: 10
              }
            }
          },
          tooltip: {
            mode: 'index',
            intersect: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            ticks: {
              stepSize: 20
            }
          }
        }
      }
    });
  }
  
  // Update Mental Health Chart with new data
  function updateMentalHealthChart() {
    if (!mentalHealthChart) return;
    
    // Get the last 7 entries
    const recentEntries = analysisHistory.slice(-7);
    
    const labels = recentEntries.map(entry => {
      const date = new Date(entry.date);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
    
    mentalHealthChart.data.labels = labels;
    mentalHealthChart.data.datasets[0].data = recentEntries.map(entry => entry.depression);
    mentalHealthChart.data.datasets[1].data = recentEntries.map(entry => entry.anxiety);
    mentalHealthChart.data.datasets[2].data = recentEntries.map(entry => entry.happiness);
    mentalHealthChart.data.datasets[3].data = recentEntries.map(entry => entry.stress);
    
    mentalHealthChart.update();
  }
  
  // Handle window resizing
  window.addEventListener('resize', () => {
    if (window.innerWidth >= 768) {
      // On desktop, ensure chat is visible
      chatContainer.classList.add('active');
    } else {
      // On mobile, only show the active tab
      setActiveTab(activeTab);
    }
  });
});
