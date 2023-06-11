"use strict";

chrome.runtime.onInstalled.addListener(async () => {
  const options = await chrome.storage.sync.get();

  if (options["initialized"]) {
    return;
  }

  options["initialized"] = true;
  options["clientId"] = "";
  options["clientSecret"] = "";
  options["name1"] = "Simple URL";
  options["output1"] = "${url_simple}";
  options["search1"] = "";
  options["replace1"] = "";
  options["name2"] = "Box Drive (win)";
  options["output2"] = "${boxdrive_win}";
  options["search2"] = "";
  options["replace2"] = "";
  options["name3"] = "Box Drive and Simple URL";
  options["output3"] = "[BoxDrive] ${boxdrive_win}\\n[BoxWebUI] ${url_simple}";
  options["search3"] = "";
  options["replace3"] = "";
  options["name4"] = "markdown";
  options["output4"] = "[${boxdrive_win}](${url_simple})";
  options["search4"] = "";
  options["replace4"] = "";
  options["name5"] = "";
  options["output5"] = "";
  options["search5"] = "";
  options["replace5"] = "";
  options["detailedDateTime"] = true;

  await chrome.storage.sync.set(options);

  chrome.tabs.create({
    url: "chrome-extension://" + chrome.runtime.id + "/README.html",
  });
});

async function getCurrentTabInfo() {
  const tabs = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true,
  });
  return [tabs[0].id, tabs[0].url];
}

function getURLTypeAndIdentifier(url) {
  const [_, type, id] = url.match(/https:\/\/.*\.?app.box.com\/(.+)\/(\d+)/);
  return [type, id];
}

function getApiEndpoint(taburl) {
  const [type, id] = getURLTypeAndIdentifier(taburl);

  if (type !== "file" && type !== "folder") {
    throw new Error("Invalid URL");
  }

  return `https://api.box.com/2.0/${type}s/${id}`;
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
      "Refresh the access token since the file information acquisition failed for some reason."
    );
    accessToken = await getAccessToken(true);
    info = await getFileDirInfo(url, accessToken);
  }

  return info;
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

  await navigator.locks.request("refreshAccessToken", async (lock) => {
    const options = await chrome.storage.sync.get(["clientId", "clientSecret"]);
    const clientId = options["clientId"];
    const clientSecret = options["clientSecret"];
    if (!clientId || !clientSecret) {
      throw new Error(
        "clientId or clientSecret is missing. Set the Client ID and Client Secret in the options of this extension."
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

      const res = await fetch("https://api.box.com/oauth2/token", {
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
  const redirectUrl = chrome.identity.getRedirectURL();
  const state = getRandomString();

  const responseUrl = await chrome.identity.launchWebAuthFlow({
    url: `https://account.box.com/api/oauth2/authorize?client_id=${clientId}&response_type=code&state=${state}`,
    interactive: true,
  });

  const returnedState = new URL(responseUrl).searchParams.get("state");

  if (returnedState !== state) {
    throw new Error(
      "Authorization request and response state values did not match."
    );
  }

  const code = new URL(responseUrl).searchParams.get("code");

  const params = new URLSearchParams();
  params.append("grant_type", "authorization_code");
  params.append("code", code);
  params.append("client_id", clientId);
  params.append("client_secret", clientSecret);

  const res = await fetch("https://api.box.com/oauth2/token", {
    method: "post",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });

  return await res.json();
}

async function getFileDirInfo(url, accessToken) {
  const res = await fetch(getApiEndpoint(url), {
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
            "$1folder"
          )
        );
      }
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
      }
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

  const [type, id] = getURLTypeAndIdentifier(taburl);

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
    }
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
      if (message["type"].slice(0, 4) !== "copy") {
        sendResponse({});
        return;
      }

      const index = message["type"].slice(4);
      const options = await chrome.storage.sync.get();
      const output = options["output" + index];
      const search = options["search" + index];
      const replace = options["replace" + index];
      const res = await constructOutput(output, search, replace);
      const [tabid, _taburl] = await getCurrentTabInfo();

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
          { method: message["method"], path: path }
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
          { method: message["method"].replace("FromText", ""), path: path }
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
    }
  })();

  return true;
});
