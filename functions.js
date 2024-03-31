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
