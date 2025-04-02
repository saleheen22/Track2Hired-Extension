document.addEventListener('DOMContentLoaded', () => {
    document.getElementById("extractBtn").addEventListener("click", async () => {
      try {
        // Get current tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        // Execute script to extract job info directly
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            let jobTitle = '';
            let jobDescription = '';
            if (window.location.href.includes("linkedin.com")) {
              jobTitle = document.querySelector(".job-details-jobs-unified-top-card__job-title h1 a")?.textContent?.trim()
              || document.querySelector(".jobs-unified-top-card h1 a")?.textContent?.trim();
              jobDescription = document.querySelector("article").innerText.trim();
            console.log("this is job descirption", jobDescription);
            }
            if(window.location.href.includes("indeed.com")){
              jobTitle = document.querySelector('[data-testid="simpler-jobTitle"]')?.innerText.trim();
            }
            if(window.location.href.includes("ziprecruiter.com")){
              jobTitle = document.querySelector('[data-testid="right-pane"] h1')?.innerText.trim();
            }

            if(window.location.href.includes('glassdoor.com')){
              jobTitle = document.querySelector('.JobDetails_employerAndJobTitle__nSJrW h1').innerText.trim();
            }
            
            
            
            
            
            return {
              title: jobTitle,
            description: jobDescription,
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
        const response = await fetch('https://track2-hired-server-ki6jux01w-muntasaleheengmailcoms-projects.vercel.app/jobs', {
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