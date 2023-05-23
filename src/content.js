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
    let type;

    if (row.hasAttribute("data-resin-folder_id")) {
      type = "folder";
    } else if (row.hasAttribute("data-resin-file_id")) {
      type = "file";
    } else {
      // 多分存在しないはず
      continue;
    }

    if (
      row.querySelectorAll("span[data-testid='item-last-updated']")[0]
        .textContent[0] !== "☆"
    ) {
      const idInType = row.getAttribute(`data-resin-${type}_id`);
      const taburl = `${location.origin}/${type}/${idInType}`;
      const info = await getInfo(taburl);
      const modifiedTime = new Date(info["content_modified_at"]);

      const modifiedTimeElem = row.querySelectorAll(
        "span[data-testid='item-last-updated']"
      )[0];

      modifiedTimeElem.textContent =
        "☆" +
        formatDate(modifiedTime) +
        "、更新者: " +
        info["modified_by"]["name"];

      const time1HourAgo = new Date();
      time1HourAgo.setHours(time1HourAgo.getHours() - 1);

      const time24HoursAgo = new Date();
      time24HoursAgo.setHours(time24HoursAgo.getHours() - 24);

      if (modifiedTime > time1HourAgo) {
        modifiedTimeElem.style.color = "red";
      } else if (modifiedTime > time24HoursAgo) {
        modifiedTimeElem.style.color = "orange";
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
