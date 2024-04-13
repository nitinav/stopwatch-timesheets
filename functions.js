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

function displayCustomersWithLeastTime() {
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
    const customerTimeMap = {};
    last7DaysData.forEach(item => {
        const customer = item.customer || 'Unknown';
        const startTime = new Date(item.startTime);
        const endTime = new Date(item.endTime);
        const duration = endTime - startTime;
        customerTimeMap[customer] = (customerTimeMap[customer] || 0) + duration;
    });

    console.log(customerTimeMap);

    // Sort customers based on total time logged
    const sortedCustomers = Object.keys(customerTimeMap).sort((a, b) => customerTimeMap[a] - customerTimeMap[b]);

    // Display customers with least time logged
    console.log('Customers with least time logged in the last 7 days:');
    let leastTimeCustomers = [];
    sortedCustomers.forEach(customer => {
        const totalTimeLogged = customerTimeMap[customer] / (1000 * 60 * 60); // Convert milliseconds to hours
        let leastStr = `${customer}: ${totalTimeLogged.toFixed(2)} hours`;
        leastTimeCustomers.push(leastStr);
        console.log(leastStr);
    });

    // Display customers with no time logged
    console.log('Customers with no time logged in the last 7 days:');
    let zeroTimeCustomers = [];
    const allCustomers = new Set(allTimeSplits.map(item => item.customer || 'Unknown'));
    const customersWithNoTimeLogged = Array.from(allCustomers).filter(customer => !(customer in customerTimeMap));
    customersWithNoTimeLogged.forEach(customer => {
        zeroTimeCustomers.push(customer);
        console.log(customer);
    });

    return {
        'leastTimeCustomers': leastTimeCustomers,
        'zeroTimeCustomers': zeroTimeCustomers
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
