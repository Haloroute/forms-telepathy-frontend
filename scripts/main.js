const backendUrl = "https://forms-telepathy.fly.dev/api";
const startUrl = "https://forms.office.com/pages/responsepage.aspx?id=";

// Global variable to store extracted forms content
let extractedFormsContent = null;
let allQuizzes = []; // Store all quizzes for filtering
let currentTab = null; // Store current tab info
let saveTabState = 'initial'; // Track save tab state: 'initial', 'extracted', 'uploaded'
let uploadedKey = null; // Store uploaded key

// Tab switching functionality
function initializeTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');
            
            // Remove active class from all buttons and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked button and corresponding content
            button.classList.add('active');
            document.getElementById(`${targetTab}-tab`).classList.add('active');
            
            // Load notifications when switching to notifications tab
            if (targetTab === 'notifications') {
                loadNotifications();
            }
        });
    });
}

// Sub-tab switching functionality for Forms
function initializeSubTabs() {
    const subtabButtons = document.querySelectorAll('.subtab-button');
    const subtabContents = document.querySelectorAll('.subtab-content');

    subtabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetSubtab = button.getAttribute('data-subtab');
            
            // Remove active class from all sub-buttons and sub-contents
            subtabButtons.forEach(btn => btn.classList.remove('active'));
            subtabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked button and corresponding content
            button.classList.add('active');
            document.getElementById(`${targetSubtab}-subtab`).classList.add('active');
            
            // Handle different sub-tabs
            if (targetSubtab === 'load') {
                console.log('Load sub-tab activated');
                initializeLoadTab();
            } else if (targetSubtab === 'save') {
                console.log('Save sub-tab activated');
                initializeSaveTab();
            }
        });
    });
}

// Initialize search functionality
function initializeSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const searchModeRadios = document.querySelectorAll('input[name="searchMode"]');
    
    // Update placeholder based on search mode
    searchModeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'key') {
                searchInput.placeholder = 'Enter quiz key...';
            } else {
                searchInput.placeholder = 'Search quizzes by name or description...';
            }
            searchInput.value = ''; // Clear search input when mode changes
        });
    });
    
    // Search on button click
    searchButton.addEventListener('click', performSearch);
    
    // Search on Enter key
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performSearch();
        }
    });
}

// Perform search based on selected mode
async function performSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchQuery = searchInput.value.trim();
    const searchMode = document.querySelector('input[name="searchMode"]:checked').value;
    const loadStatusLabel = document.getElementById('loadStatusLabel');
    
    if (!searchQuery) {
        // If search is empty, reload all quizzes
        initializeLoadTab();
        return;
    }
    
    try {
        loadStatusLabel.innerHTML = '<div class="quiz-loading">Searching...</div>';
        loadStatusLabel.style.color = '#999';
        
        if (searchMode === 'key') {
            // Search by key
            const response = await getQuizByKey(backendUrl, searchQuery.toUpperCase());
            
            if (!response || !response.success || !response.data) {
                loadStatusLabel.innerHTML = '<div class="quiz-empty">No quiz found with this key</div>';
                return;
            }

            loadStatusLabel.innerHTML = '<div class="quiz-found">Found 1 quiz</div>';
            loadStatusLabel.style.color = '#4CAF50';
            
            // Display single quiz
            displayQuizzes([response.data], currentTab);
            
        } else {
            // Search by name/description (filter from all quizzes)
            const searchLower = searchQuery.toLowerCase();
            const filteredQuizzes = allQuizzes.filter(quiz => {
                const nameMatch = quiz.name.toLowerCase().includes(searchLower);
                const descMatch = quiz.description && quiz.description.toLowerCase().includes(searchLower);
                return nameMatch || descMatch;
            });
            
            if (filteredQuizzes.length === 0) {
                loadStatusLabel.innerHTML = '<div class="quiz-empty">No quizzes match your search</div>';
                return;
            }

            loadStatusLabel.innerHTML = `<div class="quiz-found">Found ${filteredQuizzes.length} quiz(es)</div>`;
            
            // Sort filtered quizzes - matching URL first
            const currentUrl = currentTab ? currentTab.url.toLowerCase() : '';
            const sortedQuizzes = filteredQuizzes.sort((a, b) => {
                const aMatches = currentUrl.includes(a.url.toLowerCase());
                const bMatches = currentUrl.includes(b.url.toLowerCase());
                
                if (aMatches && !bMatches) return -1;
                if (!aMatches && bMatches) return 1;
                return 0;
            });
            
            displayQuizzes(sortedQuizzes, currentTab);
        }
        
    } catch (error) {
        console.error('Error searching quizzes:', error);
        loadStatusLabel.innerHTML = '<div class="quiz-error">Error searching quizzes</div>';
        loadStatusLabel.style.color = '#c62828';
    }
}

// Initialize Load tab
async function initializeLoadTab() {
    const loadStatusLabel = document.getElementById('loadStatusLabel');
    const quizListContainer = document.getElementById('quizListContainer');
    const searchInput = document.getElementById('searchInput');

    // Clear search input
    searchInput.value = '';

    try {
        loadStatusLabel.innerHTML = '<div class="quiz-loading">Loading quizzes...</div>';
        loadStatusLabel.style.color = '#999';

        // Get current tab
        currentTab = await getCurrentTab();
        const currentUrl = currentTab ? currentTab.url : '';

        // Fetch active quizzes from backend
        const response = await getActiveQuizzes(backendUrl);

        if (!response || !response.success || !response.data || response.data.length === 0) {
            loadStatusLabel.innerHTML = '<div class="quiz-empty">No active quizzes found</div>';
            allQuizzes = [];
            return;
        }

        loadStatusLabel.innerHTML = `<div class="quiz-found">Found ${response.data.length} quiz(es)</div>`;
        loadStatusLabel.style.color = '#4CAF50';

        // Store all quizzes globally
        allQuizzes = response.data;

        // Sort quizzes - matching URL first
        const quizzes = response.data.sort((a, b) => {
            const aMatches = currentUrl.toLowerCase().includes(a.url.toLowerCase());
            const bMatches = currentUrl.toLowerCase().includes(b.url.toLowerCase());

            if (aMatches && !bMatches) return -1;
            if (!aMatches && bMatches) return 1;
            return 0;
        });

        // Display quizzes
        displayQuizzes(quizzes, currentTab);

    } catch (error) {
        console.error('Error loading quizzes:', error);
        loadStatusLabel.innerHTML = '<div class="quiz-error">Error loading quizzes</div>';
        loadStatusLabel.style.color = '#c62828';
        allQuizzes = [];
    }
}

// Display quizzes list
function displayQuizzes(quizzes, currentTab) {
    const quizListContainer = document.getElementById('quizListContainer');
    quizListContainer.innerHTML = '';

    const currentUrl = currentTab ? currentTab.url.toLowerCase() : '';
    const isFormsPage = currentTab && currentTab.url.match(/https:\/\/forms\.office\.com\/pages\/responsepage/i);

    quizzes.forEach(quiz => {
        const card = document.createElement('div');
        card.className = 'quiz-card';

        // Check if this quiz matches current page
        const isCurrentPage = currentUrl.includes(quiz.url.toLowerCase());
        if (isCurrentPage) {
            card.classList.add('current-page');
        }

        // Quiz name
        const name = document.createElement('div');
        name.className = 'quiz-name';
        name.textContent = quiz.name;

        // Quiz description
        const description = document.createElement('div');
        description.className = 'quiz-description';
        description.textContent = quiz.description || 'No description';

        // Quiz footer (key + button)
        const footer = document.createElement('div');
        footer.className = 'quiz-footer';

        // Quiz key
        const key = document.createElement('span');
        key.className = 'quiz-key';
        key.textContent = quiz.key;

        // Action button
        const button = document.createElement('button');
        button.className = 'quiz-action-button';

        if (isCurrentPage && isFormsPage) {
            // Green button - Load Answer
            button.classList.add('load-answer');
            button.textContent = 'Load Answer';
            button.addEventListener('click', () => loadQuizAnswer(quiz, currentTab));
        } else {
            // Orange button - Open URL
            button.classList.add('open-url');
            button.textContent = 'Open Form';
            button.addEventListener('click', () => openQuizUrl(quiz.url));
        }

        footer.appendChild(key);
        footer.appendChild(button);

        card.appendChild(name);
        card.appendChild(description);
        card.appendChild(footer);

        quizListContainer.appendChild(card);
    });
}

// Open quiz URL in new tab
function openQuizUrl(url) {
    chrome.tabs.create({ url: url });
    console.log('Opening quiz URL:', url);
}

// Load quiz answer into current form
async function loadQuizAnswer(quiz, currentTab) {
    try {
        console.log('Loading answer for quiz:', quiz.key);
        const answerContent = quiz.content;
        if (!answerContent) {
            alert('Quiz answer data is invalid!');
            return;
        }

        const formsId = currentTab.url.slice(startUrl.length).split("&")[0];
        const storageId = "officeforms.answermap." + formsId;

        // Step 1: Generate storage key-value pair
        await chrome.scripting.executeScript({
            target: { tabId: currentTab.id },
            function: generateStorageKeyValuePair,
            args: []
        });

        // Step 2: Replace value in storage
        const result = await chrome.scripting.executeScript({
            target: { tabId: currentTab.id },
            function: replaceValueType1,
            args: [storageId, answerContent]
        });

        const counter = result[0].result;    
        if (counter > 0) {
            chrome.tabs.reload(currentTab.id);
            alert('Answer loaded successfully! The page will reload.');
            console.log('Successfully loaded answer (type 1)');
        } else {
            alert('Failed to load answer. Please try again.');
            console.log('Failed to load answer - no matching keys found');
        }

    } catch (error) {
        console.error('Error loading quiz answer:', error);
        alert('Error loading answer: ' + error.message);
    }
}

// Initialize Save tab
async function initializeSaveTab() {
    const saveStatusLabel = document.getElementById('saveStatusLabel');
    const extractDataButton = document.getElementById('extractDataButton');
    const formsDataContainer = document.getElementById('formsDataContainer');
    
    // Check if already uploaded - restore uploaded state
    if (saveTabState === 'uploaded' && uploadedKey) {
        // Remove any existing key container to avoid duplicates
        const existingKeyContainer = document.querySelector('.uploaded-key-container');
        if (existingKeyContainer) {
            existingKeyContainer.remove();
        }
        
        displaySuccessKey(uploadedKey);
        return;
    }
    
    // Check if data already extracted - restore extracted state
    if (saveTabState === 'extracted' && extractedFormsContent) {
        saveStatusLabel.textContent = 'Data extracted successfully!';
        saveStatusLabel.style.color = '#4CAF50';
        extractDataButton.style.display = 'none';
        formsDataContainer.style.display = 'block';
        return;
    }
    
    // Initial state - check current page
    try {
        const currentTab = await getCurrentTab();
        
        if (!currentTab || !currentTab.url.match(/https:\/\/forms\.office\.com\/pages\/responsepage/i)) {
            // Not a Microsoft Forms page
            saveStatusLabel.textContent = 'This page is not a Microsoft Forms page. Please navigate to a Microsoft Forms to extract data.';
            saveStatusLabel.style.color = '#999';
            extractDataButton.style.display = 'none';
            formsDataContainer.style.display = 'none';
        } else {
            // Is a Microsoft Forms page
            saveStatusLabel.textContent = 'Microsoft Forms page detected. Click the button below to extract data.';
            saveStatusLabel.style.color = '#4CAF50';
            extractDataButton.style.display = 'block';
            formsDataContainer.style.display = 'none';
        }
    } catch (error) {
        console.error('Error initializing save tab:', error);
        saveStatusLabel.textContent = 'Error detecting current page.';
        saveStatusLabel.style.color = '#c62828';
    }
}

// Extract forms data
async function extractFormsData() {
    const extractDataButton = document.getElementById('extractDataButton');
    const saveStatusLabel = document.getElementById('saveStatusLabel');
    
    try {
        extractDataButton.disabled = true;
        extractDataButton.textContent = 'Extracting...';
        
        const currentTab = await getCurrentTab();
        
        if (!currentTab.url.match(/https:\/\/forms\.office\.com\/pages\/responsepage/i)) {
            alert('This is not a Microsoft Forms page!');
            return;
        }
        
        const id = currentTab.url.slice(startUrl.length).split("&")[0];
        const storageId = "officeforms.answermap." + id;
        
        chrome.scripting.executeScript({
            target: { tabId: currentTab.id },
            function: getFormsData,
            args: [storageId]
        }, result => {
            if (result && result[0] && result[0].result !== null) {
                const formsData = result[0].result;
                formsData.url = currentTab.url;
                
                // Store content globally
                extractedFormsContent = formsData.answers;
                
                // Update save tab state
                saveTabState = 'extracted';
                
                // Display extracted data
                displayFormsData(formsData);
                
                saveStatusLabel.textContent = 'Data extracted successfully!';
                saveStatusLabel.style.color = '#4CAF50';
                
                // Hide extract button
                extractDataButton.style.display = 'none';
            } else {
                alert('No matching key found! Please check the form and try again!');
                saveStatusLabel.textContent = 'Failed to extract data.';
                saveStatusLabel.style.color = '#c62828';
            }
            
            extractDataButton.disabled = false;
            extractDataButton.textContent = 'Extract Forms Data';
        });
        
    } catch (error) {
        console.error('Error extracting forms data:', error);
        alert('Error extracting forms data: ' + error.message);
        extractDataButton.disabled = false;
        extractDataButton.textContent = 'Extract Forms Data';
    }
}

// Display extracted forms data
function displayFormsData(formsData) {
    const formsDataContainer = document.getElementById('formsDataContainer');
    
    // Populate form fields - name and description are now editable
    document.getElementById('formsName').value = formsData.name || 'Untitled Form';
    document.getElementById('formsDescription').value = formsData.description || 'No Description';
    
    // Format created at as current time
    const now = new Date();
    const createdAtFormatted = formatDateTime(now);
    document.getElementById('formsCreatedAt').value = createdAtFormatted;
    
    // Set default expired at (7 days from now)
    const expiredAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    document.getElementById('formsExpiredAt').value = formatDateTimeLocal(expiredAt);
    
    // Show the form container
    formsDataContainer.style.display = 'block';
}

// Format date time for display (DD/MM/YYYY HH:mm:ss)
function formatDateTime(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

// Format date time for datetime-local input (YYYY-MM-DDTHH:mm)
function formatDateTimeLocal(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// Copy text to clipboard
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        console.log('Copied to clipboard:', text);
    }).catch(err => {
        console.error('Failed to copy:', err);
    });
}

// Display success key after upload
function displaySuccessKey(key) {
    const saveStatusLabel = document.getElementById('saveStatusLabel');
    const extractDataButton = document.getElementById('extractDataButton');
    const formsDataContainer = document.getElementById('formsDataContainer');
    
    // Hide form container
    formsDataContainer.style.display = 'none';
    
    // Don't show extract button again
    extractDataButton.style.display = 'none';
    
    // Remove existing key container if any
    const existingKeyContainer = document.querySelector('.uploaded-key-container');
    if (existingKeyContainer) {
        existingKeyContainer.remove();
    }
    
    // Create key display container
    const keyContainer = document.createElement('div');
    keyContainer.className = 'uploaded-key-container';
    keyContainer.style.textAlign = 'center';
    keyContainer.style.padding = '20px';
    keyContainer.style.animation = 'fadeIn 0.3s';
    
    const keyLabel = document.createElement('span');
    keyLabel.className = 'quiz-key';
    keyLabel.textContent = key;
    keyLabel.style.fontSize = '16px';
    keyLabel.style.padding = '8px 16px';
    keyLabel.style.cursor = 'pointer';
    keyLabel.style.display = 'inline-block';
    keyLabel.style.transition = 'transform 0.2s, box-shadow 0.2s';
    
    // Add hover effect
    keyLabel.addEventListener('mouseenter', () => {
        keyLabel.style.transform = 'translateY(-2px)';
        keyLabel.style.boxShadow = '0 4px 8px rgba(255, 140, 0, 0.3)';
    });
    
    keyLabel.addEventListener('mouseleave', () => {
        keyLabel.style.transform = 'translateY(0)';
        keyLabel.style.boxShadow = 'none';
    });
    
    // Copy to clipboard on click
    keyLabel.addEventListener('click', () => {
        copyToClipboard(key);
        saveStatusLabel.textContent = 'Key copied to clipboard!';
        saveStatusLabel.style.color = '#4CAF50';
        
        // Reset message after 2 seconds
        setTimeout(() => {
            saveStatusLabel.textContent = 'Quiz uploaded successfully! Click the key to copy.';
        }, 2000);
    });
    
    const instructionText = document.createElement('div');
    instructionText.textContent = 'Share this key with others';
    instructionText.style.fontSize = '12px';
    instructionText.style.color = '#666';
    instructionText.style.marginTop = '10px';
    
    keyContainer.appendChild(keyLabel);
    keyContainer.appendChild(instructionText);
    
    // Clear and update save subtab
    const saveSubtab = document.getElementById('save-subtab');
    saveSubtab.appendChild(keyContainer);
    
    // Update status label
    saveStatusLabel.textContent = 'Quiz uploaded successfully! Click the key to copy.';
    saveStatusLabel.style.color = '#4CAF50';
}

// Submit forms data to server
async function submitFormsData() {
    const submitButton = document.getElementById('submitFormsButton');
    
    try {
        submitButton.disabled = true;
        submitButton.textContent = 'Submitting...';
        
        // Get form values (name and description can now be edited)
        const name = document.getElementById('formsName').value.trim();
        const description = document.getElementById('formsDescription').value.trim();
        const expiredAtInput = document.getElementById('formsExpiredAt').value;
        const visible = document.getElementById('formsVisible').checked;
        
        if (!name) {
            alert('Please enter a quiz name!');
            submitButton.disabled = false;
            submitButton.textContent = 'Submit to Server';
            return;
        }
        
        if (!expiredAtInput) {
            alert('Please select an expiration date!');
            submitButton.disabled = false;
            submitButton.textContent = 'Submit to Server';
            return;
        }
        
        if (!extractedFormsContent) {
            alert('No forms content to upload!');
            submitButton.disabled = false;
            submitButton.textContent = 'Submit to Server';
            return;
        }
        
        // Get current tab URL
        const currentTab = await getCurrentTab();
        const url = currentTab.url;
        
        // Convert datetime-local to ISO string
        const expiredAt = new Date(expiredAtInput).toISOString();
        
        // Prepare quiz data with updated name and description
        const quizData = prepareQuizData(
            name,
            description,
            url,
            extractedFormsContent,
            expiredAt,
            visible
        );
        
        console.log('Uploading quiz data:', quizData);
        
        // Upload to backend
        const response = await uploadQuiz(backendUrl, quizData);
        
        if (response && response.success) {
            // Store uploaded key
            uploadedKey = response.data.key;
            
            // Update save tab state
            saveTabState = 'uploaded';
            
            // Display success key instead of alert
            displaySuccessKey(response.data.key);
            
            // Clear extracted content
            extractedFormsContent = null;
        } else {
            const errorMsg = response && response.message ? response.message : 'Unknown error';
            alert(`Failed to upload quiz: ${errorMsg}`);
            submitButton.disabled = false;
            submitButton.textContent = 'Submit to Server';
        }
        
    } catch (error) {
        console.error('Error submitting forms data:', error);
        alert('Error submitting forms data: ' + error.message);
        submitButton.disabled = false;
        submitButton.textContent = 'Submit to Server';
    }
}

// Format relative time (e.g., "2 hours ago", "Just now")
function formatRelativeTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffSecs < 60) {
        return 'JUST NOW';
    } else if (diffMins < 60) {
        return `${diffMins} MINUTE${diffMins > 1 ? 'S' : ''} AGO`;
    } else if (diffHours < 24) {
        return `${diffHours} HOUR${diffHours > 1 ? 'S' : ''} AGO`;
    } else if (diffDays < 7) {
        return `${diffDays} DAY${diffDays > 1 ? 'S' : ''} AGO`;
    } else {
        // Format as DD/MM/YYYY HH:MM
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${day}/${month}/${year} ${hours}:${minutes}`;
    }
}

// Load notifications from backend
async function loadNotifications() {
    const notificationsList = document.getElementById('notificationsList');
    
    // Show loading state
    notificationsList.innerHTML = '<div class="notification-loading">Loading notifications...</div>';
    
    try {
        // Use getActiveNotifications from web.js
        const response = await getActiveNotifications(backendUrl);
        
        if (!response || !response.success || !response.data || response.data.length === 0) {
            notificationsList.innerHTML = '<div class="notification-empty">No active notifications</div>';
            return;
        }
        
        // Sort notifications by created_at (newest first)
        const sortedNotifications = response.data.sort((a, b) => {
            return new Date(b.created_at) - new Date(a.created_at);
        });
        
        // Clear loading message
        notificationsList.innerHTML = '';
        
        // Create notification cards
        sortedNotifications.forEach(notification => {
            const card = document.createElement('div');
            card.className = 'notification-card';
            
            // Timestamp
            const timestamp = document.createElement('div');
            timestamp.className = 'notification-timestamp';
            timestamp.textContent = formatRelativeTime(notification.created_at);
            
            // Content
            const content = document.createElement('div');
            content.className = 'notification-content';
            content.textContent = notification.content;
            
            card.appendChild(timestamp);
            card.appendChild(content);
            notificationsList.appendChild(card);
        });
        
        console.log('Successfully loaded notifications:', response.data.length);
    } catch (error) {
        console.error('Error loading notifications:', error);
        notificationsList.innerHTML = '<div class="notification-error">Failed to load notifications. Please check your internet connection.</div>';
    }
}

document.addEventListener('DOMContentLoaded', async function () {
    // Initialize main tabs
    initializeTabs();
    
    // Initialize sub-tabs for Forms
    initializeSubTabs();
    
    // Initialize search functionality
    initializeSearch();
    
    // Initialize load tab on first load
    initializeLoadTab();
    
    // Add event listener for extract button
    document.getElementById('extractDataButton').addEventListener('click', extractFormsData);
    
    // Add event listener for submit button
    document.getElementById('submitFormsButton').addEventListener('click', submitFormsData);
});