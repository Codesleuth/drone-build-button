'use strict'

chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  if (!msg.command || msg.command !== 'get_commit_details') return

  const urlParts = document.location.toString().match(/(https?:\/\/.+\..+\/(.+)\/(.+))\/commit\/([a-f0-9]+)/)

  if (!urlParts) {
    sendResponse({ ok: false, error: 'This is not a commit page' })
    return
  }

  const message = document.title.match(/(.+)\s·/)[1]
  const [commitUrl, repoUrl, org, repo, sha] = urlParts
  const repoId = document.querySelector('div[data-upload-repository-id]').attributes['data-upload-repository-id'].value
  const branch = document.querySelector('ul.branches-list>li.branch>a').innerHTML
  const timestamp = document.querySelector('relative-time').attributes['datetime'].value

  const authorImg = document.querySelector('span.commit-author-section>img')
  const authorUsername = authorImg.attributes['alt'].value.slice(1)
  const authorAvatar = authorImg.attributes['src'].value

  sendResponse({ ok: true, result: {
    branch,
    org: {
      name: org
    },
    repo: {
      id: repoId,
      name: repo,
      url: repoUrl
    },
    commit: {
      id: sha, 
      message,
      url: commitUrl,
      timestamp,
      author: {
        name: authorUsername,
        avatar_url: authorAvatar
      }
    }
  }})
})
