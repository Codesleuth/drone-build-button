'use strict'

function getSettings() {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get({
      drone_url: null,
      drone_token: null
    }, (settings) => {
      if (settings) return resolve(settings)
      reject(chrome.runtime.lastError)
    })
  })
}

function guid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

function postBuild(payload) {
  const headers = new Headers()
  headers.append('Content-Type', 'application/json')
  headers.append('X-Github-Event', 'pull_request')
  headers.append('X-Github-Delivery', guid())

  const options = {
    method: 'POST',
    headers: headers,
    mode: 'cors',
    cache: 'default',
    body: JSON.stringify(payload)
  }

  getSettings().then((settings) => {
    const req = new Request(`${settings.drone_url}/hook?access_token=${settings.drone_token}`, options)
    return fetch(req).then(function (res) {
      return res.blob()
    }).then(function (myBlob) {
      console.log(myBlob)
    })
  })
}

function buildClick() {

  chrome.tabs.getSelected(null, function (tab) {

    const matches = tab.url.match(/(https?:\/\/.+\..+\/(.+)\/(.+))\/pull\/([0-9]+)/)
    if (!matches) return

    chrome.tabs.sendMessage(tab.id, { command: "get_pr_details" }, function (response) {
      const url = tab.url
      const repoUrl = matches[1]
      const owner = matches[2]
      const repo = matches[3]
      const issue = matches[4]
      const title = tab.title.match(/(.*) by .+ Pull Request \#/)[1]

      const payload = createPRHook({
        repo: {
          id: response.repoId,
          name: repo,
          owner,
          url: repoUrl
        },
        pull: {
          number: issue,
          url,
          title
        },
        branch: response.branch,
        commit: response.head,
        user: {
          login: 'Codesleuth',
          avatar_url: 'https://avatars0.githubusercontent.com/u/5011956?v=3&s=460'
        }
      })

      console.log(payload)

      postBuild(payload)
    })

  })
}

function createPRHook(options) {
  return {
    "pull_request": {
      "html_url": options.pull.url,
      "number": Number(options.pull.number),
      "title": options.pull.title,
      "user": {
        "login": options.user.login,
        "avatar_url": options.user.avatar_url
      },
      "head": {
        "ref": options.branch,
        "sha": options.commit,
        "repo": {
          "clone_url": `${options.repo.url}.git`
        }
      },
      "base": {
        "ref": "master"
      }
    },
    "repository": {
      "id": Number(options.repo.id),
      "name": options.repo.name,
      "owner": {
        "login": options.repo.owner
      },
      "private": true,
      "html_url": options.repo.url,
      "clone_url": `${options.repo.url}.git`
    },
  }
}

function loadExtension() {
  var buildButton = document.getElementById('build-button')
  buildButton.addEventListener('click', buildClick, false)
}


document.addEventListener('DOMContentLoaded', loadExtension, false)
