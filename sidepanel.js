function parseJwt(token) {
  if (!token) return null;
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const extractBtn = document.getElementById("extractBtn");
  const resultDiv = document.getElementById("result");
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const allowedDomains = ["linkedin.com", "indeed.com", "glassdoor.com", "ziprecruiter.com"];
  const domainMatch = allowedDomains.some(domain => tab.url.includes(domain));

  // Get JWT cookie and extract email
  chrome.cookies.get({ url: "https://track2hired-server.onrender.com", name: "track2hired" }, function(cookie) {
    let email = null;
    if (cookie && cookie.value) {
      const payload = parseJwt(cookie.value);
      if (payload && payload.email) {
        email = payload.email;
      }
    }

    if (!email) {
      // Not logged in: disable button and show login prompt
      if (extractBtn) {
        extractBtn.disabled = true;
        extractBtn.style.opacity = "0.5";
        extractBtn.style.cursor = "not-allowed";
        extractBtn.title = "Please log in to the Track2Hired website to save jobs.";
      }
      resultDiv.innerHTML = `
        <div style="color:red;font-weight:bold;">Please log in to the Track2Hired website to save jobs.</div>
        <div style="margin-top:10px;">
          <a href="https://track2hired.web.app/login" 
             target="_blank" 
             style="color:blue;text-decoration:underline;">
            Click here to log in
          </a>
        </div>`;
      return;
    }

    // Show manual form (for unsupported sites) or set up extraction for supported sites
    if (!domainMatch) {
      showManualForm(tab.url, email);
      if (extractBtn) extractBtn.style.display = "none";
    } else {
      if (extractBtn) {
        extractBtn.disabled = false;
        extractBtn.style.opacity = "1";
        extractBtn.style.cursor = "pointer";
        extractBtn.title = "";
        extractBtn.onclick = async () => {
          const jobData = await extractJobData(tab.id, email, tab.url);
          if (!jobData || !jobData.title) {
            // Extraction failed, show manual form
            showManualForm(tab.url, email, true);
            return;
          }
          try {
            await saveJob(jobData);
            alert('Job saved successfully!');
          } catch (error) {
            alert(error.message);
          }
        };
      }
    }
  });

  // Helper: Show manual entry form
  function showManualForm(url, email, extractionFailed = false) {
    const extractBtn = document.getElementById("extractBtn");
  if (extractBtn) extractBtn.style.display = "none";
    resultDiv.innerHTML = `
      <form id="manualForm" style="width:85vw; height:100vh; display:flex; flex-direction:column; box-sizing:border-box; padding:10px">
        <h2 style="margin-top:0;">Manual Job Entry</h2>
        ${extractionFailed ? '<div style="color:red; margin-bottom:10px;">Automatic extraction failed. Please enter the job details manually.</div>' : ''}
        <label><h3>Job Title:</h3></label>
        <input type="text" id="manualTitle" placeholder="Job Title" required style="width:100%; padding:8px; margin-bottom:10px;"/>
        <label><h3>Company Name:</h3></label>
        <input type="text" id="manualComp" placeholder="Company Name" required style="width:100%; padding:8px; margin-bottom:10px;"/>
        <label><h3>Job Description/About the Job:</h3></label>
        <textarea id="manualDesc" placeholder="Job Description" required style="width:100%; padding:8px; margin-bottom:10px; height:75vh; resize:none;"></textarea>
        <label>Job URL:</label>
        <input type="text" id="manualURL" value="${url}" placeholder="Job URL" required style="width:100%; padding:8px; margin-bottom:10px;"/>
        <button type="submit" style="padding:10px; background: #2196F3; color:#fff; border:none; border-radius:4px; cursor:pointer;">Save Job</button>
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
        email: email,
        company: manualComp,
        description: manualDesc,
        url: manualURL,
        dateExtracted: new Date().toISOString()
      };
      try {
        await saveJob(jobData);
        alert('Job saved successfully!');
        document.getElementById("manualForm").reset();
      } catch (error) {
        alert(error.message);
      }
    });
  }

  // Helper: Extract job data from supported sites
  async function extractJobData(tabId, email, url) {
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId },
        func: (email) => {
          let jobTitle = '';
          let jobDescription = '';
          let company = '';
          if (window.location.href.includes("linkedin.com")) {
            jobTitle = document.querySelector(".job-details-jobs-unified-top-card__job-title h1 a")?.textContent?.trim()
              || document.querySelector(".jobs-unified-top-card h1 a")?.textContent?.trim();
            const articleElement = document.querySelector("article");
            if (articleElement) {
              jobDescription = String(articleElement.innerText).trim().replace(/\s+/g, ' ');
            }
            company = document.querySelector(".job-details-jobs-unified-top-card__company-name a")?.textContent?.trim();
          }
          if (window.location.href.includes("indeed.com")) {
            jobTitle = document.querySelector('[data-testid="simpler-jobTitle"]')?.innerText.trim();
            company = document.querySelector('.jobsearch-JobInfoHeader-companyNameSimple')?.innerText.trim()
              || document.querySelector(".jobsearch-JobInfoHeader-companyNameLink")?.innerText.trim();
            jobDescription = document.querySelector('#jobDescriptionText')?.textContent.trim();
          }
          if (window.location.href.includes("ziprecruiter.com")) {
            jobTitle = document.querySelector('[data-testid="right-pane"] h1')?.innerText.trim();
            company = document.querySelector('[data-testid="right-pane"] a')?.innerText.trim();
            jobDescription = document.querySelector('[data-testid="right-pane"]')?.textContent;
          }
          if (window.location.href.includes('glassdoor.com')) {
            jobTitle = document.querySelector('.JobDetails_employerAndJobTitle__nSJrW h1')?.innerText.trim();
            company = document.querySelector('.JobDetails_employerAndJobTitle__nSJrW a')?.innerText.trim();
            jobDescription = document.querySelector('.JobDetails_jobDescription__x3khM')?.innerText.trim();
          }
          return {
            title: jobTitle,
            description: jobDescription,
            email: email,
            company: company,
            url: window.location.href,
            dateExtracted: new Date().toISOString()
          };
        },
        args: [email]
      });
      return results[0]?.result;
    } catch (error) {
      return null;
    }
  }

  // Helper: Save job to API
  async function saveJob(jobData) {
    const response = await fetch('https://track2hired-server.onrender.com/save/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(jobData)
    });
    if (!response.ok) {
      const errorData = await response.json();
      if (response.status === 409 || errorData?.error?.includes('duplicate')) {
        throw new Error('This job has already been saved!');
      }
      throw new Error(`API Error: ${errorData?.error || response.status}`);
    }
    return await response.json();
  }
});