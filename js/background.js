chrome.runtime.onInstalled.addListener(function() {
  console.log("Extension installed");
  chrome.storage.sync.set({
      checkUrls: true,
      checkKeywords: true,
      checkSender: true,
      autoScan: false
  });
});

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "savePhishingEmail") {
      console.log("Phishing email detected:", request.emailData);
  }
});