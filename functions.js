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

function displayProjectsWithLeastTime() {
    const allTimeSplits = JSON.parse(localStorage.getItem('allTimeSplits')) || [];

    // Get the current date
    const currentDate = new Date();

    // Calculate the date 7 days ago
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(currentDate.getDate() - 7);

    // Filter data for the last 7 days
    const last7DaysData = allTimeSplits.filter(item => {
        const startTime = new Date(item.startTime);
        return startTime >= sevenDaysAgo && startTime <= currentDate;
    });

    // Calculate total time logged for each customer
    const projectTimeMap = {};
    last7DaysData.forEach(item => {
        const customer = item.customer || 'Unknown';
        const project = item.project || 'Unknown';
        const keyString = `${customer} - ${project}`;
        const startTime = new Date(item.startTime);
        const endTime = new Date(item.endTime);
        const duration = endTime - startTime;
        projectTimeMap[keyString] = (projectTimeMap[keyString] || 0) + duration;
    });

    // Sort customers based on total time logged
    const sortedProjects = Object.keys(projectTimeMap).sort((a, b) => projectTimeMap[a] - projectTimeMap[b]);

    // Display customers with least time logged
    let leastTimeProjects = [];
    sortedProjects.forEach(keyString => {
        const totalTimeLogged = projectTimeMap[keyString] / (1000 * 60 * 60); // Convert milliseconds to hours
        let leastStr = `${keyString}: ${totalTimeLogged.toFixed(2)} hours`;
        leastTimeProjects.push(leastStr);
    });

    // Display customers with no time logged
    let zeroTimeProjectsSet = new Set();
    const archivedCustomers = getArchivedItems('customer');
    const archivedProjects = getArchivedItems('project');
    allTimeSplits.forEach(item => {
        const customer = item.customer || 'Unknown';
        if (!archivedCustomers.includes(customer)) {
            const project = item.project || 'Unknown';
            const keyString = `${customer} - ${project}`;
            if(!(keyString in projectTimeMap) && !archivedProjects.includes(keyString)) {
                zeroTimeProjectsSet.add(keyString);
            }
        }
    });
    const zeroTimeProjects = [...zeroTimeProjectsSet].sort();

    return {
        'leastTimeProjects': leastTimeProjects,
        'zeroTimeProjects': zeroTimeProjects
    };
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

function getArchivedItems(category) {
    // Retrieve the data from localStorage
    if (category === 'customer') {
        const archivedCustomers = JSON.parse(localStorage.getItem('archivedCustomers'));
        return archivedCustomers || [];
    } else if (category === 'project') {
        const archivedProjects = JSON.parse(localStorage.getItem('archivedProjects'));
        return archivedProjects || [];
    }
}

function filterOutArchivedItems(items, category) {
    const archivedItems = getArchivedItems(category);
    return items.filter(item => !archivedItems.includes(item));
}

function getAllCustomerProjectPairs() {
    // Retrieve the data from localStorage
    const data = JSON.parse(localStorage.getItem('allTimeSplits'));

    // Initialize a Set to store unique customer-project pairs
    const uniquePairs = new Set();

    // Iterate over each entry and add customer-project pairs to the Set
    data.forEach(entry => {
        const pair = `${entry.customer} - ${entry.project}`;
        uniquePairs.add(pair);
    });

    // Convert the Set back to an array
    return Array.from(uniquePairs);
}

function getActiveItems(category) {
    // Retrieve the data from localStorage
    if (category === 'customer') {
        const uniqueCustomers = getUniqueValues(category);
        return filterOutArchivedItems(uniqueCustomers, category);
    } else if (category === 'project') {
        const allProjects = getAllCustomerProjectPairs();
        return filterOutArchivedItems(allProjects, category);
    }
}

// Function to update localStorage for archived customers
function updateArchivedItems(archivedItems, category) {
    if (archivedItems === null) {
        archivedItems = [];
    }
    if (category === 'customer') {
        localStorage.setItem('archivedCustomers', JSON.stringify(archivedItems));
    } else if (category === 'project') {
        localStorage.setItem('archivedProjects', JSON.stringify(archivedItems));
    }
}
