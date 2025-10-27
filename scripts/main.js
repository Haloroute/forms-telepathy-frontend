const backendUrl = "https://forms-telepathy.fly.dev";
const startUrl = "https://forms.office.com/pages/responsepage.aspx?id=";

const manifestData = chrome.runtime.getManifest();
const defaultLocale = manifestData.default_locale;
const currentLocale = manifestData.current_locale;

const cellContainer = document.getElementById('cellContainer');
const noticeContainer = document.getElementById('noticeContainer');
const infoButton = document.getElementById('infoButton');

const loadingLabel = chrome.i18n.getMessage('loadingLabel');
const formsOpenedLabel = chrome.i18n.getMessage('formsOpenedLabel');
const formsNotOpenedLabel = chrome.i18n.getMessage('formsNotOpenedLabel');
const noInternetLabel = chrome.i18n.getMessage('noInternetLabel');
const versionInfo = chrome.i18n.getMessage('versionInfo', manifestData.version);
const infoButtonContent = chrome.i18n.getMessage('infoButton');


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
                // Load forms logic here
            } else if (targetSubtab === 'save') {
                console.log('Save sub-tab activated');
                // Save forms logic here
            }
        });
    });
}

// Load notifications from backend
async function loadNotifications() {
    const notificationsList = document.getElementById('notificationsList');
    
    // Show loading state
    notificationsList.innerHTML = '<div class="notification-loading">Loading notifications...</div>';
    
    try {
        const notifications = await fetchData(`${backendUrl}/notifications?active=true`, 'json');
        
        if (!notifications || !notifications.data || notifications.data.length === 0) {
            notificationsList.innerHTML = '<div class="notification-empty">No active notifications</div>';
            return;
        }
        
        // Clear loading message
        notificationsList.innerHTML = '';
        
        // Create notification cards
        notifications.data.forEach(notification => {
            const card = document.createElement('div');
            card.className = 'notification-card';
            
            const content = document.createElement('div');
            content.className = 'notification-content';
            content.textContent = notification.content;
            
            card.appendChild(content);
            notificationsList.appendChild(card);
        });
        
        console.log('Successfully loaded notifications:', notifications.data.length);
    } catch (error) {
        console.error('Error loading notifications:', error);
        notificationsList.innerHTML = '<div class="notification-error">Failed to load notifications. Please check your internet connection.</div>';
    }
}

function splitNotice(noticeData) { return noticeData.split(/\r\n|\r|\n/); }

function initialize(currentTab, answerJson, noticeJson) {    
    let quizCount = answerJson.length;  
    let noticeLocale = getCurrentLocale(Object.keys(noticeJson), defaultLocale, currentLocale);
    
    if (currentTab == null || !currentTab.url.match(/https\:\/\/forms\.office\.com\/Pages\/ResponsePage/i)) {
        changeNotification(formsNotOpenedLabel, "#FF5733");
        console.log("Microsoft Forms website hasn't been opened yet");
    } else {
        changeNotification(formsOpenedLabel, "#4CAF50");
        console.log("Microsoft Forms website has already been opened");       
    }

    for (let q = 0; q < quizCount; ++q) {
        console.log("Quiz: ", JSON.stringify(answerJson[q]));
        
        let eventJson = [];
        if (currentTab != null && currentTab.url.toLowerCase().includes(answerJson[q].Url.toLowerCase())) {
            eventJson.push({ id: 1, args: answerJson[q].AnswerType1 });
            eventJson.push({ id: 2, args: answerJson[q].AnswerType2 });
        } else eventJson.push({ id: 0, args: answerJson[q].Url });
        
        let quizLocale = getCurrentLocale(Object.keys(answerJson[q].Metadata), defaultLocale, currentLocale);

        if (quizLocale != null) {
            cellContainer.appendChild(createQuizCell(answerJson[q].Metadata[quizLocale].Name, 
                answerJson[q].Metadata[quizLocale].Info, 'quiz' + q, eventJson));
            console.log("Successfully initialized quiz: ", answerJson[q].Metadata[quizLocale].Name);
        }
    }
}

document.getElementById('checkUrlSpan').textContent = loadingLabel;     
document.getElementById('infoButton').textContent = infoButtonContent;

document.addEventListener('DOMContentLoaded', async function () {
    // Initialize main tabs
    initializeTabs();
    
    // Initialize sub-tabs for Forms
    initializeSubTabs();
    
    // let answerJson = await fetchData(answerUrl, 'json');
    // let noticeJson = await fetchData(noticeUrl, 'json');

    // if (answerJson == null) {
    //     changeNotification(noInternetLabel, "#666");
    //     alert('Error fetching data');
    // }
    // else {
    //     let currentTab = await getCurrentTab();        
    //     initialize(currentTab, answerJson, noticeJson);
    // }
});

infoButton.addEventListener('click', function() { alert(versionInfo); });