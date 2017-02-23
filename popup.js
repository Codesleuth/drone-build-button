'use strict'

let notification = null

function getSettings() {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get({
      drone: {
        url: null,
        token: null,
      },
      github: {
        enterprise: true,
        token: null
      }
    }, (settings) => {
      if (settings) return resolve(settings)
      reject(chrome.runtime.lastError)
    })
  })
}

function guid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

function postPushPayload(payload) {
  const hookId = guid()

  const headers = new Headers()
  headers.append('Content-Type', 'application/json')
  headers.append('X-Github-Event', 'push')
  headers.append('X-Github-Delivery', hookId)
  headers.append('User-Agent', `GitHub-Hookshot/${hookId.slice(0, 7)}`)

  const options = {
    method: 'POST',
    headers: headers,
    mode: 'cors',
    cache: 'default',
    body: JSON.stringify(payload)
  }

  getSettings().then((settings) => {
    const req = new Request(`${settings.drone.url}/hook?access_token=${settings.drone.token}`, options)
    return fetch(req).then((res) => {
      return res.blob()
    }).then((myBlob) => {
      console.log(myBlob)
    }).catch((err) => {
      notification.innerHTML = `There was an error\n<pre>${err.message}</pre>`
      notification.classList.remove('x-hidden')
    })
  })
}

function buildClick() {

  chrome.tabs.getSelected(null, function (tab) {

    const commitRegex = tab.url.match(/(https?:\/\/.+\..+\/(.+)\/(.+))\/commit\/([a-f0-9]+)/)
    if (!commitRegex) return

    chrome.tabs.sendMessage(tab.id, { command: "get_commit_details" }, function (response) {
      if (!response.ok) {
        console.error(response.error)
        return
      }

      const payload = createPushHook(response.result)
      console.log(payload)
      postPushPayload(payload)
    })

  })
}

function createPushHook(options) {
  return {
    "ref": `refs/heads/${options.branch}`,
    "created": false,
    "deleted": false,
    "head_commit": {
      "id": options.commit.id,
      "url": options.commit.url,
      "message": options.commit.message,
      "timestamp": options.commit.timestamp,
      "author": {
        "name": options.commit.author.name,
        "email": "noreply@example.com",
        "username": options.commit.author.name,
      },
      "committer": {
        "name": options.commit.author.name,
        "email": "noreply@example.com",
        "username": options.commit.author.name,
      }
    },
    "sender": {
      "login": options.commit.author.name,
      "avatar_url": options.commit.author.avatar_url
    },
    "repository": {
      "owner": {
        "login": options.org.name,
        "name": options.org.name
      },
      "id": Number(options.repo.id),
      "name": options.repo.name,
      "full_name": `${options.org.name}/${options.repo.name}`,
      "language": 'JavaScript',
      "private": true,
      "html_url": options.repo.url,
      "clone_url": `${options.repo.url}.git`,
      "default_branch": "master"
    }
  }
}

function loadExtension() {
  const buildButton = document.getElementById('build-button')
  buildButton.addEventListener('click', buildClick, false)
  notification = document.getElementById('notification')
}


document.addEventListener('DOMContentLoaded', loadExtension, false)
