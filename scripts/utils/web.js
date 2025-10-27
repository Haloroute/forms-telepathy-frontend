async function getCurrentTab() {
    let queryOptions = { active: true, lastFocusedWindow: true };
    // `tab` will either be a `tabs.Tab` instance or `undefined`.
    let tabList = await chrome.tabs.query(queryOptions);
    if (tabList != undefined) return tabList[0];
    else return null;
}

async function fetchData(url, type='json', options={}) {
    try {
        const defaultOptions = {
            signal: AbortSignal.timeout(30000),
            ...options
        };
        
        const response = await fetch(url, defaultOptions);
        if (!response.ok) {
            throw new Error(`Network response was not ok! Status: ${response.status}`);
        }

        let data;
        if (type == 'json') {
            data = await response.json();
            console.log("Successfully received JSON data from: ", url);
        } else if (type == 'text') {
            data = await response.text();
            console.log("Successfully received TEXT data from: ", url);
        }

        return data;
        
    } catch (error) {
        console.log('Error fetching data from: ', url);
        console.log('with error: ', error);
        return null;
    }
}

function getCurrentLocale(localeList, default_locale, current_locale) {
    current_locale = current_locale.replaceAll("-", "_");
    if (localeList.includes(current_locale)) return current_locale;
    else if (localeList.includes(current_locale.split("_")[0])) return current_locale.split("_")[0];
    else if (localeList.includes(default_locale)) return default_locale;
    else if (localeList.length > 0) return localeList[0];
    else return null;
}

// ============ Backend API Functions ============
/**
 * Get active notifications from backend
 * @param {string} backendUrl - Backend base URL
 * @returns {Promise<Object|null>} Notifications data or null if error
 */
async function getActiveNotifications(backendUrl) {
    const url = `${backendUrl}/notifications?active=true`;
    return await fetchData(url, 'json');
}

/**
 * Get all active and visible quizzes from backend
 * @param {string} backendUrl - Backend base URL
 * @returns {Promise<Object|null>} Quizzes data or null if error
 */
async function getActiveQuizzes(backendUrl) {
    const url = `${backendUrl}/quizzes?active=true`;
    return await fetchData(url, 'json');
}

/**
 * Get quiz by specific key
 * @param {string} backendUrl - Backend base URL
 * @param {string} key - Quiz key (e.g., "ABC123")
 * @returns {Promise<Object|null>} Quiz data or null if error
 */
async function getQuizByKey(backendUrl, key) {
    const url = `${backendUrl}/quizzes/key?key=${encodeURIComponent(key)}`;
    return await fetchData(url, 'json');
}

/**
 * Upload a new quiz to backend
 * @param {string} backendUrl - Backend base URL
 * @param {Object} quizData - Quiz data object
 * @param {string} quizData.name - Quiz name
 * @param {string} quizData.description - Quiz description
 * @param {string} quizData.url - Microsoft Forms URL
 * @param {Object} quizData.content - Quiz content (AnswerType1, AnswerType2, Metadata)
 * @param {string} quizData.expired_at - Expiration date (ISO format)
 * @param {boolean} [quizData.visible=true] - Quiz visibility
 * @returns {Promise<Object|null>} Response data with quiz key or null if error
 */
async function uploadQuiz(backendUrl, quizData) {
    try {
        const url = `${backendUrl}/quizzes`;
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(quizData)
        };
        
        const response = await fetchData(url, 'json', options);
        
        if (response && response.success) {
            console.log('Successfully uploaded quiz with key:', response.data.key);
        }
        
        return response;
        
    } catch (error) {
        console.error('Error uploading quiz:', error);
        return null;
    }
}

// ============ Data Extraction Functions ============
/**
 * Helper function to get quiz data from Microsoft Forms page
 * @param {string} id - The ID prefix of the forms, which identifies the data in storage
 * @returns {Object} Extracted quiz data (name, description, answers)
 */
function getFormsData(id) {
    function getName() {
        const questionItems = document.getElementsByClassName('text-format-content');
        if (questionItems.length >= 2) formName = questionItems[0].textContent;
        else formName = "Untitled Form";

        return formName;
    }
    function getDescription() {
        const questionItems = document.getElementsByClassName('text-format-content');
        if (questionItems.length >= 2) formDescription = questionItems[1].textContent;
        else formDescription = "No Description";

        return formDescription;
    }

    function getAnswer(id) {
        let localLength = localStorage.length, sessionLength = sessionStorage.length, jsonAnswer;

        for (var p = 0; p < sessionLength; p++) {
            let thisKey = sessionStorage.key(p);
            //alert("x - " + thisKey);
            if (thisKey.startsWith(id)) {
                jsonAnswer = sessionStorage.getItem(thisKey);
            }
        }
        //alert("4 - " + localStorage.length);
        for (var p = 0; p < localLength; p++) {
            let thisKey = localStorage.key(p);
            //alert("x - " + thisKey);
            if (thisKey.startsWith(id)) {
                jsonAnswer = localStorage.getItem(thisKey);
            }
        }
        return jsonAnswer;
    }

    return {
        name: getName(),
        description: getDescription(),
        answers: getAnswer(id)
    };
}

/**
 * Helper function to prepare quiz data for upload
 * @param {string} name - Quiz name
 * @param {string} description - Quiz description
 * @param {string} url - Microsoft Forms URL
 * @param {Object} content - Quiz content object
 * @param {Date|string} expiredAt - Expiration date
 * @param {boolean} [visible=true] - Quiz visibility
 * @returns {Object} Formatted quiz data ready for upload
 */
function prepareQuizData(name, description, url, content, expiredAt, visible = true) {
    // Convert Date to ISO string if needed
    const expiredAtString = expiredAt instanceof Date ? 
        expiredAt.toISOString() : expiredAt;
    
    return {
        name: name,
        description: description,
        url: url,
        content: content,
        expired_at: expiredAtString,
        visible: visible
    };
}