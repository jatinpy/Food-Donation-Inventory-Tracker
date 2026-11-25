const API_URL = '/api/donations';
let allDonations = [];
let currentFilter = 'ALL';

const SHELTERS = [
  { name: 'Sector-14 Soup Kitchen', location: 'Sector 14, Gurugram', maxKg: 200 },
  { name: 'Hope Community Shelter', location: 'Sohna Road, Gurugram', maxKg: 150 },
  { name: 'City Night Refuge', location: 'Civil Lines, Gurugram', maxKg: 150 }
];

const DRIVERS = [
  { name: 'Ramesh Kumar', vehicle: 'Insulated Van (HR-26-DQ-4102)', zone: 'Sector 14 & Old Gurugram' },
  { name: 'Ankit Sharma', vehicle: 'Cold-Box E-Cart (HR-26-EV-8821)', zone: 'Sohna Road & Badshahpur' },
  { name: 'Deepak Verma', vehicle: 'Refrigerated Mini-Truck (HR-26-TC-1904)', zone: 'Civil Lines & MG Road' }
];

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.innerText = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2800);
}

function switchView(viewName, btn) {
  document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
  document.getElementById(`view-${viewName}`).classList.add('active');
  btn.classList.add('active');
}

function setFilter(filter, btn) {
  currentFilter = filter;
  document.querySelectorAll('.filter-btn').forEach(el => el.classList.remove('active'));
  btn.classList.add('active');
  renderViews();
}

function openModal() {
  document.getElementById('donationModal').classList.add('open');
}

function closeModal() {
  document.getElementById('donationModal').classList.remove('open');
}

async function loadDonations() {
  try {
    const res = await fetch(API_URL);
    allDonations = await res.json();
    renderViews();
  } catch (err) {
    console.error('Error loading batches:', err);
  }
}

function renderViews() {
  const query = document.getElementById('searchInput').value.toLowerCase();
  const activeItems = allDonations.filter(d => d.status === 'Active');
  const dispatchedItems = allDonations.filter(d => d.status === 'Dispatched');

  // 1. Update KPI Cards
  const activeKg = activeItems.reduce((sum, d) => sum + d.quantityKg, 0);
  const dispatchedKg = dispatchedItems.reduce((sum, d) => sum + d.quantityKg, 0);
  const criticalCount = activeItems.filter(d => d.urgency === 'CRITICAL' || d.urgency === 'URGENT' || d.urgency === 'EXPIRED').length;
  const coldKg = activeItems.filter(d => d.storageType === 'Refrigerated').reduce((sum, d) => sum + d.quantityKg, 0);
  const coldPct = Math.min(100, Math.round((coldKg / 500) * 100));

  document.getElementById('kpiActiveKg').innerText = `${activeKg} kg`;
  document.getElementById('kpiActiveBatches').innerText = `${activeItems.length} active batches`;
  document.getElementById('kpiCriticalCount').innerText = criticalCount;
  document.getElementById('kpiDispatchedKg').innerText = `${dispatchedKg} kg`;
  document.getElementById('kpiDispatchedCount').innerText = `${dispatchedItems.length} deliveries completed`;
  document.getElementById('kpiColdLoad').innerText = `${coldPct}%`;
  document.getElementById('kpiColdText').innerText = `${coldKg} / 500 kg capacity used`;

  // 2. Render Page 1: Live FIFO Queue
  const filtered = activeItems.filter(item => {
    const matchesFilter = currentFilter === 'ALL' || item.urgency === currentFilter;
    const matchesSearch =
      item.mealName.toLowerCase().includes(query) ||
      item.donorName.toLowerCase().includes(query) ||
      item.targetShelter.toLowerCase().includes(query);
    return matchesFilter && matchesSearch;
  });

  const activeBody = document.getElementById('activeQueueBody');
  activeBody.innerHTML = filtered.length === 0
    ? `<tr><td colspan="8" style="text-align:center;color:#64748b;padding:24px;">No active batches match this filter. Click "+ Log Surplus Food" to add one.</td></tr>`
    : filtered.map((item, idx) => {
        const lifeLeftPct = Math.max(5, 100 - item.decayPercent);
        const barColor = item.urgency === 'CRITICAL' || item.urgency === 'EXPIRED' ? '#dc2626' : item.urgency === 'URGENT' ? '#d97706' : '#16a34a';
        return `
          <tr>
            <td><strong>#${idx + 1}</strong></td>
            <td>
              <strong>${item.mealName}</strong><br/>
              <small style="color:#64748b;">${item.storageType}</small>
            </td>
            <td>${item.donorName}</td>
            <td><strong>${item.targetShelter}</strong></td>
            <td><strong>${item.quantityKg} kg</strong></td>
            <td>
              <strong>${item.remainingHours} hrs left</strong>
              <div class="progress-bg"><div class="progress-fill" style="width:${lifeLeftPct}%;background:${barColor};"></div></div>
            </td>
            <td><span class="badge badge-${item.urgency}">${item.urgency}</span></td>
            <td>
              <div class="action-btns">
                <button class="btn-dispatch" onclick="dispatchBatch('${item._id}')">Dispatch</button>
                <button class="btn-delete" onclick="deleteBatch('${item._id}')">Delete</button>
              </div>
            </td>
          </tr>
        `;
      }).join('');

  // 3. Render Page 2: Shelter Cold-Shelf Capacity
  document.getElementById('shelterGrid').innerHTML = SHELTERS.map(s => {
    const assignedKg = activeItems
      .filter(d => d.targetShelter === s.name)
      .reduce((sum, d) => sum + d.quantityKg, 0);
    const pct = Math.min(100, Math.round((assignedKg / s.maxKg) * 100));
    return `
      <div class="shelter-card">
        <h3>${s.name}</h3>
        <small style="color:#64748b;">${s.location}</small>
        <div class="capacity-bar"><div class="capacity-fill" style="width:${pct}%;"></div></div>
        <div style="display:flex;justify-content:space-between;font-size:0.85rem;">
          <span>Current Load: <strong>${assignedKg} / ${s.maxKg} kg</strong></span>
          <span><strong>${pct}% Full</strong></span>
        </div>
      </div>
    `;
  }).join('');

  // 4. Render Page 3: Commercial Donor Directory
  const donorMap = {};
  allDonations.forEach(d => {
    if (!donorMap[d.donorName]) {
      donorMap[d.donorName] = { totalKg: 0, activeCount: 0 };
    }
    donorMap[d.donorName].totalKg += d.quantityKg;
    if (d.status === 'Active') donorMap[d.donorName].activeCount += 1;
  });

  const donorKeys = Object.keys(donorMap);
  document.getElementById('donorDirectoryBody').innerHTML = donorKeys.length === 0
    ? `<tr><td colspan="5" style="text-align:center;color:#64748b;padding:24px;">No donor records yet. Register a surplus batch to populate the directory.</td></tr>`
    : donorKeys.map(name => `
        <tr>
          <td><strong>${name}</strong></td>
          <td>Commercial Kitchen / Catering</td>
          <td>${donorMap[name].activeCount} Active</td>
          <td><strong>${donorMap[name].totalKg} kg</strong></td>
          <td><span class="badge badge-FRESH">FSSAI Verified</span></td>
        </tr>
      `).join('');

  // 5. Render Page 4: Volunteer Drivers & Pickup Routes
  document.getElementById('driverGrid').innerHTML = DRIVERS.map((drv, i) => {
    const assignedBatch = activeItems[i];
    return `
      <div class="shelter-card">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <h3>${drv.name}</h3>
          <span class="badge ${assignedBatch ? 'badge-URGENT' : 'badge-FRESH'}">${assignedBatch ? 'En Route' : 'Standby'}</span>
        </div>
        <small style="color:#64748b;">${drv.vehicle} &bull; ${drv.zone}</small>
        <div style="margin-top:14px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:0.86rem;">
          ${assignedBatch
            ? `<strong>Priority Pickup:</strong> ${assignedBatch.mealName} (${assignedBatch.quantityKg} kg)<br/>
               <span style="color:#64748b;">From ${assignedBatch.donorName} &rarr; ${assignedBatch.targetShelter}</span>`
            : `<span style="color:#64748b;">Awaiting next FIFO priority batch assignment.</span>`
          }
        </div>
      </div>
    `;
  }).join('');

  // 6. Render Page 5: UN SDG Impact Analytics
  const totalRescuedKg = activeKg + dispatchedKg;
  const mealsEquivalent = Math.round(totalRescuedKg * 2.5);
  const co2SavedKg = (totalRescuedKg * 2.5).toFixed(1);

  document.getElementById('sdgMetricsGrid').innerHTML = `
    <div class="shelter-card">
      <span class="badge badge-FRESH">UN SDG 2: Zero Hunger</span>
      <h3 style="margin-top:10px;font-size:1.6rem;">${mealsEquivalent} Meals</h3>
      <p style="font-size:0.85rem;color:#64748b;margin-top:4px;">Nutritious meal portions preserved for local community soup kitchens.</p>
    </div>
    <div class="shelter-card">
      <span class="badge badge-URGENT">UN SDG 12: Responsible Consumption</span>
      <h3 style="margin-top:10px;font-size:1.6rem;">${totalRescuedKg} kg Diverted</h3>
      <p style="font-size:0.85rem;color:#64748b;margin-top:4px;">Perishable surplus prevented from landfill spoilage via FIFO tracking.</p>
    </div>
    <div class="shelter-card">
      <span class="badge badge-DISPATCHED">Carbon Footprint Offset</span>
      <h3 style="margin-top:10px;font-size:1.6rem;">${co2SavedKg} kg CO₂e</h3>
      <p style="font-size:0.85rem;color:#64748b;margin-top:4px;">Estimated methane and greenhouse gas emissions avoided.</p>
    </div>
  `;

  // 7. Render Page 6: Dispatch History
  document.getElementById('historyBody').innerHTML = dispatchedItems.length === 0
    ? `<tr><td colspan="7" style="text-align:center;color:#64748b;padding:24px;">No dispatched batches yet.</td></tr>`
    : dispatchedItems.map(item => `
        <tr>
          <td><strong>${item.mealName}</strong></td>
          <td>${item.donorName}</td>
          <td>${item.targetShelter}</td>
          <td><strong>${item.quantityKg} kg</strong></td>
          <td>${item.storageType}</td>
          <td><span class="badge badge-DISPATCHED">DISPATCHED</span></td>
          <td><button class="btn-delete" onclick="deleteBatch('${item._id}')">Remove</button></td>
        </tr>
      `).join('');
}

document.getElementById('donationForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    mealName: document.getElementById('mealName').value,
    donorName: document.getElementById('donorName').value,
    quantityKg: Number(document.getElementById('quantityKg').value),
    shelfLifeHours: Number(document.getElementById('shelfLifeHours').value),
    storageType: document.getElementById('storageType').value,
    targetShelter: document.getElementById('targetShelter').value
  };

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (res.ok) {
    e.target.reset();
    closeModal();
    showToast('Surplus batch registered and prioritized!');
    loadDonations();
  }
});

async function dispatchBatch(id) {
  await fetch(`${API_URL}/${id}/dispatch`, { method: 'PATCH' });
  showToast('Batch dispatched to volunteer driver!');
  loadDonations();
}

async function deleteBatch(id) {
  await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
  showToast('Batch removed from records.');
  loadDonations();
}

loadDonations();
setInterval(loadDonations, 30000);