function getAllTimeSplits() {
    return JSON.parse(localStorage.getItem('allTimeSplits')) || [];
}

function getProjectStatus() {
    return JSON.parse(localStorage.getItem('projectStatus')) || {};
}

// Function to convert milliseconds to hours with two decimal points
function millisecondsToHours(milliseconds) {
    // Convert milliseconds to hours
    const hours = milliseconds / 3600000;
    // Round to two decimal points and return as a string
    return hours.toFixed(2);
}

function getUniqueCustomerProjectPairs(data) {
    const pairs = new Set();
    data.forEach(entry => {
        pairs.add(`${entry.customer}şpłïț${entry.project}`);
    });
    return Array.from(pairs).map(pair => {
        const [customer, project] = pair.split('şpłïț');
        return { customer, project };
    });
}

function initializeProjectStatuses(pairs, statuses) {
    pairs.forEach(pair => {
        const key = `${pair.customer}-${pair.project}`;
        if (!statuses[key]) {
            statuses[key] = 'None';
        }
    });
    localStorage.setItem('projectStatus', JSON.stringify(statuses));
    return statuses;
}

function initializeLast7DaysDurations(allPairs) {
    // Get all splits
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

    // Calculate total time logged for each customer-project pair
    const projectTimeMap = {};
    last7DaysData.forEach(item => {
        const customer = item.customer || 'Unknown';
        const project = item.project || 'Unknown';
        const keyString = `${customer}-${project}`;
        const startTime = new Date(item.startTime);
        const endTime = new Date(item.endTime);
        const duration = endTime - startTime;
        projectTimeMap[keyString] = (projectTimeMap[keyString] || 0) + duration;
    });

    const last7DayDurations = {};
    allPairs.forEach(pair => {
        const key = `${pair.customer}-${pair.project}`;
        last7DayDurations[key] = projectTimeMap[key] || 0;
    });

    return last7DayDurations;
}

const statusOptions = ['In Progress', 'On Hold', 'Completed', 'Canceled', 'None', 'Not Eligible'];
const reminderOptions = ['In Progress', 'None'];

function renderTable(warningsOnly = false) {
    // Retrieve and organize data
    const allTimeSplits = getAllTimeSplits();
    const uniquePairs = getUniqueCustomerProjectPairs(allTimeSplits);
    let projectStatus = getProjectStatus();
    projectStatus = initializeProjectStatuses(uniquePairs, projectStatus);
    durations = initializeLast7DaysDurations(uniquePairs);

    const tbody = document.querySelector('#customerProjectTable tbody');
    tbody.innerHTML = '';

    uniquePairs.forEach(pair => {
        const customerProjectKey = `${pair.customer}-${pair.project}`;
        const statusValue = projectStatus[customerProjectKey];
        let warningRow = false;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${pair.customer}</td>
            <td>${pair.project}</td>
            <td>
                <select>
                    ${statusOptions.map(status => `<option value="${status}" ${status === statusValue ? 'selected' : ''}>${status}</option>`).join('')}
                </select>
            </td>
            <td>${millisecondsToHours(durations[customerProjectKey])}</td>
        `;
        if (reminderOptions.includes(statusValue)) {
            if (durations[customerProjectKey] === 0) {
                row.style.backgroundColor = "#ffe6e6";
                warningRow = true;
            } else if (durations[customerProjectKey] < 1800000) {
                row.style.backgroundColor = "#ffffe6";
                warningRow = true;
            }
        }
        row.querySelector('select').addEventListener('change', (e) => {
            projectStatus[customerProjectKey] = e.target.value;
            localStorage.setItem('projectStatus', JSON.stringify(projectStatus));
            renderTable(warningsOnly);
        });

        // Check if row should be displayed
        if (!warningsOnly || (warningsOnly && warningRow)) {
            tbody.appendChild(row);
        }
    });
}

// When filterWarningsBtn is clicked, render the table with only the warning projects
document.querySelector('#filterWarningsBtn').addEventListener('click', () => {
    renderTable(true);
});

// When showAll is clicked, render the table with all projects
document.querySelector('#showAllBtn').addEventListener('click', () => {
    renderTable(false);
});

// Show all projects by default
renderTable(false);