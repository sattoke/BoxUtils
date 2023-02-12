"use strict";

function copyText(text) {
  // navigator.clipboard.writeText() はフォーカスが当たっていないと
  // DOMException: Document is not focused. が発生する。
  // そのため deprecated だが document.execCommand() を用いる。
  const copyFrom = document.createElement("textarea");
  copyFrom.textContent = text;

  const body = document.getElementsByTagName("body")[0];
  body.appendChild(copyFrom);

  copyFrom.select();
  document.execCommand("copy");
  body.removeChild(copyFrom);
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
    copyText(request.message);
  } catch (error) {
    console.log(error);
  }
  sendResponse({});
});
