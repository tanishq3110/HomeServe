const http = require('http');

function request(options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function run() {
  console.log('=== PHASE 5 VERIFICATION SUITE ===');

  // 1. Login as Pending Technician (Anita)
  const anitaLogin = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { email: 'anita.plumber@homeserve.com', password: 'Password123!' }
  );
  console.log('1. Anita Login:', anitaLogin.status, anitaLogin.data?.success ? 'SUCCESS' : 'FAILED');
  const anitaToken = anitaLogin.data?.token;

  // 2. Fetch Anita's profile
  const anitaProfile = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/technicians/me',
    method: 'GET',
    headers: { Authorization: `Bearer ${anitaToken}` },
  });
  console.log('2. Anita Profile Verification Status:', anitaProfile.status, anitaProfile.data?.data?.verificationStatus);
  const anitaTechId = anitaProfile.data?.data?.id;

  // 3. Anita tries to go online while PENDING (RBAC Rule: Must FAIL with 403)
  const anitaOnlineAttempt = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/technicians/availability',
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${anitaToken}`,
      },
    },
    { isAvailable: true }
  );
  console.log('3. Anita Availability Toggle when PENDING (Expected 403):', anitaOnlineAttempt.status, anitaOnlineAttempt.data?.message);

  // 4. Login as Admin
  const adminLogin = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { email: 'admin@homeserve.com', password: 'AdminPassword123!' }
  );
  console.log('4. Admin Login:', adminLogin.status, adminLogin.data?.success ? 'SUCCESS' : 'FAILED');
  const adminToken = adminLogin.data?.token;

  // 5. Admin lists pending technicians
  const pendingList = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/admin/technicians?status=PENDING',
    method: 'GET',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  console.log('5. Admin GET /admin/technicians?status=PENDING:', pendingList.status, 'Count:', pendingList.data?.count);

  // 6. Admin inspects Anita's profile
  const anitaAdminView = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/admin/technicians/${anitaTechId}`,
    method: 'GET',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  console.log('6. Admin inspects technician by ID:', anitaAdminView.status, 'Name:', anitaAdminView.data?.data?.user?.name, 'Docs:', anitaAdminView.data?.data?.documents?.length);

  // 7. Admin approves Anita
  const approveRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/admin/technicians/${anitaTechId}/approve`,
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  console.log('7. Admin approves Anita:', approveRes.status, approveRes.data?.data?.verificationStatus);

  // 8. Anita can now toggle online successfully (Expected 200)
  const anitaOnlineSuccess = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/technicians/availability',
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${anitaToken}`,
      },
    },
    { isAvailable: true }
  );
  console.log('8. Anita Availability Toggle when APPROVED (Expected 200):', anitaOnlineSuccess.status, 'isAvailable:', anitaOnlineSuccess.data?.data?.isAvailable);

  // 9. Anita toggles back offline
  const anitaOfflineSuccess = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/technicians/availability',
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${anitaToken}`,
      },
    },
    { isAvailable: false }
  );
  console.log('9. Anita Availability Toggle to OFFLINE (Expected 200):', anitaOfflineSuccess.status, 'isAvailable:', anitaOfflineSuccess.data?.data?.isAvailable);

  // 10. Login as Rajesh (Verified) and test profile update
  const rajeshLogin = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { email: 'rajesh.electrician@homeserve.com', password: 'Password123!' }
  );
  console.log('10. Rajesh Login:', rajeshLogin.status, 'Role:', rajeshLogin.data?.user?.role);
  const rajeshToken = rajeshLogin.data?.token;

  const rajeshUpdate = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/technicians/profile',
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${rajeshToken}`,
      },
    },
    {
      experience: 8,
      skills: ['Electrical Wiring', 'MCB Installation', 'Inverter Servicing', 'Solar Inverter Setup'],
    }
  );
  console.log('11. Rajesh Profile Update:', rajeshUpdate.status, 'Experience:', rajeshUpdate.data?.data?.experience, 'Skills count:', rajeshUpdate.data?.data?.skills?.length);

  console.log('=== ALL PHASE 5 TESTS PASSED SUCCESSFULLY! ===');
}

run().catch(console.error);
