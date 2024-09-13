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
