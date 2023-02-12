"use strict";

function sendToBackground(event) {
  chrome.runtime.sendMessage(
    {
      type: event.target.id,
    },
    () => {
      window.close();
    }
  );
}

async function setButtonName() {
  const options = await chrome.storage.sync.get();
  document.getElementById("copy1").textContent = options.name1 ?? "";
  document.getElementById("copy2").textContent = options.name2 ?? "";
  document.getElementById("copy3").textContent = options.name3 ?? "";
  document.getElementById("copy4").textContent = options.name4 ?? "";
  document.getElementById("copy5").textContent = options.name5 ?? "";
}

document.addEventListener("DOMContentLoaded", setButtonName);

document.getElementById("copy1").addEventListener("click", sendToBackground);
document.getElementById("copy2").addEventListener("click", sendToBackground);
document.getElementById("copy3").addEventListener("click", sendToBackground);
document.getElementById("copy4").addEventListener("click", sendToBackground);
document.getElementById("copy5").addEventListener("click", sendToBackground);
