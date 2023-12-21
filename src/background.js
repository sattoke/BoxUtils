"use strict";

const STORAGE_VERSION = 2;

chrome.runtime.onInstalled.addListener(async () => {
  chrome.tabs.create({
    url: "chrome-extension://" + chrome.runtime.id + "/README.html",
  });
  const options = await chrome.storage.sync.get();

  console.log("initialized");
  console.log(options);

  const copySettings = [];

  if (options["initialized"]) {
    if (Object.hasOwn(options, "storageVersion")) {
      return;
    } else {
      // options["storageVersion"] が存在しない場合、
      // Copy Settingが5つ固定の古いバージョンのため
      // データ変換を行う

      for (let i = 1; i <= 5; i++) {
        if (options["output" + i]) {
          copySettings.push({
            name: options["name" + i],
            output: options["output" + i],
            search: options["search" + i],
            replace: options["replace" + i],
          });
        }
        delete options["name" + i];
        delete options["output" + i];
        delete options["search" + i];
        delete options["replace" + i];
      }

      options["copySettings"] = copySettings;
      options["storageVersion"] = STORAGE_VERSION;

      await chrome.storage.sync.clear();
      await chrome.storage.sync.set(options);

      console.log("converted");
      console.log(options);
    }
    return;
  }

  options["initialized"] = true;
  options["storageVersion"] = STORAGE_VERSION;
  options["clientId"] = "";
  options["clientSecret"] = "";

  const defaultCopySettings = [];
  defaultCopySettings.push({
    name: "Simple URL",
    output: "${url_simple}",
    search: "",
    replace: "",
  });
  defaultCopySettings.push({
    name: "Box Drive (win)",
    output: "${boxdrive_win}",
    search: "",
    replace: "",
  });
  defaultCopySettings.push({
    name: "Box Drive and Simple URL",
    output: "[BoxDrive] ${boxdrive_win}\\n[BoxWebUI] ${url_simple}",
    search: "",
    replace: "",
  });
  defaultCopySettings.push({
    name: "markdown",
    output: "[${boxdrive_win}](${url_simple})",
    search: "",
    replace: "",
  });
  options["copySettings"] = copySettings;

  options["detailedDateTime"] = true;

  await chrome.storage.sync.set(options);
});

async function getCurrentTabInfo() {
  const tabs = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true,
  });
  return [tabs[0].id, tabs[0].url];
}

function getURLTypeAndIdentifier(url) {
  const [, type, id] = url.match(/https:\/\/.*\.?app.box.com\/([^/]+)\/(\d+)/);
  return [type, id];
}

function getApiEndpoint(taburl) {
  const [type, id] = getURLTypeAndIdentifier(taburl);

  if (type !== "file" && type !== "folder") {
    throw new Error("Invalid URL");
  }

  return `https://api.box.com/2.0/${type}s/${id}`;
}

function getContentApiEndpoint(taburl) {
  const [type, id] = getURLTypeAndIdentifier(taburl);

  if (type !== "file") {
    throw new Error("Invalid URL");
  }

  return `https://api.box.com/2.0/${type}s/${id}/content`;
}

function getVersionsApiEndpoint(taburl) {
  const [type, id] = getURLTypeAndIdentifier(taburl);

  if (type !== "file") {
    throw new Error("Invalid URL");
  }

  return `https://api.box.com/2.0/${type}s/${id}/versions`;
}

async function getInfo(url) {
  let accessToken;
  let info;
  try {
    accessToken = await getAccessToken();
    info = await getFileDirInfo(url, accessToken);
  } catch (error) {
    console.log(error);
    console.log(
      "Refresh the access token since the file information acquisition failed for some reason.",
    );
    accessToken = await getAccessToken(true);
    info = await getFileDirInfo(url, accessToken);
  }

  return info;
}

/**
 * バッジ表示に必要な情報を取得
 *
 * @param {string} url - バッジ情報を取得する対象のURL。
 * @param {string} versionNo - バージョン番号。"V1" や "V2" という形式で表される。
 * @returns {Promise<Object>} バッジ情報を含むオブジェクトを解決するPromise。
 */
async function getBadge(url, versionNo) {
  let accessToken;
  let fileInfo;
  let dataBytes;
  let versions;
  let versionList;

  const options = await chrome.storage.sync.get();
  const badgeSettings = options.badgeSettings;
  if (badgeSettings && badgeSettings.length > 0) {
    for (let i = 0; i < badgeSettings.length; i++) {
      const start = badgeSettings[i].start;
      const length = badgeSettings[i].length;

      try {
        accessToken = await getAccessToken();
        fileInfo = await getFileDirInfo(url, accessToken);
        versions = await getVersions(accessToken, url);
        versionList = makeVersionList(fileInfo, versions);
        dataBytes = await getContent(
          accessToken,
          url,
          versionList[versionNo],
          start,
          length,
        );
      } catch (error) {
        console.log(error);
        console.log(
          "Refresh the access token since the file information acquisition failed for some reason.",
        );
        accessToken = await getAccessToken(true);
        fileInfo = await getFileDirInfo(url, accessToken);
        versions = await getVersions(accessToken, url);
        versionList = makeVersionList(fileInfo, versions);
        dataBytes = await getContent(
          accessToken,
          url,
          versionList[versionNo],
          start,
          length,
        );
      }

      const index = await searchBytesInData(dataBytes, badgeSettings[i].search);

      if (index >= 0) {
        return {
          url: url,
          versionNo: versionNo,
          matched: true,
          position: (start === "" ? 0 : Number(start)) + index,
          badgeSettingId: badgeSettings[i].badgeSettingId,
          search: badgeSettings[i].search,
          sign: badgeSettings[i].sign,
          fgColor: badgeSettings[i].fgColor,
          bgColor: badgeSettings[i].bgColor,
        };
      }
    }
  }
  return {
    url: url,
    versionNo: versionNo,
    matched: false,
  };
}

/**
 * バイト列から指定された文字列を検索し、最初に見つかった位置のインデックスを返却
 *
 * @param {Uint8Array} dataBytes - 検索対象のバイナリデータ。
 * @param {string} userSpecifiedString - 検索するバイト列を表す文字列。
 * @returns {number} バイト列が見つかった場合はその位置のインデックス、見つからなかった場合は-1。
 */
async function searchBytesInData(dataBytes, userSpecifiedString) {
  try {
    const userSpecifiedBytes = convertStringToBytes(userSpecifiedString);
    return indexOfBytes(dataBytes, userSpecifiedBytes);
  } catch (error) {
    console.error("Error:", error);
    return -1;
  }
}

/**
 * 文字列をバイト列に変換する関数
 *
 * @param {string} str - 変換する対象の文字列。
 * @returns {Uint8Array} 変換されたバイト列。/
 */
function convertStringToBytes(str) {
  const bytes = [];
  for (let i = 0; i < str.length; i++) {
    if (str[i] === "\\" && str[i + 1] === "x") {
      const hex = str.substr(i + 2, 2);
      bytes.push(parseInt(hex, 16));
      i += 3;
    } else if (str[i] === "\\" && str[i + 1] === "\\") {
      bytes.push(92);
      i += 1;
    } else {
      bytes.push(str.charCodeAt(i));
    }
  }
  return new Uint8Array(bytes);
}

/**
 * バイト列から指定されたバイト列を検索し、最初に見つかった位置のインデックスを返却
 *
 * @param {Uint8Array} source - 検索対象のソースバイト列。
 * @param {Uint8Array} target - 検索するバイト列。
 * @returns {number} バイト列が見つかった場合はその位置のインデックス、見つからなかった場合は-1。
 */
function indexOfBytes(source, target) {
  for (let i = 0; i < source.length - target.length + 1; i++) {
    if (source[i] === target[0]) {
      let match = true;
      for (let j = 1; j < target.length; j++) {
        if (source[i + j] !== target[j]) {
          match = false;
          break;
        }
      }
      if (match) {
        return i;
      }
    }
  }
  return -1;
}

/**
 * file APIとversions APIの結果を基に、バージョンリストを作成
 *
 * @param {Object} file - file APIの応答。
 * @param {Object} versions - versions APIの応答。
 * @returns {Object} バージョン番号をキーに、バージョンIDを値に持つオブジェクト。
 */
function makeVersionList(file, versions) {
  const result = {};

  if (versions.total_count > 0) {
    versions.entries.forEach((entry, index) => {
      const key = `V${versions.total_count - index}`;
      result[key] = entry.id;
    });
  }

  const lastKey = `V${versions.total_count + 1}`;
  result[lastKey] = file.file_version.id;

  return result;
}

/**
 * アクセストークンを取得する。
 * @param {bool} doRefresh トークンのリフレッシュを行うかどうか。
 *     一度当関数から返却されたアクセストークンを用いたAPI呼び出しが失敗した場合などに利用する。
 *     このケースは当プログラム外でアクセストークンが無効化された場合などに発生する可能性がある。
 *     [TODO] invalidateAccessToken()に処理を分離した方がいいか？
 *            そのあとアクセストークンを取得することを考えるとやはりこの関数でやった方がいい？
 * @return {string} アクセストークン
 */
async function getAccessToken(doRefresh = false) {
  // アクセストークンの有効期限は
  // https://ja.developer.box.com/guides/api-calls/permissions-and-errors/expiration/
  // によると60分(3600秒)。
  // なおトークンレスポンスの expires_in には基本的に4000秒以上のランダムな値となっていそうなので
  // 時刻のずれなどによる猶予期間の考慮はクライアント側では不要そう。
  const ACCESS_TOKEN_EXPIRATION_TIME = 60 * 60 * 1000; // アクセストークンの有効期間(ミリ秒)。

  if (!doRefresh) {
    const result = await chrome.storage.local.get([
      "access_token",
      "refreshDateTime",
    ]);
    const accessToken = result["access_token"];
    const refreshDateTime = result["refreshDateTime"] ?? 0;

    if (accessToken) {
      if (Date.now() - refreshDateTime < ACCESS_TOKEN_EXPIRATION_TIME) {
        return accessToken;
      }
    }
  }

  return refreshAccessToken();
}

/**
 * アクセストークンのリフレッシュを行う。
 * @return {string} アクセストークン
 */
async function refreshAccessToken() {
  // 有効期限の切れたアクセストークンを利用して
  // 複数のAPIアクセスが同時に行われた場合などは、
  // そのAPIアクセス一つ一つ毎にリフレッシュの要求が発生して、
  // リフレッシュトークンとアクセストークンが次々に無効化される可能性がある。
  // それを回避するためにリフレッシュは排他処理を行い、
  // 一度リフレッシュが成功したのちはしばらくリフレッシュを禁止することとする。
  // つまりリフレッシュの要求があったとしても
  // 実際には既に直前にリフレッシュが完了している状態のため、
  // 余計なリフレッシュを行わないように
  // リフレッシュ直後のアクセストークンを返却する。
  // リフレッシュ禁止期間は同時に発生した
  // 無効なアクセストークンを用いたAPIアクセス全てに対して
  // ロックの確認とストレージに保存したアクセストークンを
  // 返し終わるのに十分な期間以上あればよい。
  // またアクセストークンの寿命(Boxの場合60分)より長すぎる期間とすると
  // アクセストークンが無効になっているのに
  // リフレッシュができなくなってしまう。
  // またその他のなんらかの要因でアクセストークンが無効化された場合も考えると
  // なるべく短い期間の方が望ましい。
  // ここでは仮に10秒とする。
  const minRefreshInterval = 10000; // リフレッシュ処理後、次のリフレッシュ処理をするまでの最低待ち時間(ミリ秒)

  // リフレッシュトークンの有効期限は
  // https://ja.developer.box.com/guides/api-calls/permissions-and-errors/expiration/
  // によると60日。
  const REFRESH_TOKEN_EXPIRATION_TIME = 60 * 24 * 60 * 60 * 1000; // リフレッシュトークンの有効期間(ミリ秒)。

  let accessToken;
  let refreshToken;
  let tokenResponse;
  let refreshDateTime;

  await navigator.locks.request("refreshAccessToken", async () => {
    const options = await chrome.storage.sync.get(["clientId", "clientSecret"]);
    const clientId = options["clientId"];
    const clientSecret = options["clientSecret"];
    if (!clientId || !clientSecret) {
      throw new Error(
        "clientId or clientSecret is missing. Set the Client ID and Client Secret in the options of this extension.",
      );
    }
    const result = await chrome.storage.local.get([
      "access_token",
      "refresh_token",
      "refreshDateTime",
    ]);
    refreshToken = result["refresh_token"];
    accessToken = result["access_token"];
    refreshDateTime = result["refreshDateTime"] ?? 0;

    // 直前にリフレッシュされていれば有効なアクセストークンとなっているはずなため
    // ストレージに格納されているアクセストークンをそのまま返却する。
    if (Date.now() - refreshDateTime < minRefreshInterval) {
      return;
    }

    if (
      !refreshToken ||
      Date.now() - refreshDateTime > REFRESH_TOKEN_EXPIRATION_TIME
    ) {
      tokenResponse = await getTokensFromAuthorization(clientId, clientSecret);
    } else {
      const params = new URLSearchParams();
      params.append("grant_type", "refresh_token");
      params.append("refresh_token", refreshToken);
      params.append("client_id", clientId);
      params.append("client_secret", clientSecret);

      const endpoint = "https://api.box.com/oauth2/token";
      console.info("call: " + endpoint);
      const res = await fetch(endpoint, {
        method: "post",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params,
      });
      tokenResponse = await res.json();
    }

    accessToken = tokenResponse["access_token"];
    refreshToken = tokenResponse["refresh_token"];
    refreshDateTime = Date.now();

    await chrome.storage.local.set({
      access_token: accessToken,
      refresh_token: refreshToken,
      refreshDateTime: refreshDateTime,
    });

    return;
  });

  return accessToken;
}

function getRandomString() {
  const randArray = new Uint32Array(4);
  crypto.getRandomValues(randArray);

  return btoa(randArray.join(""))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function getTokensFromAuthorization(clientId, clientSecret) {
  const state = getRandomString();

  const responseUrl = await chrome.identity.launchWebAuthFlow({
    url: `https://account.box.com/api/oauth2/authorize?client_id=${clientId}&response_type=code&state=${state}`,
    interactive: true,
  });

  const returnedState = new URL(responseUrl).searchParams.get("state");

  if (returnedState !== state) {
    throw new Error(
      "Authorization request and response state values did not match.",
    );
  }

  const code = new URL(responseUrl).searchParams.get("code");

  const params = new URLSearchParams();
  params.append("grant_type", "authorization_code");
  params.append("code", code);
  params.append("client_id", clientId);
  params.append("client_secret", clientSecret);

  const endpoint = "https://api.box.com/oauth2/token";
  console.info("call: " + endpoint);
  const res = await fetch(endpoint, {
    method: "post",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });

  return await res.json();
}

async function getFileDirInfo(url, accessToken) {
  const endpoint = getApiEndpoint(url);
  console.info("call: " + endpoint);
  const res = await fetch(endpoint, {
    headers: {
      Authorization: "Bearer " + accessToken,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    console.log(res);
    console.log(...res.headers);
    throw new Error("Fetch error");
  }

  return await res.json();
}

/**
 * ファイルのコンテンツの一部分を取得
 *
 * @param {string} accessToken - アクセストークン
 * @param {string} url - 取得対象のファイルのURL
 * @param {string} versionId - ファイルのバージョンID
 * @param {string} start - ファイルの範囲指定の開始位置。空文字列の場合はファイルの先頭からと見なされる。
 * @param {string} length - ファイルの範囲指定の長さ。空文字列の場合はファイルの終了までと見なされる。
 * @returns {Promise<Uint8Array>} - ファイルの指定された範囲のデータを表すUint8Array
 * @throws {Error} - ファイルの取得に失敗した場合に投げられるエラー
 */
async function getContent(accessToken, url, versionId, start, length) {
  // startが空文字列の場合はファイルの先頭から範囲指定したと見ます。
  // lengthが空文字列の場合はファイルの終了まで範囲指定したとみなす。
  // またrangeヘッダの開始値は省略不可のため0を指定する
  // (ちなみにrangaの範囲指定が `-` から始まった場合はRFC7233では末尾からの長さ指定とみなされるが、
  // Boxの場合はドキュメントに記載はないが400エラーとなるようだ)。
  // 一方、終了値は省略することで末尾までの指定とみなされる。
  const startStr = start === "" ? "0" : start;
  const endStr =
    length === "" ? "" : String(Number(startStr) + Number(length) - 1);

  const endpoint = getContentApiEndpoint(url) + "?version=" + versionId;
  console.info("call: " + endpoint);
  const res = await fetch(endpoint, {
    headers: {
      Authorization: "Bearer " + accessToken,
      "Content-Type": "application/json",
      range: `bytes=${startStr}-${endStr}`,
    },
  });

  if (!res.ok) {
    console.log(res);
    console.log(...res.headers);
    throw new Error("Fetch error");
  }

  const dataBytes = new Uint8Array(await res.arrayBuffer());
  return dataBytes;
}

async function getVersions(accessToken, url) {
  const endpoint = getVersionsApiEndpoint(url);
  console.info("call: " + endpoint);
  const res = await fetch(endpoint, {
    headers: {
      Authorization: "Bearer " + accessToken,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    console.log(res);
    console.log(...res.headers);
    throw new Error("Fetch error");
  }

  return await res.json();
}

function getNotesParentFolderURL(tabid) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(
      tabid,
      { method: "getNotesParentFolderURLInTab" },
      (response) => {
        // スクレイピングで得られるboxnoteのフォルダー名は
        // トップフレームでフォルダーを開いた時と形式が異なるため変換する
        resolve(
          response["body"].replace(
            /(https:\/\/.*\.?app.box.com\/)files\/0\/f/,
            "$1folder",
          ),
        );
      },
    );
  });
}

function getNotesFileName(tabid) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(
      tabid,
      { method: "getNotesFileNameInTab" },
      (response) => {
        resolve(response["body"]);
      },
    );
  });
}

async function resolveVariable(name) {
  const [tabid, taburl] = await getCurrentTabInfo();

  if (name === "url") {
    return taburl;
  } else if (name == "url_simple") {
    const urlobj = new URL(taburl);
    return urlobj.origin + urlobj.pathname;
  }

  const [type] = getURLTypeAndIdentifier(taburl);

  let url;
  if (type === "notes") {
    // boxnoteはAPIが対応していないため、
    // まずはスクレイピングで取得した上位フォルダのurlの情報を取得する
    url = await getNotesParentFolderURL(tabid);
  } else {
    url = taburl;
  }

  const info = await getInfo(url);

  let separator;
  let prefix;

  if (name === "boxdrive_mac") {
    separator = "/";
    prefix = "~/Library/CloudStorage/Box-Box";
  } else if (name === "boxdrive_mac_old") {
    separator = "/";
    prefix = "~/Box";
  } else if (name === "boxdrive_win") {
    separator = "\\";
    prefix = "%USERPROFILE%\\Box";
  } else {
    return "";
  }

  let path = info.path_collection.entries.slice(1).reduce((acc, cur) => {
    acc += separator + cur.name;
    return acc;
  }, prefix);

  // ルートフォルダ(info.id === "0")のときは
  // 「すべてのファイル」というダミーの名前が info.name に入っているので無視
  if (info.id !== "0") {
    path += separator + info.name;
  }

  // boxnoteの場合はAPIで取得したフォルダ情報に
  // さらにスクレイピングで取得したファイル名と拡張子を結合
  if (type === "notes") {
    path += separator + (await getNotesFileName(tabid)) + ".boxnote";
  }

  return path;
}

async function replaceAsync(str, regex, asyncFn) {
  const promises = [];
  str.replace(regex, (match, ...args) => {
    const promise = asyncFn(match, ...args);
    promises.push(promise);
  });
  const data = await Promise.all(promises);
  return str.replace(regex, () => data.shift());
}

async function constructOutput(format, search, replace) {
  let output;

  // エスケープシーケンスの置換
  output = format
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\\\/g, "\\");

  // 組み込み変数 ${xxx} を置換する。ただし $${xxx} の場合は置換しない。
  output = await replaceAsync(
    output,
    /(?<!\$)\${(.*?)}/g,
    async (_match, p1) => {
      const ret = await resolveVariable(p1);
      return ret;
    },
  );

  // $$は$に置換
  output = output.replace(/\$\$/g, "$");

  // ユーザ指定の置換処理
  if (search) {
    output = output.replace(new RegExp(search), replace);
  }

  return output;
}

/**
 * chrome.storage.syncに格納されたルールに従ってパスを変換する。
 *
 * @param {string} path - 変換するパス
 * @returns {Promise<string>} - 変換後のパスを解決するPromise
 */
async function convertPath(path) {
  const options = await chrome.storage.sync.get();
  const pathConversionRules = options.pathConversionRules;
  if (pathConversionRules && pathConversionRules.length > 0) {
    for (let i = 0; i < pathConversionRules.length; i++) {
      const search = pathConversionRules[i].search;
      const replace = pathConversionRules[i].replace;

      if (search && replace) {
        const regex = new RegExp(search, "g");
        path = path.replace(regex, replace);
      }
    }
  }
  return path;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  // addListenerで登録するイベントリスナ自体をasyncにしてしまうと
  // returnがPromiseになってしまい、
  // return trueができず非同期処理を待たなくなることに注意
  (async () => {
    if (message["method"] === "sendCopyRequest") {
      const index = message["args"][0];
      const options = await chrome.storage.sync.get();
      const copySetting = options["copySettings"][index];
      const output = copySetting["output"];
      const search = copySetting["search"];
      const replace = copySetting["replace"];
      const res = await constructOutput(output, search, replace);
      const [tabid] = await getCurrentTabInfo();

      chrome.tabs.sendMessage(tabid, {
        method: "copyToClipboard",
        message: res,
      });

      sendResponse({});
    } else if (
      message["method"] === "openFolder" ||
      message["method"] === "openFile"
    ) {
      const path = await constructOutput("${boxdrive_win}");

      try {
        const response = await chrome.runtime.sendNativeMessage(
          "jp.toke.boxutils_helper",
          { method: message["method"], path: path },
        );
        console.log("Response", response);
      } catch (err) {
        console.log("Error", err);
      }

      sendResponse({});
    } else if (
      message["method"] === "openFolderFromText" ||
      message["method"] === "openFileFromText"
    ) {
      const clipboardText = message["args"][0];
      const path = await convertPath(clipboardText);
      console.log(path);

      try {
        const response = await chrome.runtime.sendNativeMessage(
          "jp.toke.boxutils_helper",
          { method: message["method"].replace("FromText", ""), path: path },
        );
        console.log("Response", response);
      } catch (err) {
        console.log("Error", err);
      }

      sendResponse({});
    } else if (message["method"] === "getInfo") {
      const info = await getInfo(message["url"]);
      sendResponse({
        body: info,
      });
    } else if (message["method"] === "getBadge") {
      const badgeInfo = await getBadge(message["url"], message["versionNo"]);
      sendResponse({ body: badgeInfo });
    } else if (message["method"] === "showDiff") {
      // showDiffは外部アプリにファイルを渡すために基本的にネイティブアプリ側で制御する
      try {
        const options = await chrome.storage.sync.get();
        const accessToken = await getAccessToken();
        const response = await chrome.runtime.sendNativeMessage(
          "jp.toke.boxutils_helper",
          {
            method: message["method"],
            accessToken: accessToken,
            commandOptions: options.diffSettings.diffCommandOptions,
            url1: message["args"][0]["url"],
            versionNo1: message["args"][0]["versionNo"],
            url2: message["args"][1]["url"],
            versionNo2: message["args"][1]["versionNo"],
          },
        );
        console.log("Response", response);
      } catch (err) {
        console.log("Error", err);
      }

      sendResponse({});
    } else if (message["method"] === "openOptionPage") {
      chrome.runtime.openOptionsPage();
      sendResponse({});
    }
  })();

  return true;
});
