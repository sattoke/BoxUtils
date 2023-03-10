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

async function getInfoFromAccessToken(url) {
  const result = await chrome.storage.local.get(["access_token"]);
  const savedAccessToken = result["access_token"];

  try {
    return await getFileDirInfo(url, savedAccessToken);
  } catch (error) {
    console.log(error);
    console.log(
      "Since there was no valid access token, a refresh token is used to obtain an access token."
    );
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
    console.log(error);
    console.log(
      "Since a valid access token could not be obtained even with a refresh token, the authorization code flow is processed."
    );
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
    console.log(error);
    console.log(
      "The process is terminated because a valid access token could not be obtained."
    );
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
    console.log(res);
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
        // ????????????????????????????????????boxnote????????????????????????
        // ?????????????????????????????????????????????????????????????????????????????????????????????
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
    // boxnote???API?????????????????????????????????
    // ??????????????????????????????????????????????????????????????????url????????????????????????
    url = await getNotesParentFolderURL(tabid);
  } else {
    url = taburl;
  }

  const info = await getInfoFromAccessToken(url);

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

  // ?????????????????????(info.id === "0")????????????
  // ???????????????????????????????????????????????????????????? info.name ??????????????????????????????
  if (info.id !== "0") {
    path += separator + info.name;
  }

  // boxnote????????????API????????????????????????????????????
  // ?????????????????????????????????????????????????????????????????????????????????
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

  // ???????????????????????????????????????
  output = format
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\\\/g, "\\");

  // ?????????????????? ${xxx} ??????????????????????????? $${xxx} ??????????????????????????????
  output = await replaceAsync(
    output,
    /(?<!\$)\${(.*?)}/g,
    async (_match, p1) => {
      const ret = await resolveVariable(p1);
      return ret;
    }
  );

  // $$???$?????????
  output = output.replace(/\$\$/g, "$");

  // ??????????????????????????????
  if (search) {
    output = output.replace(new RegExp(search), replace);
  }

  return output;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  // addListener?????????????????????????????????????????????async?????????????????????
  // return???Promise????????????????????????
  // return true???????????????????????????????????????????????????????????????
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
    } else if (message["method"] === "getInfoFromAccessToken") {
      const info = await getInfoFromAccessToken(message["url"]);
      sendResponse({
        body: info,
      });
    }
  })();

  return true;
});
