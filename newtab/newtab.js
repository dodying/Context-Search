const FOLDER_NAME = "Searches"
const ILLEGAL_PROTOCOLS = ["chrome", "javascript", "data", "file", "about"]

const $ = e => document.querySelector(e);
const $_ = e => document.createElement(e);

function main() {
  chrome.bookmarks.search({
    title: FOLDER_NAME
  }, bookmarks => {
    let subTreeID = bookmarks[0].id;
    chrome.bookmarks.getSubTree(subTreeID, bookmarkItems => {
      listBookmarksInTree(bookmarkItems[0], subTreeID);
      bindEvent();
      document.querySelectorAll('.title').forEach(i => i.click());
    });
  });
}

function listBookmarksInTree(bookmarkItem, subTreeID) {
  populateMenu(bookmarkItem, subTreeID);

  if (bookmarkItem.children) {
    for (child of bookmarkItem.children) {
      listBookmarksInTree(child, subTreeID);
    }
  }
}

function checkValid(url) {
  let isValidProtocol = false,
    isValidWildcard = false,
    isValid = false;

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
  } else {
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

function populateMenu(item, subTreeID) {
  if (!item.url) { //folder
    let folder = $_('ul');
    folder.id = '_' + item.id;
    let title = $_('li');
    if (item.id !== subTreeID) {
      title.className = 'title';
      title.textContent = item.title || 'Folder_' + item.id;
      folder.appendChild(title);
    }
    $(item.id === subTreeID ? '.list' : '#_' + item.parentId).appendChild(folder);
  } else {
    let _ = $_('li');
    let enabled = checkValid(item.url);
    let favicon = makeFavicon(item.url);
    _.className = 'list_' + enabled;
    _.name = item.url;
    _.title = item.title || item.url;
    _.innerHTML = `<img src="${favicon}">${item.title || item.url}`;
    $('#_' + item.parentId).appendChild(_);
  }
}

function bindEvent() {
  $('#current-image').addEventListener('click', () => {
    $('.list').style.display = $('.list').style.display === 'block' ? 'none' : 'block';
  });
  $('#triangle-arrow').addEventListener('click', () => {
    $('.list').style.display = $('.list').style.display === 'block' ? 'none' : 'block';
  });
  $('#search').addEventListener('keyup', e => {
    $('#search-box-clear').style.display = $('#search').value ? 'block' : 'none';
    if (e.keyCode === 13) $('.search-button-container').click();
  });
  $('#search-box-clear').addEventListener('click', () => {
    $('#search').value = '';
    $('#search-box-clear').style.display = 'none';
  });
  $('.search-button-container').addEventListener('click', () => {
    let text = $('#search').value;
    location.href = $('#search').name.replace('%s', text);
  });
  $('.list').addEventListener('click', e => {
    let target = e.target;
    if (target.className === 'title') {
      let p = target.parentNode.children;
      for (let i = 1; i < p.length; i++) {
        p[i].style.display = p[i].style.display === 'none' ? 'block' : 'none';
      };
    } else if (target.className === 'list_true') {
      $('#current-image').src = makeFavicon(target.name);
      $('#search').placeholder = target.title;
      $('#search').name = target.name;
      $('.list').style.display = 'none';
      if ($('#search').value !== '') $('.search-button-container').click();
    }
  });
}

main();
