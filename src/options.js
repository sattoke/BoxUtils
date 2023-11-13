"use strict";

const STORAGE_VERSION = 2;

/**
 * オプション設定の画面の値をchrome.storageに保存する。
 */
async function saveOptions() {
  // Box設定
  const clientId = document.getElementById("clientId").value;
  const clientSecret = document.getElementById("clientSecret").value;

  // パスコピー設定
  const copySettings = [];
  // template要素内のものは対象としないように注意
  const copySettingElements = document.querySelectorAll(
    "#copy-settings-container > .copy-setting",
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

  // 詳細日時表示設定
  const detailedDateTime = document.getElementById("detailed-datetime").checked;

  // パス変換設定
  const searchInputs = document.getElementsByClassName(
    "path-conversion-search",
  );
  const replaceInputs = document.getElementsByClassName(
    "path-conversion-replace",
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

  // バッジ設定
  const badgeSettingsContainer = document.getElementById(
    "badge-settings-container",
  );

  const badgeSettings = [];
  for (let i = 0; i < badgeSettingsContainer.rows.length; i++) {
    const row = badgeSettingsContainer.rows[i];
    const inputs = row.getElementsByTagName("input");
    const rowData = {};

    rowData.badgeSettingId = row.id;

    for (let j = 0; j < inputs.length; j++) {
      const key = inputs[j].classList[0]; // クラス名をキー名として使う
      rowData[key] = inputs[j].value;
    }
    badgeSettings.push(rowData);
  }

  // 変更されたバッジ設定に関連するキャッシュは削除する
  const modifiedBadgeIds = await findModifiedBadgeIds(badgeSettings);
  removeBadgeInfoCache(modifiedBadgeIds);

  await chrome.storage.sync.set(
    {
      initialized: true,
      storageVersion: STORAGE_VERSION,
      clientId: clientId,
      clientSecret: clientSecret,
      copySettings: copySettings,
      detailedDateTime: detailedDateTime,
      pathConversionRules: pathConversionRules,
      badgeSettings: badgeSettings,
    },
    () => {
      const status = document.getElementById("status");
      status.textContent = "Options saved.";
      setTimeout(() => {
        status.textContent = "";
      }, 750);
    },
  );
}

/**
 * 指定された新しいバッジ設定配列に対し、現在のバッジ設定から変更または削除された設定のバッジID配列を検索
 *
 * @param {Object[]} newSettings - 新しいバッジ設定を示すオブジェクト配列
 * @returns {string[]} 変更があったバッジ設定のIDの配列。
 */
async function findModifiedBadgeIds(newSettings) {
  const result = await chrome.storage.sync.get("badgeSettings");
  const previousSettings = result.badgeSettings ?? [];

  const modifiedIds = [];

  for (const prevSetting of previousSettings) {
    const newSetting = newSettings.find(
      (item) => item.badgeSettingId === prevSetting.badgeSettingId,
    );

    if (
      !newSetting ||
      JSON.stringify(sortObject(prevSetting)) !==
        JSON.stringify(sortObject(newSetting))
    ) {
      modifiedIds.push(prevSetting.badgeSettingId);
    }
  }

  return modifiedIds;
}

/**
 * オブジェクトのプロパティをソートして新しいオブジェクトを返却
 *
 * @param {Object} obj - ソート対象のオブジェクト
 * @returns {Object} ソートされた新しいオブジェクト
 */
function sortObject(obj) {
  return Object.fromEntries(Object.entries(obj).sort());
}

/**
 * 指定したbadgeSettingId配列を含むバッジ情報キャッシュを削除
 *
 * @param {string[]} badgeSettingIds - 削除対象の badgeSettingId の配列
 */
async function removeBadgeInfoCache(badgeSettingIds) {
  // 現在のキャッシュを取得
  const result = await chrome.storage.local.get("cache");
  const cache = result["cache"] ?? {};

  if (!cache.badgeInfo) {
    return;
  }

  // cache内の各エントリを調査し、指定したbadgeSettingIdを含むエントリを削除
  for (const url in cache.badgeInfo) {
    for (const version in cache.badgeInfo[url]) {
      const badgeCache = cache.badgeInfo[url][version];
      if (badgeSettingIds.includes(badgeCache.badgeSettingId)) {
        // 実際には1URL、1versionしか保存していないはずなのでURLエントリ毎削除
        delete cache.badgeInfo[url];
      }
    }
  }

  // キャッシュを更新
  await chrome.storage.local.set({
    cache: cache,
  });
}

/**
 * chrome.storageの保存値を元にオプション設定を画面に表示する。
 */
async function restoreOptions() {
  const options = await chrome.storage.sync.get();

  // Box設定
  document.getElementById("clientId").value = options.clientId;
  document.getElementById("clientSecret").value = options.clientSecret;

  // パスコピー設定
  const copySettings = options.copySettings;
  const copySettingTemplate = document.getElementById("copy-setting-template");
  const copySettingsContainer = document.getElementById(
    "copy-settings-container",
  );

  if (copySettings && copySettings.length > 0) {
    for (let i = 0; i < copySettings.length; i++) {
      const setting = copySettingTemplate.content.cloneNode(true);

      setting.querySelector(
        ".copy-setting-title",
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

  // 詳細日時表示設定
  document.getElementById("detailed-datetime").checked =
    options.detailedDateTime;

  // パス変換設定
  const container = document.getElementById("search-replace-container");
  const addButton = document.getElementById("addInputPair");
  const pathConversionRules = options.pathConversionRules;

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

  // バッジ設定
  const badgeSettings = options.badgeSettings;
  const badgeSettingTemplate = document.getElementById(
    "badge-setting-template",
  );
  const badgeSettingsContainer = document.getElementById(
    "badge-settings-container",
  );

  if (badgeSettings && badgeSettings.length > 0) {
    for (let i = 0; i < badgeSettings.length; i++) {
      const setting = badgeSettingTemplate.content.cloneNode(true);
      const badgeSettingContainer = setting.querySelector(
        ".badge-setting-container",
      );

      badgeSettingContainer.id = badgeSettings[i].badgeSettingId;

      const inputs = setting.querySelectorAll("input");
      for (let j = 0; j < inputs.length; j++) {
        const key = inputs[j].classList[0]; // クラス名をキー名として使う
        inputs[j].value = badgeSettings[i][key];
      }
      setting.querySelector(".badge-setting-remove").onclick = (event) => {
        console.log(setting);
        badgeSettingsContainer.removeChild(event.target.parentNode.parentNode);
      };
      badgeSettingsContainer.appendChild(setting);
    }
  }
}

/**
 * Copy Setting用の入力欄を追加する。
 */
function addCopySetting() {
  const copySettingTemplate = document.getElementById("copy-setting-template");
  const copySettingsContainer = document.getElementById(
    "copy-settings-container",
  );
  const copySettingElements = document.querySelectorAll(
    "#copy-settings-container > .copy-setting",
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
      "#copy-settings-container > .copy-setting",
    );
    const copySettingCountNew = copySettingElementsNew.length;
    for (let i = 0; i < copySettingCountNew; i++) {
      copySettingElementsNew[i].querySelector(
        ".copy-setting-title",
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
 * バッジ用の入力欄を追加する。
 */
function addBadgeSetting() {
  const badgeSettingTemplate = document.getElementById(
    "badge-setting-template",
  );
  const badgeSettingsContainer = document.getElementById(
    "badge-settings-container",
  );
  const setting = badgeSettingTemplate.content.cloneNode(true);
  const badgeSettingContainer = setting.querySelector(
    ".badge-setting-container",
  );
  badgeSettingContainer.id = generateUUIDv4();

  setting.querySelector(".badge-setting-remove").onclick = () => {
    badgeSettingsContainer.removeChild(badgeSettingContainer);
  };
  badgeSettingsContainer.appendChild(badgeSettingContainer);
}

/**
 * UUID (version-4 variant-1) を生成
 * @returns {string} 生成されたUUID
 */
function generateUUIDv4() {
  const hexDigits = "0123456789abcdef";
  let uuid = "";

  // ハイフン4つ含めて36桁
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) {
      uuid += "-";
    } else if (i === 14) {
      // 14桁目はversion-4の場合、4固定
      uuid += "4";
    } else {
      const randomIndex = Math.floor(Math.random() * 16);
      // 19桁目の4bitはversion-4 variant-1の場合、下位2bitが乱数、上位2bitが 10 固定
      // https://en.wikipedia.org/wiki/Universally_unique_identifier#Version_4_(random)
      uuid += hexDigits[i === 19 ? (randomIndex & 0x3) | 0x8 : randomIndex];
    }
  }

  // "xxxxxxxx-xxxx-4xxx-Xxxx-xxxxxxxxxxxx" 形式の文字列を返す。
  // "X" は上位2bitが 0b10 となるため "8", "9", "a", "b" のいずれかになる。
  return uuid;
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
document
  .getElementById("add-badge-setting")
  .addEventListener("click", addBadgeSetting);
document.getElementById("export").addEventListener("click", exportOptions);
document.getElementById("import").addEventListener("click", importOptions);
