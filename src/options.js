"use strict";

const STORAGE_VERSION = 2;

/**
 * オプション設定の画面の値をchrome.storageに保存する。
 */
async function saveOptions() {
  const clientId = document.getElementById("clientId").value;
  const clientSecret = document.getElementById("clientSecret").value;

  const copySettings = [];
  // template要素内のものは対象としないように注意
  const copySettingElements = document.querySelectorAll(
    "#copy-settings-container > .copy-setting"
  );
  for (const copySettingElement of copySettingElements) {
    copySettings.push({
      name: copySettingElement.querySelector(".copy-setting-input-name").value,
      output: copySettingElement.querySelector(".copy-setting-input-output")
        .value,
      search: copySettingElement.querySelector(".copy-setting-input-search")
        .value,
      replace: copySettingElement.querySelector(".copy-setting-input-replace")
        .value,
    });
  }

  const detailedDateTime = document.getElementById("detailed-datetime").checked;

  const searchInputs = document.getElementsByClassName(
    "path-conversion-search"
  );
  const replaceInputs = document.getElementsByClassName(
    "path-conversion-replace"
  );
  const pathConversionRules = [];

  for (let i = 0; i < searchInputs.length; i++) {
    const searchInput = searchInputs[i].value;
    const replaceInput = replaceInputs[i].value;

    if (searchInput && replaceInput) {
      pathConversionRules.push({
        search: searchInput,
        replace: replaceInput,
      });
    }
  }

  await chrome.storage.sync.set(
    {
      initialized: true,
      storageVersion: STORAGE_VERSION,
      clientId: clientId,
      clientSecret: clientSecret,
      copySettings: copySettings,
      detailedDateTime: detailedDateTime,
      pathConversionRules: pathConversionRules,
    },
    () => {
      const status = document.getElementById("status");
      status.textContent = "Options saved.";
      setTimeout(() => {
        status.textContent = "";
      }, 750);
    }
  );
}

/**
 * chrome.storageの保存値を元にオプション設定を画面に表示する。
 */
async function restoreOptions() {
  const options = await chrome.storage.sync.get();

  document.getElementById("clientId").value = options.clientId;
  document.getElementById("clientSecret").value = options.clientSecret;

  const copySettings = options.copySettings;
  const copySettingTemplate = document.getElementById("copy-setting-template");
  const copySettingsContainer = document.getElementById(
    "copy-settings-container"
  );

  if (copySettings && copySettings.length > 0) {
    for (let i = 0; i < copySettings.length; i++) {
      const setting = copySettingTemplate.content.cloneNode(true);

      setting.querySelector(
        ".copy-setting-title"
      ).textContent = `Copy Setting ${i + 1}`;
      setting.querySelector(".copy-setting-input-name").value =
        copySettings[i]["name"];
      setting.querySelector(".copy-setting-input-output").value =
        copySettings[i]["output"];
      setting.querySelector(".copy-setting-input-search").value =
        copySettings[i]["search"];
      setting.querySelector(".copy-setting-input-replace").value =
        copySettings[i]["replace"];
      setting.querySelector(".copy-setting-remove").onclick = (event) => {
        console.log(setting);
        copySettingsContainer.removeChild(event.target.parentNode.parentNode);
      };
      copySettingsContainer.appendChild(setting);
    }
  }

  document.getElementById("detailed-datetime").checked =
    options.detailedDateTime;

  const container = document.getElementById("search-replace-container");
  const addButton = document.getElementById("addInputPair");
  const pathConversionRules = options.pathConversionRules;

  //if (pathConversionRules && pathConversionRules.length > 0) {
  if (!pathConversionRules || pathConversionRules.length == 0) {
    const searchInput = document.createElement("input");
    searchInput.type = "text";
    searchInput.className = "path-conversion-search";
    searchInput.placeholder = "search string";

    const replaceInput = document.createElement("input");
    replaceInput.type = "text";
    replaceInput.className = "path-conversion-replace";
    replaceInput.placeholder = "replace string";

    const div = document.createElement("div");

    const removeButton = document.createElement("button");
    removeButton.innerHTML = "remove";
    removeButton.className = "path-conversion-remove";
    removeButton.onclick = () => {
      container.removeChild(div);
    };

    div.appendChild(searchInput);
    div.appendChild(replaceInput);
    div.appendChild(removeButton);

    addButton.before(div);
  } else {
    for (let i = 0; i < pathConversionRules.length; i++) {
      const searchInput = document.createElement("input");
      searchInput.type = "text";
      searchInput.className = "path-conversion-search";
      searchInput.value = pathConversionRules[i].search;

      const replaceInput = document.createElement("input");
      replaceInput.type = "text";
      replaceInput.className = "path-conversion-replace";
      replaceInput.value = pathConversionRules[i].replace;

      const div = document.createElement("div");

      const removeButton = document.createElement("button");
      removeButton.innerHTML = "remove";
      removeButton.className = "path-conversion-remove";
      removeButton.onclick = () => {
        container.removeChild(div);
      };

      div.appendChild(searchInput);
      div.appendChild(replaceInput);
      div.appendChild(removeButton);

      addButton.before(div);
    }
  }
}

/**
 * Copy Setting用の入力欄を追加する。
 */
function addCopySetting() {
  const copySettingTemplate = document.getElementById("copy-setting-template");
  const copySettingsContainer = document.getElementById(
    "copy-settings-container"
  );
  const copySettingElements = document.querySelectorAll(
    "#copy-settings-container > .copy-setting"
  );
  const copySettingCount = copySettingElements.length;

  const setting = copySettingTemplate.content.cloneNode(true);
  const copySettingContainer = setting.querySelector(".copy-setting");

  setting.querySelector(".copy-setting-title").textContent = `Copy Setting ${
    copySettingCount + 1
  }`;
  setting.querySelector(".copy-setting-remove").onclick = () => {
    copySettingsContainer.removeChild(copySettingContainer);

    // 途中の設定欄を削除したときのために全設定の通番を振りなおす。
    // template要素内のものは対象としないように注意。
    const copySettingElementsNew = document.querySelectorAll(
      "#copy-settings-container > .copy-setting"
    );
    const copySettingCountNew = copySettingElementsNew.length;
    for (let i = 0; i < copySettingCountNew; i++) {
      copySettingElementsNew[i].querySelector(
        ".copy-setting-title"
      ).textContent = `Copy Setting ${i + 1}`;
    }
  };
  copySettingsContainer.appendChild(copySettingContainer);
}

/**
 * Path Conversion用の入力欄を追加する。
 */
function addInputPair() {
  const container = document.getElementById("search-replace-container");
  const addButton = document.getElementById("addInputPair");
  const div = document.createElement("div");

  const searchInput = document.createElement("input");
  searchInput.type = "text";
  searchInput.className = "path-conversion-search";
  searchInput.placeholder = "search string";

  const replaceInput = document.createElement("input");
  replaceInput.type = "text";
  replaceInput.className = "path-conversion-replace";
  replaceInput.placeholder = "replace string";

  const removeButton = document.createElement("button");
  removeButton.innerHTML = "remove";
  removeButton.className = "path-conversion-remove";
  removeButton.onclick = () => {
    container.removeChild(div);
  };

  div.appendChild(searchInput);
  div.appendChild(replaceInput);
  div.appendChild(removeButton);

  addButton.before(div);
  //container.appendChild(div);
}

/**
 * オプションの設定をエクスポートする。
 * 現在の`chrome.storage`の内容をJSONファイルとしてエクスポートする。
 * @returns {Promise<void>} エクスポートが完了するまでのPromiseオブジェクト。
 */
async function exportOptions() {
  const items = await new Promise((resolve) => {
    chrome.storage.sync.get(null, resolve);
  });

  const jsonData = JSON.stringify(items);
  const blob = new Blob([jsonData], { type: "application/json" });

  const url = URL.createObjectURL(blob);
  const downloadLink = document.createElement("a");
  downloadLink.href = url;
  downloadLink.download = "BoxUtilsStorageData.json";

  downloadLink.click();
}

/**
 * オプションの設定をインポートする。
 * JSONファイルを読み込み、その内容を`chrome.storage`にインポートする。
 * インポート後には画面を再読み込みする。
 * @returns {Promise<void>} インポートが完了し、画面を再読み込みするまでのPromiseオブジェクト。
 */
async function importOptions() {
  const fileInput = document.createElement("input");
  fileInput.type = "file";

  await new Promise((resolve) => {
    fileInput.addEventListener("change", resolve);
    fileInput.click();
  });

  const file = fileInput.files[0];
  const reader = new FileReader();

  await new Promise((resolve) => {
    reader.onload = resolve;
    reader.readAsText(file);
  });

  const jsonData = reader.result;
  const data = JSON.parse(jsonData);

  await new Promise((resolve) => {
    chrome.storage.sync.set(data, resolve);
  });

  location.reload();
}

async function clearToken(event) {
  const result = await chrome.storage.local.get([
    "access_token",
    "refresh_token",
  ]);

  if (event.target.id === "clearAccessToken") {
    await chrome.storage.local.remove("access_token");
  } else if (event.target.id === "clearRefreshToken") {
    await chrome.storage.local.remove("refresh_token");
  }
}

/**
 * タブクリック時のコンテンツ切り替えに関するイベントを設定する。
 */
function addTabEvent() {
  const tabs = document.getElementsByClassName("tab");
  for (const tab of tabs) {
    tab.addEventListener("click", tabSwitch, false);
  }

  function tabSwitch(event) {
    document.getElementsByClassName("active")[0].classList.remove("active");
    event.target.classList.add("active");
    document.getElementsByClassName("show")[0].classList.remove("show");
    const index = Array.from(tabs).indexOf(event.target);
    document.getElementsByClassName("panel")[index].classList.add("show");
  }
}

document.addEventListener("DOMContentLoaded", restoreOptions);
document.addEventListener("DOMContentLoaded", addTabEvent, false);
document.getElementById("save").addEventListener("click", saveOptions);
document
  .getElementById("clearAccessToken")
  .addEventListener("click", clearToken);
document
  .getElementById("clearRefreshToken")
  .addEventListener("click", clearToken);

document
  .getElementById("add-copy-setting")
  .addEventListener("click", addCopySetting);
document.getElementById("addInputPair").addEventListener("click", addInputPair);
document.getElementById("export").addEventListener("click", exportOptions);
document.getElementById("import").addEventListener("click", importOptions);
