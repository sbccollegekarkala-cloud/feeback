// Submitted Students Page - Shows students who submitted feedback in table format

let allSubmissions = [];
let filteredSubmissions = [];
let currentUser = null;
let currentSortColumn = 'rollNumber';
let currentSortDirection = 'asc';

// Wait for modules to load
function waitForModules() {
    return new Promise((resolve) => {
        const checkModules = () => {
            if (window.Storage && typeof window.Storage.getFeedbacks === 'function' && typeof window.checkAuth === 'function') {
                resolve();
            } else {
                setTimeout(checkModules, 100);
            }
        };
        checkModules();
    });
}

// Initialize page
async function initializePage() {
    await waitForModules();

    currentUser = await checkAuth('admin');
    if (!currentUser) {
        window.location.href = 'index.html';
        return;
    }

    // Set user initials
    if (currentUser.name) {
        const initials = currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase();
        document.getElementById('userInitials').textContent = initials;
    }

    // Load data to populate filters
    try {
        await loadData();
        // After data loads, show empty state message
        showEmptyState();
    } catch (error) {
        console.error('Error loading initial data:', error);
        showAlert('Error loading data. Please refresh the page.', 'error');
    }
}

// Load all data (called when search button is clicked)
async function loadData() {
    try {
        console.log('Loading submitted students data...');
        const startTime = performance.now();

        // Get all feedbacks (uses cache if available)
        const feedbacks = await Storage.getFeedbacks();
        console.log('Feedbacks loaded:', feedbacks.length);

        // Get all users for additional details (uses cache)
        const users = await Storage.getUsers();
        console.log('Users loaded:', users.length);

        // Get all surveys for survey names (uses cache)
        const surveys = await Storage.getSurveys();
        console.log('Surveys loaded:', surveys.length);

        // Get all classes to resolve class IDs to names (uses cache)
        const classes = await Storage.getClasses();
        console.log('Classes loaded:', classes.length);
        
        const loadTime = (performance.now() - startTime).toFixed(2);
        console.log(`⏱️ Data loaded in ${loadTime}ms`);

        // Process submissions
        allSubmissions = feedbacks.map(feedback => {
            const user = users.find(u => u.id === feedback.studentId);
            const survey = surveys.find(s => s.id === feedback.surveyId);

            // Get class name - prioritize looking up by classId first
            let className = 'Unknown';

            // Try to get class name from classId (most reliable)
            if (feedback.studentClassId) {
                const classObj = classes.find(c => c.id === feedback.studentClassId);
                if (classObj) {
                    className = classObj.name;
                }
            }

            // Fallback to other fields if classId lookup failed
            if (className === 'Unknown') {
                className = feedback.studentClassName || feedback.studentClass || feedback.studentDepartment || (user && user.className) || 'Unknown';
            }

            return {
                id: feedback.id,
                studentId: feedback.studentId,
                studentName: feedback.studentName || (user && user.name) || 'Unknown',
                studentEmail: (user && user.email) || 'N/A',
                rollNumber: (user && user.rollNumber) || 'N/A',
                department: className,
                year: feedback.studentYear || 0,
                surveyId: feedback.surveyId,
                surveyTitle: (survey && survey.title) || 'Unknown Survey',
                submittedAt: feedback.submittedAt || feedback.timestamp || new Date().toISOString(),
                teachersEvaluated: (feedback.selectedTeachers && feedback.selectedTeachers.length) || 0,
                responsesCount: (feedback.responses && feedback.responses.length) || 0
            };
        });

        // Sort by submission date (newest first)
        allSubmissions.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

        console.log('Processed submissions:', allSubmissions.length);

        // Populate filter dropdowns
        populateFilters();
        
        // Show empty state by default, waiting for user to apply filters
        showEmptyState();

    } catch (error) {
        console.error('Error loading data:', error);
        showAlert('Error loading data: ' + error.message, 'error');
    }
}

// Populate filter dropdowns
function populateFilters() {
    // Populate years from database
    const years = [...new Set(allSubmissions.map(s => s.year))].sort((a, b) => a - b);
    const yearSelect = document.getElementById('filterYear');
    yearSelect.innerHTML = '<option value="">-- Select Year --</option><option value="all">All Years</option>';
    years.forEach(year => {
        if (year) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = `Year ${year}`;
            yearSelect.appendChild(option);
        }
    });

    // Populate departments (classes) from database
    const departments = [...new Set(allSubmissions.map(s => s.department))].sort();
    const deptSelect = document.getElementById('filterDepartment');
    deptSelect.innerHTML = '<option value="">-- Select Class --</option><option value="all">All Classes</option>';
    departments.forEach(dept => {
        if (dept && dept !== 'Unknown') {
            const option = document.createElement('option');
            option.value = dept;
            option.textContent = dept;
            deptSelect.appendChild(option);
        }
    });
}

// Search students - independent search function
async function searchStudents() {
    try {
        const searchTerm = document.getElementById('studentSearch').value.trim().toLowerCase();

        if (!searchTerm) {
            showAlert('Please enter a search term', 'warning');
            return;
        }

        // Search all submissions
        filteredSubmissions = allSubmissions.filter(submission => {
            return submission.studentName.toLowerCase().includes(searchTerm) ||
                   submission.studentEmail.toLowerCase().includes(searchTerm) ||
                   submission.rollNumber.toString().toLowerCase().includes(searchTerm);
        });

        // Sort by roll number
        filteredSubmissions.sort((a, b) => {
            const rollA = String(a.rollNumber || '').toLowerCase();
            const rollB = String(b.rollNumber || '').toLowerCase();
            return rollA.localeCompare(rollB);
        });

        console.log('Search results:', filteredSubmissions.length);

        if (filteredSubmissions.length === 0) {
            showNoResultsState();
        } else {
            displaySubmissions();
        }
    } catch (error) {
        console.error('Error searching:', error);
        showAlert('Error: ' + error.message, 'error');
    }
}

// Reset search
function resetSearch() {
    document.getElementById('studentSearch').value = '';
    showEmptyState();
}

// Apply filters (independent from search)
function applyFilters() {
    const year = document.getElementById('filterYear').value;
    const department = document.getElementById('filterDepartment').value;

    if (!year && !department) {
        showAlert('Please select at least one filter', 'warning');
        return;
    }

    // Filter submissions
    filteredSubmissions = allSubmissions.filter(submission => {
        // Year filter
        if (year && year !== 'all' && submission.year.toString() !== year) {
            return false;
        }

        // Department filter
        if (department && department !== 'all' && submission.department !== department) {
            return false;
        }

        return true;
    });

    // Sort by roll number
    filteredSubmissions.sort((a, b) => {
        const rollA = String(a.rollNumber || '').toLowerCase();
        const rollB = String(b.rollNumber || '').toLowerCase();
        return rollA.localeCompare(rollB);
    });

    console.log('Filtered submissions:', filteredSubmissions.length);

    if (filteredSubmissions.length === 0) {
        showNoResultsState();
    } else {
        displaySubmissions();
    }
}

// Reset filters
function resetFilters() {
    document.getElementById('filterYear').value = '';
    document.getElementById('filterDepartment').value = '';
    document.getElementById('studentSearch').value = '';

    filteredSubmissions = [];
    showEmptyState();
}

// Show empty state
function showEmptyState() {
    const emptyState = document.getElementById('emptyState');
    emptyState.style.display = 'flex';
    emptyState.innerHTML = `
        <span>📭</span>
        <h3>No Data Selected</h3>
        <p>Please select year and class to view submitted students</p>
    `;
    document.getElementById('studentsContainer').style.display = 'none';
    document.getElementById('statsSection').style.display = 'none';
}

// Show no results state
function showNoResultsState() {
    const emptyState = document.getElementById('emptyState');
    emptyState.style.display = 'flex';
    emptyState.innerHTML = `
        <span>🔍</span>
        <h3>No Results Found</h3>
        <p>No students match your filter criteria. Try adjusting your filters.</p>
    `;
    document.getElementById('studentsContainer').style.display = 'none';
    document.getElementById('statsSection').style.display = 'none';
}

// Display submissions
function displaySubmissions() {
    // Hide empty state
    document.getElementById('emptyState').style.display = 'none';

    // Show containers
    document.getElementById('studentsContainer').style.display = 'block';
    document.getElementById('statsSection').style.display = 'grid';

    // Update statistics
    updateStatistics();

    // Display students list
    displayStudentsList();
}

// Update statistics
function updateStatistics() {
    const totalSubmissions = filteredSubmissions.length;
    const uniqueSurveys = new Set(filteredSubmissions.map(s => s.surveyId)).size;

    document.getElementById('totalSubmissions').textContent = totalSubmissions;
    document.getElementById('surveysCompleted').textContent = uniqueSurveys;
}

// Display students list in table
function displayStudentsList() {
    const tbody = document.getElementById('studentsTableBody');
    document.getElementById('studentCount').textContent = filteredSubmissions.length;

    tbody.innerHTML = '';

    // Submissions are already sorted by roll number during filter/search
    filteredSubmissions.forEach((submission, index) => {
        const row = document.createElement('tr');

        const yearSuffix = submission.year === 1 ? 'st' :
            submission.year === 2 ? 'nd' :
            submission.year === 3 ? 'rd' : 'th';

        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${submission.rollNumber}</td>
            <td class="student-details-cell">
                <div class="truncated-cell" title="${submission.studentName}">${submission.studentName}</div>
                <div class="truncated-cell" title="${submission.studentEmail}">${submission.studentEmail}</div>
            </td>
            <td class="truncated-cell" title="${submission.department}">${submission.department}</td>
            <td>${submission.year}${yearSuffix} Year</td>
            <td>
                <button class="delete-btn" onclick="deleteFeedback('${submission.id}', '${submission.studentName}')" title="Delete feedback">
                    🗑️ Delete
                </button>
            </td>
        `;

        tbody.appendChild(row);
    });
}

// Sort submissions based on column and direction
function sortSubmissions(submissions, column, direction) {
    return submissions.sort((a, b) => {
        let valueA, valueB;

        switch (column) {
            case 'rollNumber':
                // Extract numeric part from roll number for proper sorting
                const rollA = String(a.rollNumber).toLowerCase();
                const rollB = String(b.rollNumber).toLowerCase();
                const matchA = rollA.match(/\d+/);
                const matchB = rollB.match(/\d+/);
                const numA = parseInt(matchA ? matchA[0] : '0');
                const numB = parseInt(matchB ? matchB[0] : '0');
                
                if (numA !== numB) {
                    valueA = numA;
                    valueB = numB;
                } else {
                    valueA = rollA;
                    valueB = rollB;
                }
                break;

            case 'name':
                valueA = a.studentName.toLowerCase();
                valueB = b.studentName.toLowerCase();
                break;

            case 'department':
                valueA = a.department.toLowerCase();
                valueB = b.department.toLowerCase();
                break;

            case 'year':
                valueA = a.year;
                valueB = b.year;
                break;

            default:
                return 0;
        }

        // Compare values
        let comparison = 0;
        if (typeof valueA === 'number' && typeof valueB === 'number') {
            comparison = valueA - valueB;
        } else {
            comparison = valueA > valueB ? 1 : valueA < valueB ? -1 : 0;
        }

        return direction === 'asc' ? comparison : -comparison;
    });
}

// Sort table by column
function sortTable(column) {
    // Toggle direction if clicking the same column
    if (currentSortColumn === column) {
        currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        currentSortColumn = column;
        currentSortDirection = 'asc';
    }

    // Re-display with new sorting
    displayStudentsList();
}

// Update sort indicators in table headers
function updateSortIndicators() {
    // Remove all sort classes
    document.querySelectorAll('.students-table th').forEach(th => {
        th.classList.remove('sort-asc', 'sort-desc');
    });

    // Add sort class to current column
    const columnMap = {
        'rollNumber': 1,
        'name': 2,
        'department': 3,
        'year': 4
    };

    const columnIndex = columnMap[currentSortColumn];
    if (columnIndex) {
        const th = document.querySelectorAll('.students-table th')[columnIndex];
        th.classList.add(currentSortDirection === 'asc' ? 'sort-asc' : 'sort-desc');
    }
}


// Export to CSV
function exportToCSV() {
    if (filteredSubmissions.length === 0) {
        showAlert('No data to export. Please apply filters first.', 'warning');
        return;
    }

    // Get filter values for report header
    const year = document.getElementById('filterYear').value;
    const department = document.getElementById('filterDepartment').value;

    // Apply current sorting to export
    const sortedSubmissions = sortSubmissions([...filteredSubmissions], currentSortColumn, currentSortDirection);

    // Build CSV content
    const csv = [];

    // Header
    csv.push('Submitted Students Report');
    csv.push(`Generated on: ${new Date().toLocaleString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
    })}`);
    csv.push('');

    // Filters applied
    csv.push('Filters Applied:');
    csv.push(`Year: ${year === 'all' ? 'All Years' : year ? `Year ${year}` : 'All Years'}`);
    csv.push(`Class: ${department === 'all' ? 'All Classes' : department || 'All Classes'}`);
    csv.push('');

    // Statistics
    csv.push('Statistics:');
    csv.push(`Total Submissions: ${filteredSubmissions.length}`);
    csv.push(`Surveys Completed: ${new Set(filteredSubmissions.map(s => s.surveyId)).size}`);
    csv.push('');

    // Column headers
    csv.push('S.No,Roll Number,Name,Class,Year');

    // Data rows
    sortedSubmissions.forEach((submission, index) => {
        const yearSuffix = submission.year === 1 ? 'st' :
            submission.year === 2 ? 'nd' :
            submission.year === 3 ? 'rd' : 'th';

        csv.push(`${index + 1},"${submission.rollNumber}","${submission.studentName}","${submission.department}","${submission.year}${yearSuffix} Year"`);
    });

    // Create and download file
    const csvContent = csv.join('\n');
    const blob = new Blob([csvContent], {
        type: 'text/csv;charset=utf-8;'
    });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `Submitted_Students_${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showAlert('✅ CSV exported successfully!', 'success');
}

// Delete feedback submitted by a student
async function deleteFeedback(feedbackId, studentName) {
    if (!confirm(`⚠️ Are you sure you want to delete the feedback submitted by ${studentName}?\n\nThis action cannot be undone!`)) {
        return;
    }

    try {
        // Use Storage.deleteFeedback when available (Firestore)
        if (typeof Storage.deleteFeedback === 'function') {
            const ok = await Storage.deleteFeedback(feedbackId);
            if (!ok) {
                showAlert('❌ Feedback not found or delete failed!', 'error');
                return;
            }
            showAlert(`✅ Feedback from ${studentName} has been deleted successfully!`, 'success');
            setTimeout(() => location.reload(), 1200);
            return;
        }

        // Fallback for localStorage-based Storage implementations
        const feedbacks = await Storage.getFeedbacks();
        const updatedFeedbacks = feedbacks.filter(f => f.id !== feedbackId);
        if (feedbacks.length === updatedFeedbacks.length) {
            showAlert('❌ Feedback not found!', 'error');
            return;
        }
        localStorage.setItem('feedbacks', JSON.stringify(updatedFeedbacks));
        showAlert(`✅ Feedback from ${studentName} has been deleted successfully!`, 'success');
        setTimeout(() => location.reload(), 1200);

    } catch (error) {
        console.error('Error deleting feedback:', error);
        showAlert('❌ Error deleting feedback: ' + error.message, 'error');
    }
}

// Make functions globally available
window.applyFilters = applyFilters;
window.resetFilters = resetFilters;
window.resetSearch = resetSearch;
window.sortTable = sortTable;
window.exportToCSV = exportToCSV;
window.deleteFeedback = deleteFeedback;
window.searchStudents = searchStudents;

// Initialize on page load
document.addEventListener('DOMContentLoaded', initializePage);