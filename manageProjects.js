function getAllTimeSplits() {
    return JSON.parse(localStorage.getItem('allTimeSplits')) || [];
}

function getProjectStatus() {
    return JSON.parse(localStorage.getItem('projectStatus')) || {};
}

function getUniqueCustomerProjectPairs(data) {
    const pairs = new Set();
    data.forEach(entry => {
        pairs.add(`${entry.customer}-${entry.project}`);
    });
    return Array.from(pairs).map(pair => {
        const [customer, project] = pair.split('-');
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

const statusOptions = ['In Progress', 'On Hold', 'Completed', 'Canceled', 'None', 'No Reminders'];

function renderTable() {
    // Retrieve and organize data
    const allTimeSplits = getAllTimeSplits();
    const uniquePairs = getUniqueCustomerProjectPairs(allTimeSplits);
    let projectStatus = getProjectStatus();
    projectStatus = initializeProjectStatuses(uniquePairs, projectStatus);

    const tbody = document.querySelector('#customerProjectTable tbody');
    tbody.innerHTML = '';

    uniquePairs.forEach(pair => {
        const statusKey = `${pair.customer}-${pair.project}`;
        const statusValue = projectStatus[statusKey];

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${pair.customer}</td>
            <td>${pair.project}</td>
            <td>
                <select>
                    ${statusOptions.map(status => `<option value="${status}" ${status === statusValue ? 'selected' : ''}>${status}</option>`).join('')}
                </select>
            </td>
        `;
        row.querySelector('select').addEventListener('change', (e) => {
            projectStatus[statusKey] = e.target.value;
            localStorage.setItem('projectStatus', JSON.stringify(projectStatus));
        });
        tbody.appendChild(row);
    });
}

renderTable();