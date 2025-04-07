// Phishing detection logic
function getEmailData(emailElement) {
    if (!emailElement) return { subject: "", body: "", sender: "" };
    
    return {
        subject: emailElement.querySelector('[data-thread-id] span, [data-legacy-thread-id] span')?.textContent || "",
        body: emailElement.querySelector('.a3s, .ii.gt')?.textContent || "",
        sender: emailElement.querySelector('[email], .gD')?.textContent || ""
    };
}

class PhishingDetector {
    constructor() {
        this.phishingKeywords = [
            "urgent", "verify your account", "click here", "confirm your email",
            "account suspended", "password reset", "security alert", "immediate action",
            "verify your identity", "unauthorized login attempt", "account verification",
            "limited time offer", "free gift", "congratulations", "you've won",
            "bank account", "credit card", "social security", "login credentials"
        ];
        
        this.suspiciousDomains = [
            "paypal-security.com", "appleid-verify.net", "amazon-payments.info",
            "google-verify.org", "microsoft-support.com", "bankofamerica-secure.net"
        ];
        
        this.urlPattern = /http[s]?:\/\/(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+/g;
    }

    preprocessText(text) {
        if (!text) return "";
        const stopwords = ["a", "an", "the", "and", "to", "of", "in", "on", "for", "with", "about", "as", "by"];
        text = text.toLowerCase();
        text = text.replace(/[^\w\s]/g, '');
        let tokens = text.split(' ');
        tokens = tokens.filter(word => !stopwords.includes(word));
        return tokens.join(' ');
    }

    extractUrls(text) {
        if (!text) return [];
        return text.match(this.urlPattern) || [];
    }

    isSuspiciousUrl(url) {
        try {
            const domain = new URL(url).hostname;
            return this.suspiciousDomains.some(sd => domain.includes(sd));
        } catch {
            return false;
        }
    }

    isSuspiciousSender(email) {
        if (!email) return false;
        const domain = email.split('@')[1] || '';
        return this.suspiciousDomains.some(sd => domain.includes(sd));
    }

    analyzeEmail(emailElement) {
        const { subject, body, sender } = getEmailData(emailElement);
        
        return new Promise((resolve) => {
            chrome.storage.sync.get([
                'checkUrls', 'checkKeywords', 'checkSender'
            ], (settings) => {
                let isPhishing = false;
                let reasons = [];
                
                if (settings.checkUrls !== false) {
                    const urls = this.extractUrls(body);
                    const suspiciousUrls = urls.filter(url => this.isSuspiciousUrl(url));
                    
                    if (suspiciousUrls.length > 0) {
                        isPhishing = true;
                        reasons.push(`Suspicious URLs: ${suspiciousUrls.join(', ')}`);
                    }
                }
                
                if (settings.checkKeywords !== false) {
                    const processedText = this.preprocessText(subject + " " + body);
                    const foundKeywords = this.phishingKeywords.filter(keyword => 
                        processedText.includes(keyword.toLowerCase()));
                    
                    if (foundKeywords.length > 0) {
                        isPhishing = true;
                        reasons.push(`Phishing keywords: ${foundKeywords.join(', ')}`);
                    }
                }
                
                if (settings.checkSender !== false && this.isSuspiciousSender(sender)) {
                    isPhishing = true;
                    reasons.push(`Suspicious sender: ${sender}`);
                }
                
                resolve({
                    isPhishing,
                    reasons,
                    subject,
                    sender,
                    urlCount: this.extractUrls(body).length
                });
            });
        });
    }
}
// Hàm hiển thị thông báo
function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.position = 'fixed';
    notification.style.bottom = '20px';
    notification.style.right = '20px';
    notification.style.backgroundColor = '#4CAF50';
    notification.style.color = 'white';
    notification.style.padding = '12px 24px';
    notification.style.borderRadius = '4px';
    notification.style.zIndex = '99999';
    notification.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Tự động ẩn sau 5s
    setTimeout(() => {
        notification.style.transition = 'opacity 0.5s';
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 500);
    }, 5000);
}
// Main functionality
(function() {
    console.log("Phishing Detector content script loaded");
    const detector = new PhishingDetector();
    let observer = null;

    function markAsPhishing(emailElement, reasons, detectorInstance) {
        if (!emailElement) return;
        
        emailElement.classList.add('phishing-warning');
        
        // Add warning tag
        const subjectElement = emailElement.querySelector('[data-thread-id] span, [data-legacy-thread-id] span');
        if (subjectElement) {
            const existingTag = subjectElement.querySelector('.phishing-tag');
            if (!existingTag) {
                const tag = document.createElement("span");
                tag.className = "phishing-tag";
                tag.textContent = "PHISHING";
                tag.title = reasons.join("\n");
                subjectElement.appendChild(tag);
            }
        }
        
        // Highlight URLs
        const bodyElement = emailElement.querySelector('.a3s, .ii.gt');
        if (bodyElement) {
            const urls = bodyElement.querySelectorAll('a[href]');
            urls.forEach(anchor => {
                if (detectorInstance.isSuspiciousUrl(anchor.href)) {
                    anchor.classList.add('suspicious-url');
                }
            });
        }
    }

    async function scanEmails() {
        try {
            // Thêm delay để đảm bảo DOM sẵn sàng
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const emailElements = document.querySelectorAll('[role="listitem"]:not(.phishing-checked)');
            if (emailElements.length === 0) {
                showNotification("Không tìm thấy email mới để quét");
                return { scanned: 0, phishing: 0 };
            }
    
            console.log(`Bắt đầu quét ${emailElements.length} email...`);
            let phishingCount = 0;
    
            for (const emailElement of emailElements) {
                const result = await detector.analyzeEmail(emailElement);
                if (result.isPhishing) {
                    markAsPhishing(emailElement, result.reasons, detector);
                    phishingCount++;
                }
                emailElement.classList.add('phishing-checked');
            }
    
            console.log(`Quét hoàn tất. Phát hiện ${phishingCount} email đáng ngờ`);
            return { scanned: emailElements.length, phishing: phishingCount };
            
        } catch (error) {
            console.error("Lỗi chi tiết:", error);
            throw error; // Đẩy lỗi lên tầng gọi
        }
    }
    let retryCount = 0;
    const MAX_RETRIES = 10;
    function initObserver() {
        const targetNode = document.querySelector('[role="list"]');
    if (!targetNode) {
        if (retryCount++ < MAX_RETRIES) {
            console.log(`Retrying... (${retryCount}/${MAX_RETRIES})`);
            setTimeout(initObserver, 1000);
        } else {
            console.error("Failed to find email container after 10 attempts");
        }
        return;
    }

        observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.addedNodes.length) {
                    scanEmails();
                    break;
                }
            }
        });

        observer.observe(targetNode, {
            childList: true,
            subtree: true
        });
        console.log("MutationObserver initialized");
        scanEmails(); 
    }

    // Initialize
    document.addEventListener('DOMContentLoaded', () => {
        console.log("DOM fully loaded");
        scanEmails();
        initObserver();
    });

    // For Gmail's dynamic loading
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        scanEmails();
        initObserver();
    }

    // Message listener
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        // console.log("Message received:", request);
        
        // if (request.action === "ping") {
        //     sendResponse({status: "ready"});
        //     return true;
        // }
        
        // if (request.action === "scanEmails") {
        //     scanEmails().then(() => {
        //         sendResponse({status: "completed"});
        //     });
        //     return true;
        // }
        if (request.action === "manualScan") {
            console.log("Nhận yêu cầu quét thủ công");
            scanEmails()
                .then(result => {
                    showNotification(`Quét xong ${result.scanned} email. Phát hiện ${result.phishing} email lừa đảo`);
                    sendResponse({ success: true, ...result });
                })
                .catch(error => {
                    showNotification("Lỗi khi quét: " + error.message, 'error');
                    sendResponse({ success: false, error: error.message });
                });
            
            return true; // Giữ kết nối mở
        }
    });
})();