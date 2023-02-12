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

  await chrome.storage.sync.set(options);
});

async function getCurrentTabInfo() {
  const tabs = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true,
  });
  return [tabs[0].id, tabs[0].url];
}

function getApiEndpoint(taburl) {
  const [, type, id] = taburl.match(/https:\/\/.*\.?app.box.com\/(.+)\/(\d+)/);

  if (type !== "file" && type !== "folder") {
    throw new Error("Invalid URL");
  }

  return `https://api.box.com/2.0/${type}s/${id}`;
}

async function getInfoFromAccessToken(url) {
  const result = await chrome.storage.local.get(["access_token"]);
  const savedAccessToken = result["access_token"];

  try {
    return await getFileDirInfo(url, savedAccessToken);
  } catch (error) {
    console.log("Since there was no valid access token, a refresh token is used to obtain an access token.");
    return await getInfoFromRefreshToken(url);
  }
}

async function getInfoFromRefreshToken(url) {
  const options = await chrome.storage.sync.get(["clientId", "clientSecret"]);
  const clientId = options["clientId"];
  const clientSecret = options["clientSecret"];
  const result = await chrome.storage.local.get(["refresh_token"]);
  const savedRefreshToken = result["refresh_token"];

  const params = new URLSearchParams();
  params.append("grant_type", "refresh_token");
  params.append("refresh_token", savedRefreshToken);
  params.append("client_id", clientId);
  params.append("client_secret", clientSecret);

  const res = await fetch("https://api.box.com/oauth2/token", {
    method: "post",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });

  const json = await res.json();

  const accessToken = json["access_token"];
  const refreshToken = json["refresh_token"];
  await chrome.storage.local.set({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  try {
    return await getFileDirInfo(url, accessToken);
  } catch (error) {
    console.log("Since a valid access token could not be obtained even with a refresh token, the authorization code flow is processed.");
    return await getInfoFromAuthorization(url);
  }
}

function getRandomString() {
  const randArray = new Uint32Array(4);
  crypto.getRandomValues(randArray);

  return btoa(randArray.join(""))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function getInfoFromAuthorization(url) {
  const options = await chrome.storage.sync.get(["clientId", "clientSecret"]);
  const clientId = options["clientId"];
  const clientSecret = options["clientSecret"];
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

  const json = await res.json();
  const accessToken = json["access_token"];
  const refreshToken = json["refresh_token"];
  await chrome.storage.local.set({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  try {
    return await getFileDirInfo(url, accessToken);
  } catch (error) {
    console.log("The process is terminated because a valid access token could not be obtained.");
    throw error;
  }
}

async function getFileDirInfo(url, accessToken) {
  const res = await fetch(getApiEndpoint(url), {
    headers: {
      Authorization: "Bearer " + accessToken,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error("Fetch error");
  }

  return await res.json();
}

async function resolveVariable(name) {
  const [tabid, taburl] = await getCurrentTabInfo();

  if (name === "url") {
    return taburl;
  } else if (name == "url_simple") {
    const urlobj = new URL(taburl);
    return urlobj.origin + urlobj.pathname;
  }

  const info = await getInfoFromAccessToken(taburl);

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

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  // addListenerで登録するイベントリスナ自体をasyncにしてしまうと
  // returnがPromiseになってしまい、
  // return trueができず非同期処理を待たなくなることに注意
  (async () => {
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

    chrome.tabs.sendMessage(tabid, { message: res });

    sendResponse({});
  })();

  return true;
});
