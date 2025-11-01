let currentUser = null;
let selectedManager = null;
let searchTimeout = null;

const FIELD_LABELS = {
  'title': 'Job Title',
  'phone': 'Phone Number',
  'real_name': 'Full Name',
  'display_name': 'Display Name',
  'Xf0DMHFDQA': 'GitHub',
  'Xf0DMGGW01': 'School',
  'XfQN2QL49W': 'Birthday',
  'Xf01S5PAG9HQ': 'Location',
  'Xf03USKB04JE': 'Title',
  'Xf01SBU8GWP6': 'Favorite Activities',
  'Xf06851X9ZEX': 'Dog, Cat, or Infrastructure',
  'Xf01S5PRFAQJ': 'Favorite Languages',
  'Xf03KV6S6WQH': 'Phone Number',
  'XfM1701Z9V': 'Favorite Channels',
  'Xf05GRERG8AE': 'Join Date',
  'Xf09727DH1J8': 'Managers'
};

async function loadProfile() {
  try {
    const response = await fetch('/api/me');
    const data = await response.json();
    currentUser = data;

    const profileSection = document.getElementById('userProfile');
    profileSection.innerHTML = `
      <div class="user-profile">
        <img src="${data.profile.image_192 || data.profile.image_72}" alt="${data.profile.real_name}">
        <div class="user-info">
          <h2>${data.profile.real_name}</h2>
          <p>${data.profile.title || 'No title set'}</p>
        </div>
      </div>
    `;

    loadProfileFields(data.profile);
  } catch (error) {
    console.error('Error loading profile:', error);
  }
}

function loadProfileFields(profile) {
  const fieldsContainer = document.getElementById('profileFields');
  const managerField = 'Xf09727DH1J8';
  
  const basicFields = [
    { id: 'title', value: profile.title || '' },
    { id: 'phone', value: profile.phone || '' },
    { id: 'display_name', value: profile.display_name || '' }
  ];

  const customFields = profile.fields ? Object.entries(profile.fields)
    .filter(([id]) => id !== managerField)
    .map(([id, data]) => ({ id, value: data.value || '', alt: data.alt || '' })) : [];

  const allFields = [...basicFields, ...customFields];

  fieldsContainer.innerHTML = allFields.map(field => `
    <div class="field-item">
      <label class="field-label">${FIELD_LABELS[field.id] || field.id}</label>
      <div class="field-input-group">
        <input type="text" id="field-${field.id}" value="${escapeHtml(field.value)}" placeholder="Enter ${FIELD_LABELS[field.id] || field.id}">
        <button onclick="updateField('${field.id}')">Update</button>
      </div>
    </div>
  `).join('');

  if (profile.fields && profile.fields[managerField]) {
    const managerIds = profile.fields[managerField].value.split(',').filter(id => id.trim());
    loadManagers(managerIds);
  }
}

async function loadManagers(managerIds) {
  const container = document.getElementById('currentManagers');
  
  if (!managerIds || managerIds.length === 0) {
    container.innerHTML = '<p style="color: #666; font-size: 14px;">No managers set</p>';
    return;
  }

  container.innerHTML = '<div class="loading">Loading managers...</div>';

  try {
    const managers = await Promise.all(
      managerIds.map(async (id) => {
        const response = await fetch(`/api/user/${id.trim()}`);
        if (response.ok) {
          return await response.json();
        }
        return null;
      })
    );

    container.innerHTML = managers
      .filter(m => m)
      .map(manager => `
        <div class="manager-chip">
          <img src="${manager.image}" alt="${manager.name}">
          <span>${manager.name}</span>
        </div>
      `).join('');
  } catch (error) {
    console.error('Error loading managers:', error);
    container.innerHTML = '<p style="color: #d32f2f;">Error loading managers</p>';
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function updateField(fieldId) {
  const input = document.getElementById(`field-${fieldId}`);
  const value = input.value;
  const button = input.nextElementSibling;

  button.disabled = true;
  button.textContent = 'Updating...';

  try {
    const response = await fetch('/api/update-profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        field: fieldId,
        value: value
      })
    });

    const data = await response.json();

    if (data.success) {
      button.textContent = '✓ Updated';
      setTimeout(() => {
        button.textContent = 'Update';
        button.disabled = false;
      }, 2000);
    } else {
      alert('Failed to update field: ' + data.error);
      button.textContent = 'Update';
      button.disabled = false;
    }
  } catch (error) {
    console.error('Error updating field:', error);
    alert('Failed to update field. Please try again.');
    button.textContent = 'Update';
    button.disabled = false;
  }
}

async function searchUser(userId) {
  const usersList = document.getElementById('usersList');
  
  if (!userId.trim()) {
    usersList.innerHTML = '<div class="info-message">Enter a Slack User ID to search for a manager</div>';
    return;
  }

  usersList.innerHTML = '<div class="loading">Searching...</div>';

  try {
    const response = await fetch(`/api/user/${userId.trim()}`);
    
    if (!response.ok) {
      usersList.innerHTML = '<div class="error-message">User not found. Please check the ID and try again.</div>';
      return;
    }

    const user = await response.json();
    
    usersList.innerHTML = `
      <div class="user-item" data-user-id="${user.id}">
        <img src="${user.image}" alt="${user.name}">
        <div class="user-item-info">
          <div class="user-item-name">${user.name}</div>
          <div class="user-item-title">${user.title || 'No title'}</div>
        </div>
      </div>
    `;

    document.querySelector('.user-item').addEventListener('click', () => {
      showConfirmModal(user);
    });
  } catch (error) {
    console.error('Error searching user:', error);
    usersList.innerHTML = '<div class="error-message">Error searching for user. Please try again.</div>';
  }
}

function showConfirmModal(manager) {
  selectedManager = manager;
  const modal = document.getElementById('confirmModal');
  
  document.getElementById('managerName').textContent = manager.name;
  document.getElementById('previewImage').src = manager.image;
  document.getElementById('previewName').textContent = manager.name;
  document.getElementById('previewTitle').textContent = manager.title || 'No title';
  
  document.getElementById('mockUserImage').src = currentUser.profile.image_192 || currentUser.profile.image_72;
  document.getElementById('mockUserName').textContent = currentUser.profile.real_name;
  document.getElementById('mockUserTitle').textContent = currentUser.profile.title || 'No title set';
  document.getElementById('mockManagerImage').src = manager.image;
  document.getElementById('mockManagerName').textContent = manager.name;
  
  modal.classList.add('active');
}

function hideConfirmModal() {
  const modal = document.getElementById('confirmModal');
  modal.classList.remove('active');
  selectedManager = null;
}

async function setManager() {
  if (!selectedManager) return;

  const confirmBtn = document.getElementById('confirmBtn');
  confirmBtn.disabled = true;
  confirmBtn.textContent = 'Adding...';

  try {
    const managerField = 'Xf09727DH1J8';
    const currentManagers = currentUser.profile.fields?.[managerField]?.value || '';
    const managerIds = currentManagers ? currentManagers.split(',').filter(id => id.trim()) : [];
    
    if (!managerIds.includes(selectedManager.id)) {
      managerIds.push(selectedManager.id);
    }

    const response = await fetch('/api/update-profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        field: managerField,
        value: managerIds.join(',')
      })
    });

    const data = await response.json();

    if (data.success) {
      const managerName = selectedManager.name;
      hideConfirmModal();
      showSuccessMessage(`Successfully added ${managerName} as your manager!`);
      
      await loadProfile();
    } else {
      alert('Failed to add manager: ' + data.error);
    }
  } catch (error) {
    console.error('Error adding manager:', error);
    alert('Failed to add manager. Please try again.');
  } finally {
    confirmBtn.disabled = false;
    confirmBtn.textContent = 'Confirm';
  }
}

function showSuccessMessage(message) {
  const managerSection = document.querySelector('.manager-section');
  const successDiv = document.createElement('div');
  successDiv.className = 'success-message';
  successDiv.textContent = message;
  managerSection.insertBefore(successDiv, managerSection.firstChild);

  setTimeout(() => {
    successDiv.remove();
  }, 5000);
}

document.getElementById('searchInput').addEventListener('input', (e) => {
  const userId = e.target.value;
  
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    searchUser(userId);
  }, 500);
});

document.getElementById('cancelBtn').addEventListener('click', hideConfirmModal);
document.getElementById('confirmBtn').addEventListener('click', setManager);

document.getElementById('confirmModal').addEventListener('click', (e) => {
  if (e.target.id === 'confirmModal') {
    hideConfirmModal();
  }
});

loadProfile();
