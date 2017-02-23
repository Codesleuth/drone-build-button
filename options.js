'use strict'

const droneUrlBox = document.getElementById('drone-url')
const droneTokenBox = document.getElementById('drone-token')
const saveButton = document.getElementById('save-button')

console.log(saveButton)

function save (e) {
  const blob = {
    drone: {
      url: droneUrlBox.value,
      token: droneTokenBox.value
    }
  }
  console.log(blob)
  chrome.storage.sync.set(blob, function () {
    clean(droneUrlBox)
    clean(droneTokenBox)
  })
}

function load (e) {
  chrome.storage.sync.get({
    drone: {
      url: null,
      token: null
    }
  }, function (items) {
    droneUrlBox.value = items.drone.url
    droneTokenBox.value = items.drone.token
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

droneUrlBox.addEventListener('input', dirty)
droneTokenBox.addEventListener('input', dirty)
