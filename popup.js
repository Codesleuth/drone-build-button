'use strict'

let notification = null

function getSettings() {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get({
      github: {
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

function pushToDrone(payload, droneUrl) {
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

  return new Promise((resolve, reject) => {
    const req = new Request(droneUrl, options)
    return fetch(req).then((res) => {
      if (res.ok) return res.json()
      throw new Error(`Push to Drone failed! ${res.status}`)
    }).then((res) => {
      log('Pushed!', res)
    })
  })

  return getSettings().then((settings) => {

  })
}

function log(line, data) {
  notification.textContent = line
  notification.classList.remove('x-hidden')

  console.log(line, data)
}

function getFirstHookUrl(server, token, owner, repo) {
  return new Promise((resolve, reject) => {
    const headers = new Headers()
    headers.append('Authorization', `Bearer ${token}`)

    const options = {
      method: 'GET',
      mode: 'cors',
      cache: 'default',
      headers
    }
    const req = new Request(`${server}/api/v3/repos/${owner}/${repo}/hooks`, options)

    return fetch(req).then((res) => {
      if (res.ok) return res.json()
      throw new Error('Could not get hook info from API')
    }).then((hookInfo) => {
      if (hookInfo.length === 0) return reject(new Error('No hooks found'))
      resolve(hookInfo[0].config.url)
    })
  })
}

function findCommitInBranch(server, token, owner, repo, sha, branch) {
  return new Promise((resolve, reject) => {
    const headers = new Headers()
    headers.append('Authorization', `Bearer ${token}`)

    const options = {
      method: 'GET',
      mode: 'cors',
      cache: 'default',
      headers
    }
    const req = new Request(`${server}/api/v3/repos/${owner}/${repo}/commits?sha=${branch}`, options)

    return fetch(req).then((res) => {
      if (res.ok) return res.json()
      throw new Error('Could not get commits for branch from API')
    }).then((info) => {
      const found = info.find((e) => e.sha === sha)
      resolve(found || null)
    })
  })
}

function searchBranchesForCommit(server, token, owner, repo, branches, sha) {
  return new Promise((resolve, reject) => {
    function next(index) {
      const branch = branches[index].name
      findCommitInBranch(server, token, owner, repo, sha, branch)
        .then((found) => {
          if (found) return resolve(branch)
          if (branches.length > index + 1) return next(index + 1)
          resolve(null)
        })
    }
    next(0)
    // GitHub, sort this shit out you morons...
  })
}

function getBranches(server, token, owner, repo) {
  return new Promise((resolve, reject) => {
    const headers = new Headers()
    headers.append('Authorization', `Bearer ${token}`)

    const options = {
      method: 'GET',
      mode: 'cors',
      cache: 'default',
      headers
    }
    const req = new Request(`${server}/api/v3/repos/${owner}/${repo}/branches`, options)

    return fetch(req).then((res) => {
      if (res.ok) return res.json()
      throw new Error('Could not get branches from API')
    }).then((branchesInfo) => {
      const flattened = branchesInfo.map((e) => ({ name: e.name, sha: e.commit.sha }))
      resolve(flattened)
    })
  })
}

function getRepoInfo(server, token, owner, repo) {
  return new Promise((resolve, reject) => {
    const headers = new Headers()
    headers.append('Authorization', `Bearer ${token}`)

    const options = {
      method: 'GET',
      mode: 'cors',
      cache: 'default',
      headers
    }
    const req = new Request(`${server}/api/v3/repos/${owner}/${repo}`, options)

    return fetch(req).then((res) => {
      if (res.ok) return res.json()
      throw new Error('Could not get repo info from API')
    }).then((repoInfo) => resolve(repoInfo))
  })
}

function getCommitInfo(server, token, owner, repo, sha) {
  return new Promise((resolve, reject) => {
    const headers = new Headers()
    headers.append('Authorization', `Bearer ${token}`)

    const options = {
      method: 'GET',
      mode: 'cors',
      cache: 'default',
      headers
    }
    const req = new Request(`${server}/api/v3/repos/${owner}/${repo}/commits/${sha}`, options)

    return fetch(req).then((res) => {
      if (res.ok) return res.json()
      throw new Error('Could not get commit info from API')
    }).then((commitInfo) => resolve(commitInfo))
  })
}

function buildClick(e) {

  e.target.setAttribute('disabled', '')

  chrome.tabs.getSelected(null, (tab) => {
    const urlRegex = tab.url.match(/^(https?:\/\/.+\..+)\/(.+)\/(.+)\/(?:pull\/\d+\/commits|commit)\/([a-f0-9]+)$/i)

    if (!urlRegex) return log('Is this a commit page?!')

    const [, server, owner, repo, sha] = urlRegex

    log('Getting settings...')

    let token

    getSettings()
      .then((settings) => {
        token = settings.github.token
        log('Gathering information...')
        return Promise.all([
          getFirstHookUrl(server, token, owner, repo),
          getBranches(server, token, owner, repo),
          getRepoInfo(server, token, owner, repo),
          getCommitInfo(server, token, owner, repo, sha)
        ])
      })
      .then(([url, branches, repoInfo, commitInfo]) => {
        return searchBranchesForCommit(server, token, owner, repo, branches, sha).then((found) => {
          log(`Found this commit in branch ${found}!`)
          const hook = createPushHook({
            branch: found,
            commit: {
              id: sha,
              url: commitInfo.html_url,
              message: commitInfo.commit.message,
              timestamp: commitInfo.commit.committer.date,
              author: {
                name: commitInfo.author.login,
                avatar_url: commitInfo.author.avatar_url
              }
            },
            org: {
              name: owner
            },
            repo: {
              name: repo,
              id: repoInfo.id,
              url: repoInfo.html_url
            }
          })

          log('Pushing to drone...')
          return pushToDrone(hook, url)
        })
      })
      .catch((err) => {
        log('Error! ' + err.message, err)
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
