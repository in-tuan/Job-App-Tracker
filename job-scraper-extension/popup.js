let userToken = null;

document.getElementById('loginBtn').addEventListener('click', async () => {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  
  const res = await fetch(`${CONFIG.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'apikey': CONFIG.SUPABASE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  
  const data = await res.json();
  if (data.access_token) {
    userToken = data.access_token;
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('mainSection').style.display = 'block';
    document.getElementById('status').innerText = "Logged in!";
  } else {
    document.getElementById('status').innerText = "Login failed.";
  }
});

document.getElementById('syncBtn').addEventListener('click', async () => {
  const statusEl = document.getElementById('status');
  statusEl.innerText = "Connecting...";

  // 1. Get the current active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab) {
    statusEl.innerText = "No active tab found.";
    return;
  }

  // 2. Send message to content.js
  chrome.tabs.sendMessage(tab.id, { action: "get_jobs" }, async (response) => {
    
    // Handle the "Receiving end does not exist" error
    if (chrome.runtime.lastError) {
      console.error("Popup Error:", chrome.runtime.lastError.message);
      statusEl.innerText = "Error: Refresh the Job Board page.";
      return;
    }

    if (response && response.data) {
      statusEl.innerText = `Found ${response.data.length} jobs. Syncing...`;
      
      try {
        const result = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/applications?on_conflict=job_id`, {
          method: 'POST',
          headers: {
            'apikey': CONFIG.SUPABASE_KEY,
            'Authorization': `Bearer ${userToken}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates, return=minimal'
          },
          body: JSON.stringify(response.data)
        });

        if (result.ok) {
          statusEl.innerText = "Sync Success!";
        } else {
          const errBody = await result.text();
          statusEl.innerText = "DB Error. Check console.";
          console.error("Supabase Error:", errBody);
        }
      } catch (err) {
        statusEl.innerText = "Network Error.";
        console.error(err);
      }
    }
  });
});