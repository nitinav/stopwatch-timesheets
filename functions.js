function formatDuration(duration) {
    const totalSeconds = Math.floor(duration / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return pad(hours) + ':' + pad(minutes) + ':' + pad(seconds);
}

function pad(num) {
    return (num < 10 ? '0' : '') + num;
}

// Function to convert milliseconds to hours with two decimal points
function millisecondsToHours(milliseconds) {
    // Convert milliseconds to hours
    const hours = milliseconds / 3600000;
    // Round to two decimal points and return as a string
    return hours.toFixed(2);
}

// Function to get the day of the week treating Sunday as the last day
function getDayTreatSundayAsLast(date) {
    const day = date.getDay();
    return day === 0 ? 7 : day; // Treat Sunday (0) as 7
}

function sortObjectByDate(obj, sortOrder) {
    // Convert object to array of key-value pairs
    const entries = Object.entries(obj);

    // Sort the array based on the keys (dates)
    entries.sort((a, b) => {
        // Convert keys (dates) to Date objects
        const dateA = new Date(a[0]);
        const dateB = new Date(b[0]);

        // Compare dates based on the sorting order
        if (sortOrder === 'asc') {
            return dateA - dateB;
        } else if (sortOrder === 'desc') {
            return dateB - dateA;
        } else {
            // Default to ascending order if sortOrder is not specified or invalid
            return dateA - dateB;
        }
    });

    // Convert the sorted array back to an object
    const sortedObject = {};
    entries.forEach(([key, value]) => {
        sortedObject[key] = value;
    });

    return sortedObject;
}

function hashString(value) {
    let hash = 2166136261;
    const text = String(value ?? '');
    for (let i = 0; i < text.length; i++) {
        hash ^= text.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString();
}

function getLastExportHashes() {
    try {
        const storedValue = localStorage.getItem('lastExportHashes');
        return storedValue ? JSON.parse(storedValue) : {};
    } catch (error) {
        return {};
    }
}

function showNoExportChangesMessage() {
    if (typeof document === 'undefined' || !document.body) {
        return;
    }

    let message = document.getElementById('exportStatusMessage');
    if (!message) {
        message = document.createElement('div');
        message.id = 'exportStatusMessage';
        message.style.position = 'fixed';
        message.style.right = '20px';
        message.style.bottom = '20px';
        message.style.background = 'rgba(0, 0, 0, 0.8)';
        message.style.color = '#fff';
        message.style.padding = '8px 12px';
        message.style.borderRadius = '6px';
        message.style.fontSize = '12px';
        message.style.zIndex = '9999';
        message.style.opacity = '1';
        message.style.transition = 'opacity 0.2s ease';
        document.body.appendChild(message);
    }

    message.textContent = 'No changes to export.';
    message.hidden = false;
    message.style.opacity = '1';

    const safeClearTimeout = typeof clearTimeout === 'function' ? clearTimeout : () => {};
    const schedule = typeof setTimeout === 'function' ? setTimeout : () => 0;

    safeClearTimeout(message._hideTimeout);
    message._hideTimeout = schedule(() => {
        message.style.opacity = '0';
        schedule(() => {
            message.hidden = true;
            message.textContent = '';
        }, 200);
    }, 1500);
}

// Function to allow the user to download all localStorage entries as a zip of JSON files
function downloadAllTimeSplits() {
    if (typeof JSZip === 'undefined') {
        alert('The zip export library could not be loaded. Please refresh the page and try again.');
        return;
    }

    const previousHashes = getLastExportHashes();
    const changedEntries = {};
    const currentHashes = {};

    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || key === 'lastExportHashes' || key === 'lastExportTimestamp') {
            continue;
        }

        const rawValue = localStorage.getItem(key);
        const currentHash = hashString(rawValue);
        currentHashes[key] = currentHash;

        if (previousHashes[key] !== currentHash) {
            let jsonValue = null;
            try {
                jsonValue = rawValue === null ? null : JSON.parse(rawValue);
            } catch (error) {
                jsonValue = rawValue;
            }
            changedEntries[key] = jsonValue;
        }
    }

    if (Object.keys(changedEntries).length === 0) {
        showNoExportChangesMessage();
        return;
    }

    const zip = new JSZip();
    const changedKeys = Object.keys(changedEntries);
    for (let i = 0; i < changedKeys.length; i++) {
        const key = changedKeys[i];
        zip.file(`${key}.json`, JSON.stringify(changedEntries[key], null, 2));
    }

    zip.generateAsync({ type: 'blob' })
        .then(blob => {
            const url = URL.createObjectURL(blob);
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.href = url;
            downloadAnchorNode.download = `splits-localStorage-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.zip`;
            document.body.appendChild(downloadAnchorNode); // required for firefox
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
            URL.revokeObjectURL(url);

            localStorage.setItem('lastExportHashes', JSON.stringify(currentHashes));
            localStorage.setItem('lastExportTimestamp', Date.now().toString());
            if (typeof updateExportButtonVisibility === 'function') {
                updateExportButtonVisibility();
            }
        })
        .catch(error => {
            console.error('Failed to export localStorage as zip.', error);
            alert('Failed to export localStorage as a zip file.');
        });
}

function getUniqueValues(key, filterDict = {}) {
    // Retrieve data from localStorage
    const localStorageData = JSON.parse(localStorage.getItem('allTimeSplits')) || [];

    // Sort by endTime in descending order (most recent first)
    localStorageData.sort((a, b) => new Date(b.endTime) - new Date(a.endTime));

    // Apply optional filtering based on filterDict
    const filteredData = localStorageData.filter(item => {
        for (const [key, value] of Object.entries(filterDict)) {
            if (item[key] !== value) {
                return false;
            }
        }
        return true;
    });

    // Extract unique values for key
    const uniqueValues = [...new Set(filteredData.map(item => item[key]))];

    return uniqueValues;
}

// Function to calculate the total duration in milliseconds
function calculateTotalDuration(startTime, endTime) {
    const start = new Date(startTime);
    const end = new Date(endTime);
    return end - start;
}

// Helper: format numeric display to 2 decimal places
function formatNumber(n) {
    const num = Number(n) || 0;
    return num.toFixed(2);
}

// Helper: compute per-day hours = totalHours / (5 - weekdaysRemaining - daysOff)
function computePerDay(totalHours, daysOff, weekdaysRemaining = 0) {
    const doff = isNaN(daysOff) ? 0 : Number(daysOff);
    const workingDays = 5 - (isNaN(weekdaysRemaining) ? 0 : Number(weekdaysRemaining)) - doff;
    if (workingDays <= 0) return 0;
    const v = totalHours / workingDays;
    return isFinite(v) ? v : 0;
}

// Helper: number of weekdays remaining in the week for a given weekISO (YYYY-MM-DD or ISO string)
function weekdaysRemainingInWeek(weekISO) {
    try {
        const today = new Date();
        // normalize to local date (00:00)
        const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        // start counting from tomorrow (do not count today)
        t.setDate(t.getDate() + 1);
        const weekEnd = new Date(weekISO);
        // if weekEnd is before tomorrow, remaining is 0
        if (weekEnd < t) return 0;

        let count = 0;
        const cur = new Date(t);
        while (cur <= weekEnd) {
            const day = cur.getDay();
            if (day >= 1 && day <= 5) count++;
            cur.setDate(cur.getDate() + 1);
        }
        return count;
    } catch (e) {
        return 0;
    }
}

// Function to calculate current week's Per Day value
function getCurrentWeekPerDay() {
    const allTimeSplits = JSON.parse(localStorage.getItem('allTimeSplits')) || [];
    const weeklyMeta = JSON.parse(localStorage.getItem('weeklyMeta') || '{}');
    
    // Get today's date
    const today = new Date();
    const currentDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    // Calculate week end (Friday or Sunday depending on convention)
    const weekEnd = new Date(currentDate);
    weekEnd.setDate(weekEnd.getDate() + (7 - getDayTreatSundayAsLast(currentDate)));
    const weekKey = weekEnd.toISOString().slice(0, 10);
    const weekDate = weekEnd.toLocaleDateString();
    
    // Sum total duration for this week
    let totalDuration = 0;
    allTimeSplits.forEach(split => {
        const splitDate = new Date(split.startTime);
        const splitWeekEnd = new Date(splitDate.getFullYear(), splitDate.getMonth(), 
                                     splitDate.getDate() + 7 - getDayTreatSundayAsLast(splitDate));
        if (splitWeekEnd.toISOString().slice(0, 10) === weekKey) {
            totalDuration += calculateTotalDuration(split.startTime, split.endTime);
        }
    });
    
    const totalHours = totalDuration / 3600000;
    const meta = weeklyMeta[weekDate] || { daysOff: 0 };
    const weekdaysRemaining = weekdaysRemainingInWeek(weekEnd.toISOString().slice(0, 10));
    
    return computePerDay(totalHours, meta.daysOff, weekdaysRemaining);
}

// Determine the next milestone threshold for a week's average per day.
function getNextMilestoneTarget(perDay) {
    const value = Number(perDay) || 0;
    if (value < 6) return 6;
    if (value < 7) return 7;
    return 7;
}

// Count the number of workdays completed in the current week, including today.
function getWeekdaysPassedInWeek(date = new Date()) {
    const currentDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const weekEnd = new Date(currentDate);
    weekEnd.setDate(weekEnd.getDate() + (7 - getDayTreatSundayAsLast(currentDate)));
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekEnd.getDate() - 6);

    let count = 0;
    const cursor = new Date(weekStart);
    while (cursor <= currentDate) {
        const day = cursor.getDay();
        if (day >= 1 && day <= 5) count++;
        cursor.setDate(cursor.getDate() + 1);
    }
    return count;
}

function getCurrentWeekDaysOff(date = new Date()) {
    const currentDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const weekEnd = new Date(currentDate);
    weekEnd.setDate(weekEnd.getDate() + (7 - getDayTreatSundayAsLast(currentDate)));
    const weekDate = weekEnd.toLocaleDateString();
    const weeklyMeta = JSON.parse(localStorage.getItem('weeklyMeta') || '{}');
    return Number(weeklyMeta[weekDate]?.daysOff) || 0;
}

// Determine how many additional hours are needed today to reach the next milestone.
function getHoursNeededForNextMilestone(perDay, daysPassed = getWeekdaysPassedInWeek(), daysOff = getCurrentWeekDaysOff()) {
    const value = Number(perDay) || 0;
    const passed = Math.max(0, Number(daysPassed) || 0);
    const off = Math.max(0, Number(daysOff) || 0);
    const effectivePassed = Math.max(1, passed - off);
    const target = getNextMilestoneTarget(value);
    const totalHoursSoFar = value * effectivePassed;
    const totalHoursNeeded = target * effectivePassed;
    return Math.max(0, Number((totalHoursNeeded - totalHoursSoFar).toFixed(2)));
}

// Function to update Per Day display in navbar
function updateNavbarPerDay() {
    const perDayDisplay = document.getElementById('navbar-per-day');
    const navbar = document.querySelector('.navbar');
    if (perDayDisplay && navbar) {
        const perDay = getCurrentWeekPerDay();
        const daysPassed = getWeekdaysPassedInWeek();
        const daysOff = getCurrentWeekDaysOff();
        const target = getNextMilestoneTarget(perDay);
        const hoursNeeded = getHoursNeededForNextMilestone(perDay, daysPassed, daysOff);
        perDayDisplay.textContent = `This Week: ${formatNumber(perDay)} h/day • Need ${formatNumber(hoursNeeded)} h today to reach ${formatNumber(target)} h/day`;

        // Apply navbar background color based on value
        navbar.classList.remove('per-day-good', 'per-day-bad');
        if (perDay >= 7) {
            navbar.classList.add('per-day-good');
        } else if (perDay < 6) {
            navbar.classList.add('per-day-bad');
        }
    }
}

// Render a consistent navbar into pages. Pages should include a container
// with id="navbar-root" where the navbar will be injected.
function renderNavbar() {
    const root = document.getElementById('navbar-root');
    if (!root) return;

    const navHtml = `
    <div class="navbar">
        <a href="index.html">Home</a>
        <a href="editSplits.html">Edit Splits</a>
        <a href="daily.html">Daily Summaries</a>
        <a href="weekly.html">Weekly Summaries</a>
        <div id="navbar-per-day"></div>
    </div>`;

    root.innerHTML = navHtml;

    // mark active link based on current page filename
    try {
        const page = window.location.pathname.split('/').pop() || 'index.html';
        const links = root.querySelectorAll('.navbar a');
        links.forEach(a => {
            const href = a.getAttribute('href');
            if (href === page || (href === 'index.html' && page === '')) {
                a.classList.add('active');
            } else {
                a.classList.remove('active');
            }
        });
    } catch (e) {
        // ignore
    }

    // update per-day display immediately
    if (typeof updateNavbarPerDay === 'function') updateNavbarPerDay();
}

document.addEventListener('DOMContentLoaded', () => {
    renderNavbar();
});
