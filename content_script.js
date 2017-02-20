'use strict'

chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  if (msg.command && (msg.command === 'get_pr_details')) {
    const element = document.getElementById('partial-pull-merging')
    const channels = element.getAttribute('data-channel').split(' ')

    // tenant:1:repo:692:branch:feature/name tenant:1:repo:692:branch:master tenant:1:repo:692:commit:xxxxxxxxxxyyyyyyyyyyxxxxxxxxxxyyyyyyyyyy tenant:1:issue:17153:state

    const [ , , , repoId, , branch ] = channels[0].split(':')
    const head = channels[2].split(':')[5]

    sendResponse({ repoId, branch, head })
  }
})
