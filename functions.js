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

// Function to allow the user to download allTimeSplits in localstorage as a JSON file
function downloadAllTimeSplits() {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(localStorage.getItem('allTimeSplits'));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute('href', dataStr);
    downloadAnchorNode.setAttribute('download', 'allTimeSplits.json');
    document.body.appendChild(downloadAnchorNode); // required for firefox
    localStorage.setItem('lastExportTimestamp', Date.now().toString());
    if (typeof updateExportButtonVisibility === 'function') {
        updateExportButtonVisibility();
    }
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
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

// Function to update Per Day display in navbar
function updateNavbarPerDay() {
    const perDayDisplay = document.getElementById('navbar-per-day');
    const navbar = document.querySelector('.navbar');
    if (perDayDisplay && navbar) {
        const perDay = getCurrentWeekPerDay();
        perDayDisplay.textContent = `This Week: ${formatNumber(perDay)} h`;
        
        // Apply navbar background color based on value
        navbar.classList.remove('per-day-good', 'per-day-bad');
        if (perDay >= 7) {
            navbar.classList.add('per-day-good');
        } else if (perDay < 6) {
            navbar.classList.add('per-day-bad');
        }
    }
}
