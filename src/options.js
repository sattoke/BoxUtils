"use strict";

async function saveOptions() {
  const clientId = document.getElementById("clientId").value;
  const clientSecret = document.getElementById("clientSecret").value;
  const name1 = document.getElementById("name1").value;
  const output1 = document.getElementById("output1").value;
  const search1 = document.getElementById("search1").value;
  const replace1 = document.getElementById("replace1").value;
  const name2 = document.getElementById("name2").value;
  const output2 = document.getElementById("output2").value;
  const search2 = document.getElementById("search2").value;
  const replace2 = document.getElementById("replace2").value;
  const name3 = document.getElementById("name3").value;
  const output3 = document.getElementById("output3").value;
  const search3 = document.getElementById("search3").value;
  const replace3 = document.getElementById("replace3").value;
  const name4 = document.getElementById("name4").value;
  const output4 = document.getElementById("output4").value;
  const search4 = document.getElementById("search4").value;
  const replace4 = document.getElementById("replace4").value;
  const name5 = document.getElementById("name5").value;
  const output5 = document.getElementById("output5").value;
  const search5 = document.getElementById("search5").value;
  const replace5 = document.getElementById("replace5").value;

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
      clientId: clientId,
      clientSecret: clientSecret,
      name1: name1,
      output1: output1,
      search1: search1,
      replace1: replace1,
      name2: name2,
      output2: output2,
      search2: search2,
      replace2: replace2,
      name3: name3,
      output3: output3,
      search3: search3,
      replace3: replace3,
      name4: name4,
      output4: output4,
      search4: search4,
      replace4: replace4,
      name5: name5,
      output5: output5,
      search5: search5,
      replace5: replace5,
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

async function restoreOptions() {
  const options = await chrome.storage.sync.get();
  document.getElementById("clientId").value = options.clientId;
  document.getElementById("clientSecret").value = options.clientSecret;
  document.getElementById("name1").value = options.name1;
  document.getElementById("output1").value = options.output1;
  document.getElementById("search1").value = options.search1;
  document.getElementById("replace1").value = options.replace1;
  document.getElementById("name2").value = options.name2;
  document.getElementById("output2").value = options.output2;
  document.getElementById("search2").value = options.search2;
  document.getElementById("replace2").value = options.replace2;
  document.getElementById("name3").value = options.name3;
  document.getElementById("output3").value = options.output3;
  document.getElementById("search3").value = options.search3;
  document.getElementById("replace3").value = options.replace3;
  document.getElementById("name4").value = options.name4;
  document.getElementById("output4").value = options.output4;
  document.getElementById("search4").value = options.search4;
  document.getElementById("replace4").value = options.replace4;
  document.getElementById("name5").value = options.name5;
  document.getElementById("output5").value = options.output5;
  document.getElementById("search5").value = options.search5;
  document.getElementById("replace5").value = options.replace5;

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

document.getElementById("addInputPair").addEventListener("click", addInputPair);
document.getElementById("export").addEventListener("click", exportOptions);
document.getElementById("import").addEventListener("click", importOptions);
