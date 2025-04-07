document.addEventListener('DOMContentLoaded', function() {
    // Load settings
    chrome.storage.sync.get({
        checkUrls: true,
        checkKeywords: true,
        checkSender: true,
        autoScan: false
    }, function(settings) {
        document.getElementById('checkUrls').checked = settings.checkUrls;
        document.getElementById('checkKeywords').checked = settings.checkKeywords;
        document.getElementById('checkSender').checked = settings.checkSender;
    });

    // Scan button
    document.getElementById('scanButton').addEventListener('click', function() {
        const status = document.getElementById('status');
    const button = this;
    
    // Đổi trạng thái nút
    button.disabled = true;
    status.textContent = "Đang quét...";
    status.className = "warning";
    
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {action: "manualScan"}, function(response) {
            button.disabled = false;
            
            if (!response) {
                status.textContent = "Lỗi: Không nhận được phản hồi";
                status.className = "danger";
                return;
            }
            
            if (response.success) {
                status.textContent = `Hoàn tất! Đã quét ${response.scanned} email`;
                status.className = "success";
            } else {
                status.textContent = `Lỗi: ${response.error || "Unknown error"}`;
                status.className = "danger";
            }
        });
    });
    //     chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    //         if (!tabs || tabs.length === 0) {
    //             status.textContent = "Error: No active tab found";
    //             status.className = "danger";
    //             return;
    //         }
            
    //         chrome.tabs.sendMessage(tabs[0].id, {action: "scanEmails"}, function(response) {
    //             if (chrome.runtime.lastError) {
    //                 status.textContent = "Error: " + chrome.runtime.lastError.message;
    //                 status.className = "danger";
    //             } else {
    //                 status.textContent = "Scan completed! Check emails";
    //                 status.className = "success";
    //             }
    //         });
    //     });
    // });
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {action: "manualScan"}, function(response) {
            if (chrome.runtime.lastError) {
                status.textContent = "Lỗi: " + chrome.runtime.lastError.message;
                status.className = "danger";
            } else {
                status.textContent = "Hoàn tất! Đang hiển thị kết quả...";
                status.className = "success";
            }
        });
    });
});

    // Auto-scan toggle
    document.getElementById('scanNewButton').addEventListener('click', function() {
        chrome.storage.sync.get(['autoScan'], function(settings) {
            const newAutoScan = !settings.autoScan;
            chrome.storage.sync.set({autoScan: newAutoScan}, function() {
                const button = document.getElementById('scanNewButton');
                button.textContent = newAutoScan ? "Disable Auto-scan" : "Scan New Emails Automatically";
                button.style.backgroundColor = newAutoScan ? "#f44336" : "#4CAF50";
            });
        });
    });

    // Save settings
    document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            chrome.storage.sync.set({
                checkUrls: document.getElementById('checkUrls').checked,
                checkKeywords: document.getElementById('checkKeywords').checked,
                checkSender: document.getElementById('checkSender').checked
            });
        });
    });
});