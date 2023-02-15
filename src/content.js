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

function getNotesParentFolderURLInTab() {
  return document.querySelector(".infinite-list-item.selected")
    .querySelector(".note-list-item-parent-folder-container > a")["href"];
}

function getNotesFileNameInTab() {
  return document.querySelector(".documentTitle").textContent;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.method === "copyToClipboard") {
    try {
      copyText(request.message);
    } catch (error) {
      console.log(error);
    }
    sendResponse({});
  } else if (request.method === "getNotesParentFolderURLInTab") {
    if (window != parent) {
      sendResponse({method: "getNotesParentFolderURLInTab", body: getNotesParentFolderURLInTab()});
    }
  } else if (request.method === "getNotesFileNameInTab") {
    if (window != parent) {
      sendResponse({method: "getNotesFileNameInTab", body: getNotesFileNameInTab()});
    }
  }
  sendResponse({});
});
