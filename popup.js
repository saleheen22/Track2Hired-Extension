document.addEventListener('DOMContentLoaded', () => {
  document.getElementById("extractBtn").addEventListener("click", async () => {
    try {
      // Get current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Execute script to extract job info directly
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const jobTitle = document.querySelector(".job-details-jobs-unified-top-card__job-title h1 a")?.textContent?.trim()
            || document.querySelector(".jobs-unified-top-card h1 a")?.textContent?.trim();
          
          return {
            title: jobTitle,
            url: window.location.href,
            dateExtracted: new Date().toISOString()
          };
        }
      });
      
      const jobData = results[0]?.result;
      
      if (!jobData || !jobData.title) {
        throw new Error('Could not extract job data');
      }
      
      // Send directly to API
      const response = await fetch('https://track2-hired-server-h1i2juvei-muntasaleheengmailcoms-projects.vercel.app/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(jobData),
      });
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
      
      const data = await response.json();
      
      
      alert('Job saved successfully!');
      
    } catch (error) {
      console.error('Error:', error);
      alert(error.message);
    }
  });
});