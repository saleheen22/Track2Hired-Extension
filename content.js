function extractJobTitle() {
    // Try multiple selectors to find the job title
    const jobTitle = document
        .querySelector(".job-details-jobs-unified-top-card__job-title h1 a")
        ?.textContent?.trim();
    console.log("Job Title:", jobTitle);

    if (jobTitle) {
        chrome.runtime.sendMessage({ action: "saveJobTitle", jobTitle }, (response) => {
            console.log("Response from background:", response);
        });
    } else {
        console.log("No job title found on this page");
    }
}

extractJobTitle();