
document.addEventListener('DOMContentLoaded', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  // Define the recognized job site domains
  const allowedDomains = ["linkedin.com", "indeed.com", "glassdoor.com", "ziprecruiter.com"];
  const domainMatch = allowedDomains.some(domain => tab.url.includes(domain));
  
  const resultDiv = document.getElementById("result");
  
  if (!domainMatch) {
    const extractBtn = document.getElementById("extractBtn");
    if (extractBtn) {
      extractBtn.style.display = "none";
    }
    // If the active URL is not one of the recognized sites,
    // inject a manual form for job details.
    resultDiv.innerHTML = `
    <form id="manualForm" style="width:85vw; height:100vh; display:flex; flex-direction:column; box-sizing:border-box; padding:10px;">
    <h2 style="margin-top:0;">Manual Job Entry</h2>
    <label><h3>Job Title:</h3></label>
    <input type="text" id="manualTitle" placeholder="Job Title" required style="width:100%; padding:8px; margin-bottom:10px;"/>
    <label><h3>Company Name:</h3></label>
    <input type="text" id="manualComp" placeholder="Company Name" required style="width:100%; padding:8px; margin-bottom:10px;"/>
    <label><h3>Job Description/About the Job:</h3></label>
    <textarea id="manualDesc" placeholder="Job Description" required style="width:100%; padding:8px; margin-bottom:10px; height:75vh; resize:none;"></textarea>
    <label>Job URL:</label>
    <input type="text" id="manualURL" value="${tab.url}" placeholder="Job URL" required style="width:100%; padding:8px; margin-bottom:10px;"/>
    <button type="submit" style="padding:10px; background:#0073b1; color:#fff; border:none; border-radius:4px; cursor:pointer;">Save Job</button>
  </form>
  `;
    
    document.getElementById("manualForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const manualTitle = document.getElementById("manualTitle").value;
      const manualDesc = document.getElementById("manualDesc").value;
      const manualURL = document.getElementById("manualURL").value;
      const manualComp = document.getElementById("manualComp").value;
      
      const jobData = {
        title: manualTitle,
        email: '1@gmail.com',
        company: manualComp,
        description: manualDesc,
        url: manualURL,
        dateExtracted: new Date().toISOString()
      };
      
      try {
        const response = await fetch('http://localhost:3000/save/jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(jobData)
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`API Error: ${errorData?.error || response.status}`);
        }
        
        alert('Job saved successfully!');
        document.getElementById("manualForm").reset();
      } catch (error) {
        console.error('Error:', error);
        alert(error.message);
      }
    });
  } else {
    // For recognized job sites, run your extraction formula
    
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
            let company = '';
            if (window.location.href.includes("linkedin.com")) {
              jobTitle = document.querySelector(".job-details-jobs-unified-top-card__job-title h1 a")?.textContent?.trim()
              || document.querySelector(".jobs-unified-top-card h1 a")?.textContent?.trim();
            //   jobDescription = document.querySelector("article").innerText.trim();
            // console.log("this is job descirption", jobDescription);
            const articleElement = document.querySelector("article");
            if (articleElement) {
              jobDescription = String(articleElement.innerText).trim()
                .replace(/\s+/g, ' ')  // normalize whitespace
                
            }
            company = document.querySelector(".job-details-jobs-unified-top-card__company-name a")?.textContent?.trim() ;
            }

            if(window.location.href.includes("indeed.com")){
              jobTitle = document.querySelector('[data-testid="simpler-jobTitle"]')?.innerText.trim();
              company = document.querySelector('.jobsearch-JobInfoHeader-companyNameSimple')?.innerText.trim() || document.querySelector(".jobsearch-JobInfoHeader-companyNameLink")?.innerText.trim();
              
              jobDescription  = document.querySelector('#jobDescriptionText').textContent.trim();
            }
            if(window.location.href.includes("ziprecruiter.com")){
              jobTitle = document.querySelector('[data-testid="right-pane"] h1')?.innerText.trim();
              company =document.querySelector('[data-testid="right-pane"] a')?.innerText.trim();
              jobDescription = document.querySelector('[data-testid="right-pane"]')?.textContent;
            
            
            }
  
            if(window.location.href.includes('glassdoor.com')){
              jobTitle = document.querySelector('.JobDetails_employerAndJobTitle__nSJrW h1').innerText.trim();
            }
            
            
            
            
            
            return {
              title: jobTitle,
            description: jobDescription,
            email: '1@gmail.com',
            company: company,
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
        const response = await fetch('http://localhost:3000/save/jobs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(jobData),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          
          // Check for duplicate job error
          if (response.status === 409 || errorData?.error?.includes('duplicate')) {
            throw new Error('This job has already been saved!');
          }
          
          // Handle other API errors
          throw new Error(`API Error: ${errorData?.error || response.status}`);
        }
        
        const data = await response.json();
        
        
        alert('Job saved successfully!');
        
      } catch (error) {
        console.error('Error:', error);
        alert(error.message);
      }
    });
  }
});