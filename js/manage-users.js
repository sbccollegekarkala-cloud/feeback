// Manage Users - Admin page for user management

let allUsers = [];
let filteredUsers = [];
let currentUser = null;

// Wait for modules to load
function waitForModules() {
    return new Promise((resolve) => {
        const checkModules = () => {
            if (typeof window.Storage !== 'undefined' && typeof window.checkAuth !== 'undefined') {
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

    await loadData();
}

// Load all users
async function loadData() {
    try {
        console.log('Loading users data...');

        // Get all users
        const users = await Storage.getUsers();
        console.log('Users loaded:', users.length);

        allUsers = users.map(user => ({
            id: user.id,
            email: user.email || 'N/A',
            name: user.name || 'Unknown',
            rollNumber: user.rollNumber || 'N/A',
            role: user.role || 'user',
            className: user.className || 'N/A',
            registeredAt: user.registeredAt || new Date().toISOString(),
            password: user.password || ''
        }));

        console.log('Processed users:', allUsers.length);

        // Update statistics
        updateStats();

        // Populate filter dropdowns
        populateFilters();

        // Show empty state initially
        displayUsers(allUsers);

    } catch (error) {
        console.error('Error loading data:', error);
        showAlert('Error loading data: ' + error.message, 'error');
    }
}

// Update statistics
function updateStats() {
    const totalUsers = allUsers.length;
    const totalStudents = allUsers.filter(u => u.role === 'student').length;
    const totalAdmins = allUsers.filter(u => u.role === 'admin').length;

    document.getElementById('totalUsers').textContent = totalUsers;
    document.getElementById('totalStudents').textContent = totalStudents;
    document.getElementById('totalAdmins').textContent = totalAdmins;
}

// Populate filter dropdowns
function populateFilters() {
    // Populate classes from users
    const classes = [...new Set(allUsers
        .filter(u => u.role === 'student')
        .map(u => u.className)
        .filter(c => c && c !== 'N/A')
    )].sort();

    const classSelect = document.getElementById('filterClass');
    classSelect.innerHTML = '<option value="">-- All Classes --</option>';
    classes.forEach(className => {
        const option = document.createElement('option');
        option.value = className;
        option.textContent = className;
        classSelect.appendChild(option);
    });
}

// Apply filters
function applyFilters() {
    const role = document.getElementById('filterRole').value;
    const className = document.getElementById('filterClass').value;
    const searchTerm = document.getElementById('searchUser').value.toLowerCase();

    // Filter users
    filteredUsers = allUsers.filter(user => {
        // Role filter
        if (role && user.role !== role) {
            return false;
        }

        // Class filter (only for students)
        if (className && user.role === 'student' && user.className !== className) {
            return false;
        }

        // Search filter
        if (searchTerm) {
            const matchesEmail = user.email.toLowerCase().includes(searchTerm);
            const matchesName = user.name.toLowerCase().includes(searchTerm);
            if (!matchesEmail && !matchesName) {
                return false;
            }
        }

        return true;
    });

    console.log('Filtered users:', filteredUsers.length);

    if (filteredUsers.length === 0) {
        showEmptyState();
    } else {
        displayUsers(filteredUsers);
    }
}

// Reset filters
function resetFilters() {
    document.getElementById('filterRole').value = '';
    document.getElementById('filterClass').value = '';
    document.getElementById('searchUser').value = '';

    filteredUsers = [];
    displayUsers(allUsers);
}

// Show empty state
function showEmptyState() {
    const emptyState = document.getElementById('emptyState');
    emptyState.style.display = 'flex';
    document.getElementById('usersContainer').style.display = 'none';
}

// Display users in table
function displayUsers(users) {
    const container = document.getElementById('usersContainer');
    const tbody = document.getElementById('usersTableBody');
    const userCount = document.getElementById('userCount');

    if (!users || users.length === 0) {
        showEmptyState();
        return;
    }

    container.style.display = 'block';
    document.getElementById('emptyState').style.display = 'none';

    tbody.innerHTML = '';
    userCount.textContent = users.length;

    users.forEach((user, index) => {
        const row = document.createElement('tr');
        const registeredDate = new Date(user.registeredAt).toLocaleDateString();

        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${user.email}</td>
            <td>${user.name}</td>
            <td>${user.rollNumber}</td>
            <td>
                <span class="role-badge ${user.role}">
                    ${user.role}
                </span>
            </td>
            <td>${user.className}</td>
            <td>${registeredDate}</td>
            <td>
                <div class="action-buttons">
                    ${user.role !== 'admin' ? `<button class="delete-btn" onclick="deleteUser('${user.id}', '${user.name}')" title="Delete user">
                        🗑️ Delete
                    </button>` : '<span style="color: #999;">-</span>'}
                </div>
            </td>
        `;

        tbody.appendChild(row);
    });
}

// Delete user
async function deleteUser(userId, userName) {
    // Don't allow deletion of the current admin
    if (userId === currentUser.id) {
        showAlert('❌ You cannot delete your own account!', 'error');
        return;
    }

    if (!confirm(`⚠️ Are you sure you want to delete ${userName}?\n\nThis action cannot be undone!\n\nAll feedback submitted by this user will also be deleted.`)) {
        return;
    }

    try {
        // Use Storage.deleteUser which handles Firestore deletion (and feedback cleanup)
        const deleted = await Storage.deleteUser(userId);
        if (deleted) {
            showAlert(`✅ User ${userName} and their feedback have been deleted successfully!`, 'success');
            setTimeout(() => location.reload(), 1200);
        } else {
            showAlert('❌ Failed to delete user. See console for details.', 'error');
        }

    } catch (error) {
        console.error('Error deleting user:', error);
        showAlert('❌ Error deleting user: ' + error.message, 'error');
    }
}

// Export users to CSV
function exportToCSV() {
    const dataToExport = filteredUsers.length > 0 ? filteredUsers : allUsers;
    
    if (dataToExport.length === 0) {
        showAlert('No users to export!', 'error');
        return;
    }

    let csv = 'S.No,Email,Name,Roll Number,Role,Class,Registered At\n';

    dataToExport.forEach((user, index) => {
        const registeredDate = new Date(user.registeredAt).toLocaleDateString();
        const row = [
            index + 1,
            `"${user.email}"`,
            `"${user.name}"`,
            `"${user.rollNumber}"`,
            user.role,
            `"${user.className}"`,
            registeredDate
        ];
        csv += row.join(',') + '\n';
    });

    // Create and download file
    const csvContent = csv;
    const blob = new Blob([csvContent], {
        type: 'text/csv;charset=utf-8;'
    });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `Users_Export_${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showAlert('✅ CSV exported successfully!', 'success');
}

// Migrate old feedback records to include student roll numbers
async function migrateOldFeedbackRollNumbers() {
    if (!confirm('⚠️ This will update old feedback records and add missing student roll numbers. Continue?')) {
        return;
    }

    try {
        const result = await Storage.migrateFeedbackRollNumbers();

        if (result.error) {
            showAlert('❌ Migration failed: ' + result.error, 'error');
            return;
        }

        if (result.migrated > 0) {
            showAlert(`✅ Migrated ${result.migrated} feedback records.`, 'success');
        } else {
            showAlert('✅ No feedback records needed migration.', 'info');
        }
    } catch (error) {
        console.error('Error running migration:', error);
        showAlert('❌ Migration error: ' + error.message, 'error');
    }
}

// Make functions globally available
window.applyFilters = applyFilters;
window.resetFilters = resetFilters;
window.deleteUser = deleteUser;
window.exportToCSV = exportToCSV;
window.migrateOldFeedbackRollNumbers = migrateOldFeedbackRollNumbers;

// Initialize page when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePage);
} else {
    initializePage();
}
