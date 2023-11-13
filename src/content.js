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
      },
    );
  });
}

/**
 * 指定されたURLとバージョン番号に基づいてバッジ情報を取得
 *
 * @param {string} url - バッジ情報を取得する対象のURL。
 * @param {string} versionNo - バージョン番号。"V1" や "V2" という形式で表される。
 * @returns {Promise<Object>} - バッジ情報のPromise。バッジ情報が見つからない場合は空のオブジェクトを含むPromise。
 */
const getBadge = (() => {
  // 複数回呼び出し防止用のキャッシュ変数
  const pendingRequests = {};

  return async (url, versionNo) => {
    const cacheKey = `${url}-${versionNo}`;

    // すでに同じリクエストが処理中の場合は、Box APIを複数呼び出さないように完了するまで待つ
    if (pendingRequests[cacheKey]) {
      return pendingRequests[cacheKey];
    }

    const badgeInfo = await searchBadgeInfo(url, versionNo);

    if (Object.keys(badgeInfo).length > 0) {
      return Promise.resolve(badgeInfo);
    }

    const requestPromise = new Promise((resolve) => {
      chrome.runtime.sendMessage(
        {
          method: "getBadge",
          url: url,
          versionNo: versionNo,
        },
        (response) => {
          const badgeInfo = response["body"];
          cacheBadgeInfo(badgeInfo);
          resolve(badgeInfo);
          // リクエスト完了後にpendingRequestsから削除
          delete pendingRequests[cacheKey];
        },
      );
    });

    // pendingRequestsに追加して重複呼び出しを防ぐ
    pendingRequests[cacheKey] = requestPromise;

    return requestPromise;
  };
})();

/**
 * ファイルリストのアイコンにバッジを追加
 *
 * @param {HTMLElement} row - 対象のHTML要素。ファイルリスト中の特定の1行を示す。
 * @param {string} sign - 追加するテキスト。半角文字2文字以内を想定。
 * @param {string} foregroundColor - テキストの色。
 * @param {string} backgroundColor - テキストの背景色。
 */
function addBadgeToSVG(row, sign, foregroundColor, backgroundColor) {
  // file-list-iconクラスを持つ要素を検索
  const fileIcon = row.querySelector(".file-list-icon");

  if (fileIcon) {
    // file-list-iconの直下にあるsvg要素を検索
    const svgElement = fileIcon.querySelector("svg");

    if (svgElement && !svgElement.dataset.badgeAdded) {
      // 新しいrect要素を作成
      const rectElement = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "rect",
      );
      rectElement.setAttribute("x", "16");
      rectElement.setAttribute("y", "16");
      rectElement.setAttribute("width", "16");
      rectElement.setAttribute("height", "16");
      rectElement.setAttribute("fill", backgroundColor);
      rectElement.setAttribute("fill-opacity", "0.8");
      rectElement.setAttribute("rx", "4");
      rectElement.setAttribute("ry", "4");

      // 新しいtext要素を作成
      const textElement = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "text",
      );
      textElement.setAttribute("x", "24");
      textElement.setAttribute("y", "24");
      textElement.setAttribute("font-size", "12");
      textElement.setAttribute("fill", foregroundColor);
      textElement.setAttribute("fill-opacity", "0.8");
      textElement.setAttribute("text-anchor", "middle");
      textElement.setAttribute("alignment-baseline", "middle");
      textElement.textContent = sign;

      // rectとtextをsvgに追加
      svgElement.appendChild(rectElement);
      svgElement.appendChild(textElement);

      // フラグをセットして重複追加を防ぐ
      svgElement.dataset.badgeAdded = true;
    }
  } else {
    console.error("Error: .file-list-icon element not found");
  }
}

/**
 * 指定された要素からファイルバージョン番号を取得
 *
 * @param {Element} element - バージョン情報を検索する要素。
 * @throws {Error} リネームボタンおよびバージョン番号バッジが表示されていない場合にエラーをスローします。
 * @throws {Error} バージョン番号が想定しない形式の時にエラーをスローします。
 * @returns {number} バージョン番号。"V1" や "V2" という形式で表される。
 */
function getFileVersionNo(element) {
  // バージョン番号バッジは当該ファイルがV2以降の場合にしか表示されないため、
  // 表示されていないときはV1とみなす。
  // しかしバージョン番号バッジはページのロード直後は表示されていないため、
  // バージョン番号バッジの表示有無チェックのタイミングは要注意。
  // ここでは同じく遅延表示されかつバージョン番号バッジよりも右側に表示されるリネームボタンは、
  // バージョン番号バッジよりも後に表示されることを期待し(未検証)、
  // リネームボタンが表示されていてバージョン番号バッジが表示されていない場合はV1、
  // リネームボタンが表示されていない場合はまだバージョン番号不定としてエラーとし、
  // 呼び出し側ではそのイベントを無視することとする
  // (次のDOM変更イベントで再度バージョン番号確認をする)。

  // リネームボタンを検索
  const renameBtn = element.querySelector(".rename-btn");

  // リネームボタンが見つからない場合はエラーをスロー
  if (!renameBtn) {
    throw new Error(
      "The element does not contain a button with the class 'rename-btn'",
    );
  }

  // バージョン番号ボタンを検索
  const versionBadgeBtn = element.querySelector(".version-history-badge");

  // 最初のバージョンのときは "version-history-badge" が表示されないのでV1を返す
  if (!versionBadgeBtn) {
    return "V1";
  }

  // "version-history-badge" が存在する場合、その中の span 要素を検索
  const spanElement = versionBadgeBtn.querySelector("span");

  // span 要素が見つからないか、内容が "V" で始まらない場合はエラーをスロー
  if (!spanElement || !spanElement.textContent.startsWith("V")) {
    throw new Error("Invalid version history badge");
  }

  return spanElement.textContent;
}

/**
 * バッジ情報をローカルストレージにキャッシュ
 *
 * @param {Object} badgeInfo - キャッシュするバッジ情報。
 */
async function cacheBadgeInfo(badgeInfo) {
  const url = badgeInfo.url;
  const versionNo = badgeInfo.versionNo;

  // 現在のキャッシュを取得
  const result = await chrome.storage.local.get("cache");
  const cache = result["cache"] ?? {};

  if (!cache.badgeInfo) {
    cache.badgeInfo = {};
  }

  if (!cache.badgeInfo[url]) {
    cache.badgeInfo[url] = {};
  }

  cache.badgeInfo[url][versionNo] = badgeInfo;

  // 古いバージョン番号のデータが存在する場合は削除
  Object.keys(cache.badgeInfo[url]).forEach((existingVersion) => {
    if (existingVersion !== versionNo) {
      delete cache.badgeInfo[url][existingVersion];
    }
  });

  // キャッシュを更新
  await chrome.storage.local.set({
    cache: cache,
  });
}

/**
 * 指定されたURLとバージョン番号に基づいて、バッジ情報をキャッシュから検索
 *
 * @param {string} url - 検索対象のURL。
 * @param {string} versionNo - 検索対象のバージョン番号。"V1" や "V2" という形式で表される。
 * @returns {Object} - バッジ情報。見つからない場合は空のオブジェクト。
 */
async function searchBadgeInfo(url, versionNo) {
  // 現在のキャッシュを取得
  const result = await chrome.storage.local.get("cache");

  if (!result || !result["cache"] || !result["cache"]["badgeInfo"]) {
    return {};
  }

  const bi = result["cache"]["badgeInfo"];

  if (bi[url] && bi[url][versionNo]) {
    return bi[url][versionNo];
  } else {
    return {};
  }
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
  // フォルダビューの時のみ処理する
  if (!location.pathname.startsWith("/folder/")) {
    return;
  }

  // 列書換は時刻詳細表示機能かバッチ追加機能が有効なときのみ処理する
  const options = await chrome.storage.sync.get();
  const detailedDateTimeEnabled = options.detailedDateTime;
  const badgeEnabled = Object.keys(options.badgeSettings).length > 0;
  if (!detailedDateTimeEnabled && !badgeEnabled) {
    return;
  }

  const filesList = document.getElementsByClassName("files-list")[0];

  if (filesList === undefined) {
    // ファイルのリストは遅延して作成されるため
    // タイミングによっては存在しない場合がある。
    // その場合は単純に無視する
    console.info("Information: files-list was not found");
    return;
  }

  const rows = filesList.querySelectorAll(".table-row");
  for (const row of rows) {
    // バッジ追加処理
    if (badgeEnabled) {
      addBadge(row);
    }

    // 時刻詳細表示処理
    if (detailedDateTimeEnabled) {
      addDetailedDateTime(row);
    }
  }
}

/**
 * 指定された行から情報を取得します。
 *
 * @param {HTMLElement} row - 行を表す HTML 要素。
 * @returns {Object} 行に関する情報を含むオブジェクト。
 * @property {string} type - リソースの種類。"folder" または "file"。
 * @property {string} id - リソースタイプ毎のID。
 * @property {string} url - リソースのURL。
 * @property {string | undefined} versionNo - ファイルのバージョン番号。フォルダの場合は未定義。
 */
function getRowInfo(row) {
  let type;
  let versionNo;

  if (row.hasAttribute("data-resin-folder_id")) {
    type = "folder";
  } else if (row.hasAttribute("data-resin-file_id")) {
    type = "file";
    try {
      versionNo = getFileVersionNo(row);
    } catch (error) {
      if (error.message.includes("rename-btn")) {
        console.info(
          "Information: The element does not contain a 'rename' button. This is an expected error and is ignored.",
        );
      } else if (error.message.includes("Invalid version history badge")) {
        console.error("Error: Invalid version history badge. Ignored.");
      } else {
        console.error("Error:", error.message);
      }
      return {};
    }
  } else {
    // 多分存在しないはず
    return {};
  }

  const id = row.getAttribute(`data-resin-${type}_id`);
  const url = `${location.origin}/${type}/${id}`;

  return {
    type: type,
    id: id,
    url: url,
    versionNo: versionNo,
  };
}

/**
 * 指定された行にコンテンツに応じたバッジを追加
 *
 * @param {HTMLElement} row - バッジが追加される行を表す HTML 要素。
 * @throws {Error} バッジの追加中に問題が発生した場合にエラーをスローする。
 * @returns {void}
 */
async function addBadge(row) {
  const rowInfo = getRowInfo(row);

  // コンテンツに応じたバッジをつける対象はファイルだけ
  if (rowInfo.type !== "file") {
    return;
  }

  try {
    const badgeInfo = await getBadge(rowInfo.url, rowInfo.versionNo);
    if (badgeInfo.matched) {
      addBadgeToSVG(row, badgeInfo.sign, badgeInfo.fgColor, badgeInfo.bgColor);
    }
  } catch (error) {
    console.error("Error:", error.message);
  }
}

async function addDetailedDateTime(row) {
  const rowInfo = getRowInfo(row);

  if (
    row.querySelectorAll("span[data-testid='item-last-updated']")[0]
      .textContent[0] !== "☆"
  ) {
    const info = await getInfo(rowInfo.url);
    const modifiedTime = new Date(info["content_modified_at"]);

    const modifiedTimeElem = row.querySelectorAll(
      "span[data-testid='item-last-updated']",
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
