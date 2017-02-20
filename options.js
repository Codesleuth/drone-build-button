'use strict'

const urlBox = document.getElementById('drone-url')
const tokenBox = document.getElementById('drone-token')
const saveButton = document.getElementById('save-button')

console.log(saveButton)

function save (e) {
  const blob = {
    drone_url: urlBox.value,
    drone_token: tokenBox.value
  }
  console.log(blob)
  chrome.storage.sync.set(blob, function () {
    urlBox.classList.remove('is-warning')
    tokenBox.classList.remove('is-warning')
    urlBox.classList.add('is-success')
    tokenBox.classList.add('is-success')
  })
}

function load (e) {
  chrome.storage.sync.get({
    drone_url: null,
    drone_token: null
  }, function (items) {
    urlBox.value = items.drone_url
    tokenBox.value = items.drone_token
  })
}

function dirty (e) {
  e.target.classList.remove('is-success')
  e.target.classList.add('is-warning')
}

document.addEventListener('DOMContentLoaded', load)
saveButton.addEventListener('click', save)

urlBox.addEventListener('input', dirty)
tokenBox.addEventListener('input', dirty)
