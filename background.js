// Background script for SECAF Helper extension
chrome.action.onClicked.addListener((tab) => {
  // Only execute on SECAF pages
  let hostname = '';
  try {
    hostname = new URL(tab.url).hostname;
  } catch (e) {
    // tab.url missing or invalid; falls through to the error page
  }
  if (hostname === 'ibge.gov.br' || hostname.endsWith('.ibge.gov.br')) {
    // Probe for the SECAF logo before injecting the full script,
    // so other IBGE pages never get alerts
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => !!document.querySelector('img[alt="Logotipo SECAF"]')
    }).then(([result]) => {
      if (result && result.result) {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['secaf_helper.js']
        });
      } else {
        chrome.tabs.create({ url: 'error.html' });
      }
    });
  } else {
    chrome.tabs.create({
      url: 'error.html'
    });
  }
});
