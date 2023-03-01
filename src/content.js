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
  return document
    .querySelector(".infinite-list-item.selected")
    .querySelector(".note-list-item-parent-folder-container > a")["href"];
}

function getNotesFileNameInTab() {
  return document.querySelector(".documentTitle").textContent;
}

function getInfo(taburl) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      {
        method: "getInfo",
        url: taburl,
      },
      (response) => {
        resolve(response["body"]);
      }
    );
  });
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
      sendResponse({
        method: "getNotesParentFolderURLInTab",
        body: getNotesParentFolderURLInTab(),
      });
    }
  } else if (request.method === "getNotesFileNameInTab") {
    if (window != parent) {
      sendResponse({
        method: "getNotesFileNameInTab",
        body: getNotesFileNameInTab(),
      });
    }
  }
});

function formatDate(dateString) {
  const date = new Date(dateString);

  const year = date.getFullYear();
  const month = ("00" + (date.getMonth() + 1)).slice(-2);
  const day = ("00" + date.getDate()).slice(-2);

  const dayOfWeek = ["日", "月", "火", "水", "木", "金", "土"][date.getDay()];

  const hour = ("00" + date.getHours()).slice(-2);
  const minute = ("00" + date.getMinutes()).slice(-2);
  const second = ("00" + date.getSeconds()).slice(-2);

  return `${year}/${month}/${day} (${dayOfWeek}) ${hour}:${minute}:${second}`;
}

async function rewriteColumns() {
  if (!location.pathname.startsWith("/folder/")) {
    return;
  }

  const filesList = document.getElementsByClassName("files-list")[0];

  if (filesList === undefined) {
    // ファイルのリストは遅延して作成されるため
    // タイミングによっては存在しない場合がある。
    // その場合は単純に無視する
    console.log("files-list was not found");
    return;
  }

  const rows = filesList.querySelectorAll(".table-row");

  for (const row of rows) {
    if (row.hasAttribute("data-resin-folder_id")) {
      if (
        row.querySelectorAll("span[data-testid='item-last-updated']")[0]
          .textContent[0] !== "☆"
      ) {
        const folderId = row.getAttribute("data-resin-folder_id");
        const taburl = `${location.origin}/folder/${folderId}`;
        const folderInfo = await getInfo(taburl);
        row.querySelectorAll(
          "span[data-testid='item-last-updated']"
        )[0].textContent =
          "☆" +
          formatDate(folderInfo["content_modified_at"]) +
          "、更新者: " +
          folderInfo["modified_by"]["name"];
      }
    } else if (row.hasAttribute("data-resin-file_id")) {
      if (
        row.querySelectorAll("span[data-testid='item-last-updated']")[0]
          .textContent[0] !== "☆"
      ) {
        const fileId = row.getAttribute("data-resin-file_id");
        const taburl = `${location.origin}/file/${fileId}`;
        const fileInfo = await getInfo(taburl);
        row.querySelectorAll(
          "span[data-testid='item-last-updated']"
        )[0].textContent =
          "☆" +
          formatDate(fileInfo["content_modified_at"]) +
          "、更新者: " +
          fileInfo["modified_by"]["name"];
      }
    }
  }
}

function observe() {
  const observer = new MutationObserver((mutations, observer) => {
    rewriteColumns();
  });

  const config = {
    childList: true,
    subtree: true,
  };
  observer.observe(document.body, config);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", observe);
} else {
  observe();
}
