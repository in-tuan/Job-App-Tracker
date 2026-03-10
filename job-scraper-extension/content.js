// content.js
function scrapeJobs() {
  const rows = document.querySelectorAll('#dataViewerPlaceholder table tbody tr');
  
  const jobs = Array.from(rows).map(row => {
    const appStatus = row.querySelector('td:nth-child(5) span span')?.innerText.trim();
    const jobStatus = row.querySelector("td:nth-child(6) span span")?.innerText.trim();
    
    let cleanStatus = "Pending";
    if ((jobStatus === "Interview Selections Complete" || jobStatus === "Interview Complete"
        || jobStatus === "Emp Rankings Finalized" || jobStatus === "Filled")
         && appStatus === "Applied") {
        cleanStatus = "Not Selected";
    } else if (appStatus === "Not Selected") {
        cleanStatus = "Not Selected";
    } else if (jobStatus === "Stalled" || jobStatus === "Cancel") {
        cleanStatus = "N/A";
    }

    return {
      job_id: row.querySelector("td:nth-child(2)")?.innerText.trim(),
      job_title: row.querySelector("th a")?.innerText.trim(),
      organization: row.querySelector("td:nth-child(4)")?.innerText.trim(),
      app_status: appStatus,
      job_status: jobStatus,
      location: row.querySelector("td:nth-child(8)")?.innerText.trim(),
      date_submitted: row.querySelector("td:nth-child(12)")?.innerText.trim(),
      clean_status: cleanStatus,
      source: 'internal'
    };
  });

  return jobs;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "get_jobs") {
    const data = scrapeJobs();
    sendResponse({ data: data });
  }
});