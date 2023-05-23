"use strict";

async function sendToBackground(event) {
  let method;
  let args;

  if (event.currentTarget.id === "open_folder") {
    method = "openFolder";
  } else if (event.currentTarget.id === "open_file") {
    method = "openFile";
  } else if (event.currentTarget.id === "open_folder_from_clipboard") {
    method = "openFolderFromText";
    args = [readClipboard()];
  } else if (event.currentTarget.id === "open_file_from_clipboard") {
    method = "openFileFromText";
    args = [readClipboard()];
  } else if (event.currentTarget.id.match(/^copy\d+$/)) {
    method = "sendCopyRequest";
  }

  chrome.runtime.sendMessage(
    {
      method: method,
      type: event.currentTarget.id,
      args: args,
    },
    () => {
      window.close();
    }
  );
}

/**
 * クリップボードの中のテキストを取得する
 * @returns {string} - クリップボードから取得したテキスト
 */
function readClipboard() {
  const copyTo = document.createElement("textarea");
  document.body.appendChild(copyTo);
  copyTo.focus();
  document.execCommand("paste");

  const clipboardText = copyTo.value;
  document.body.removeChild(copyTo);

  return clipboardText;
}

async function setText() {
  const options = await chrome.storage.sync.get();

  const messageElement = document.getElementById("message");
  if (!options.clientId || !options.clientSecret) {
    messageElement.innerHTML =
      "clientId or clientSecret is missing. Set the Client ID and Client Secret in the options of this extension.";

    const optionLink = document.createElement("a");
    optionLink.href = chrome.runtime.getURL("src/options.html");
    optionLink.textContent = "[Extention Options]";
    optionLink.target = "_blank";

    messageElement.appendChild(document.createElement("br"));
    messageElement.appendChild(optionLink);

    messageElement.style.display = "block";
  } else {
    messageElement.innerHTML = "";
    messageElement.style.display = "none";
  }

  document.getElementById("copy1").textContent = options.name1 ?? "";
  document.getElementById("copy2").textContent = options.name2 ?? "";
  document.getElementById("copy3").textContent = options.name3 ?? "";
  document.getElementById("copy4").textContent = options.name4 ?? "";
  document.getElementById("copy5").textContent = options.name5 ?? "";
}

document.addEventListener("DOMContentLoaded", setText);

document
  .getElementById("open_folder")
  .addEventListener("click", sendToBackground, true);
document
  .getElementById("open_file")
  .addEventListener("click", sendToBackground, true);
document
  .getElementById("open_folder_from_clipboard")
  .addEventListener("click", sendToBackground, true);
document
  .getElementById("open_file_from_clipboard")
  .addEventListener("click", sendToBackground, true);
document.getElementById("copy1").addEventListener("click", sendToBackground);
document.getElementById("copy2").addEventListener("click", sendToBackground);
document.getElementById("copy3").addEventListener("click", sendToBackground);
document.getElementById("copy4").addEventListener("click", sendToBackground);
document.getElementById("copy5").addEventListener("click", sendToBackground);
