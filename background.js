const API_URL =
  "https://track2-hired-server-qvvtbnykj-muntasaleheengmailcoms-projects.vercel.app/jobs";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "saveJobTitle") {
        chrome.storage.local.set({ jobTitle: message.jobTitle }, () => {
            console.log("Job title saved in local storage:", message.jobTitle);
            sendResponse({ status: "success" }); // Ensure this is INSIDE the callback
        });
        return true; // Keep the message channel open for async response
    }
});