'use strict'

const tokenBox = document.getElementById('github-token')
const saveButton = document.getElementById('save-token')

function save (e) {
  const blob = {
    github: {
      token: tokenBox.value
    }
  }
  chrome.storage.sync.set(blob, function () {
    clean(tokenBox)
  })
}

function load (e) {
  chrome.storage.sync.get({
    github: {
      token: null
    }
  }, function (items) {
    tokenBox.value = items.github.token
  })
}

function dirty (e) {
  e.target.classList.remove('is-success')
  e.target.classList.add('is-warning')
}

function clean (element) {
  element.classList.remove('is-warning')
  element.classList.add('is-success')
}

document.addEventListener('DOMContentLoaded', load)
saveButton.addEventListener('click', save)
tokenBox.addEventListener('input', dirty)
