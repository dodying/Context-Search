// Define root folder for searches
const FOLDER_NAME = "Searches"
const ILLEGAL_PROTOCOLS = ["chrome", "javascript", "data", "file", "about"]

// Get browser version for backwards compatibility
var browserVersion = navigator.userAgent.match('Firefox') ? navigator.userAgent.match(/ rv:(\d+)/)[1] * 1 : 57;

var searchLibs = []

// Error logging
function onCreated(n) {
  if (chrome.runtime.lastError) {
    console.log(`Error: ${chrome.runtime.lastError}`);
  }
}

function onError(error) {
  console.log(`Error: ${error}`);
}

// Get ID of FOLDER_NAME and the object and pass everything through listBookmarksInTree:
function main() {
  chrome.bookmarks.search({title: FOLDER_NAME}, (bookmarks) => {
    if (bookmarks.length > 0) {
      let subTreeID = bookmarks[0].id;

      chrome.bookmarks.getSubTree(subTreeID, (bookmarkItems) => {
        if (bookmarkItems[0].children.length > 0) {
          listBookmarksInTree(bookmarkItems[0], subTreeID);
        }

        // No root folder found: Show "Getting Started" help link
        else {
          createHelpLink();
        }
      });
    }

    // No root folder found: Show "Getting Started" help link
    else {
      createHelpLink();
    }
  });
}

// Parse through all bookmarks in tree and fire populateContextMenu for each:
function listBookmarksInTree(bookmarkItem, subTreeID) {
  if (bookmarkItem.url && bookmarkItem.url.match('%s')) {
    let keyword = bookmarkItem.title.match(/\(\&(.*?)\)/)
    keyword = keyword ? keyword[1] : ''
    let host = new URL(bookmarkItem.url).hostname.replace(/^www\./, '')
    if (!keyword) {
      keyword = host
    } else if (searchLibs.filter(i => i.keyword === keyword).length) {
      keyword = `${keyword}-${host}`
    }
    searchLibs.push({
      title: bookmarkItem.title,
      keyword: keyword,
      url: bookmarkItem.url
    })
  }

  populateContextMenu(bookmarkItem.id, bookmarkItem.title, bookmarkItem.url, bookmarkItem.parentId, bookmarkItem.type, subTreeID);

  if (bookmarkItem.children) {
    for (child of bookmarkItem.children) {
      listBookmarksInTree(child, subTreeID);
    }
  }
}

function reGenerateList() {
  let removingContextMenu = chrome.contextMenus.removeAll(main);
}

function checkValid(url) {
  let isValidProtocol = false, isValidWildcard = false, isValid = false;

  // Check that URL is not privileged according to
  // https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/tabs/create
  if (url.indexOf(":") > -1) {
      protocol = url.split(":")[0];
      isValidProtocol = !ILLEGAL_PROTOCOLS.includes(protocol);
  }

  // Check that URL is a keyword search (i.e. containing "%s")
  if (url.indexOf("%s") > -1) {
      isValidWildcard = true;
  }

  if (isValidProtocol && isValidWildcard) {
    isValid = true;
  }
  else {
    console.warn(`Non-conforming url: ${url}. Illegal protocol or missing \"%s\".`);
  }

  return isValid;
}

function makeFavicon(url) {
  var protocol, hostname, faviconUrl;

  if (url.indexOf("://") > -1) {
      protocol = url.substr(0, url.indexOf("://") + 3);
      hostname = url.split('/')[2];
  }

  faviconUrl = "https://www.google.com/s2/favicons?domain=" + protocol + hostname;

  return faviconUrl;
}

// Show a "Getting Started" link in the context menu if not set up properly
function createHelpLink() {
  chrome.contextMenus.create({
    id: "https://github.com/NumeriusNegidius/Context-Search/wiki",
    title: chrome.i18n.getMessage("helpMenuLabel"),
    contexts: ["all"],
    onclick: goTo
  }, onCreated());
}

// Make the context menu
function populateContextMenu(id, title, url, parent, type, subTreeID) {

  if (id == subTreeID) {
    //This is the root folder, make the title what is searched for
    chrome.contextMenus.create({
      id: subTreeID,
      title: chrome.i18n.getMessage("rootMenuLabel") + ": %s",
      contexts: ["all"]
    }, onCreated());
  }
  else {

    // Features introduced in Firefox 56
    if (browserVersion >= 56) {
      if (!url) {
        // These are the folders
        chrome.contextMenus.create({
          parentId: parent,
          id: id,
          title: title || 'Folder_' + id,
          contexts: ["all"],
        }, onCreated());
      }

      else {
        if (browserVersion >= 57) {
          if (type == "separator") {
            // These are the separators
            chrome.contextMenus.create({
              parentId: parent,
              id: id,
              contexts: ["all"],
              type: "separator"
            }, onCreated());
          }
        }

        if (url) {
          // These are the bookmarks with favicons
          let enabled = checkValid(url);
          //let favicon = "";
          //favicon = makeFavicon(url);
          chrome.contextMenus.create({
            parentId: parent,
            id: url,
            title: title || url,
            contexts: ["all"],
            enabled: enabled,
            onclick: goTo
          }, onCreated());
        }
      }
    }


    // Backwards compatibility
    if (browserVersion < 56) {
      if (!url) {
        // These are the folders
        chrome.contextMenus.create({
          parentId: parent,
          id: id,
          title: title || 'Folder_' + id
        }, onCreated());
      }

      else {
        let enabled = checkValid(url);
        // These are the bookmarks without favicons
        chrome.contextMenus.create({
          parentId: parent,
          id: url,
          title: title || url,
          enabled: enabled,
          onclick: goTo
        }, onCreated());
      }

    }

  }
}

// Check options if tab should open as active or in background
// Then pass to createTab
function goTo(info, parentTab) {
  let gettingItem = chrome.storage.local.get((response) => {
    if (response.makeNewTabActive == "false") {
      active = false;
    }
    else {
      active = true;
    }

    if (response.tabPlacement == "end") {
      index = null;
    }
    else {
      index = parentTab.index + 1;
    }

    createTab(info, active, index);
  });
}

// Replace the browser standard %s for keyword searches with
// the selected text on the page and make a tab
function createTab(info, active, index) {
  let text = info.selectionText || info.linkUrl || info.srcUrl || info.pageUrl;
  chrome.tabs.create({
    url: info.menuItemId.replace("%s", encodeURIComponent(text)),
    active: active,
    index: index
  });
}

chrome.bookmarks.onCreated.addListener(reGenerateList);
chrome.bookmarks.onRemoved.addListener(reGenerateList);
chrome.bookmarks.onChanged.addListener(reGenerateList);
chrome.bookmarks.onMoved.addListener(reGenerateList);

main();

function searchLibsFilter (keyword) {
  return searchLibs.filter(i => i.keyword.includes(keyword)).sort((a, b) => {
    a = a.keyword
    b = b.keyword
    if (a.indexOf(keyword) < b.indexOf(keyword)) {
      return -1
    } else if (a.indexOf(keyword) > b.indexOf(keyword)) {
      return 1
    }

    if (a.length < b.length) {
      return -1
    } else if (a.length > b.length) {
      return 1
    }

    return a < b ? -1 : a === b ? 0 : 1
  })
}

function htmlEscape (text) {
  return text.replace(/["&<>]/g, function (match) {
    return {
      '"': '&quot;',
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;'
    }[match]
  })
}

chrome.omnibox.onInputChanged.addListener(function (text, suggest) {
  let [, keyword, input] = text.match(/^(.*?)(\s.*$|$)/)
  input = input.trim()
  let libs = searchLibsFilter(keyword)
  if (libs.length === 0) return suggest([])
  let lists = libs.map(i => {
    return {
      content: `${i.keyword} ${input}`,
      description: `<dim>使用</dim> <url>${htmlEscape(i.title)}</url> <dim>搜索</dim>: <match>${htmlEscape(input)}</match>`,
      deletable: true
    }
  })
  suggest(lists)
})

chrome.omnibox.onInputEntered.addListener(function (text) {
  let [, keyword, input] = text.match(/^(.*?)(\s.*$|$)/)
  input = input.trim()
  let libs = searchLibsFilter(keyword)
  if (libs.length === 0) return
  chrome.tabs.update({ url: libs[0].url.replace("%s", encodeURIComponent(input)) })
})
