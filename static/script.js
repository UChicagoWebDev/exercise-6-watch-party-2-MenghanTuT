// Constants to easily refer to pages
const SPLASH = document.querySelector(".splash");
const PROFILE = document.querySelector(".profile");
const LOGIN = document.querySelector(".login");
const ROOM = document.querySelector(".room");

// Custom validation on the password reset fields
const passwordField = document.querySelector(".profile input[name=password]");
const repeatPasswordField = document.querySelector(".profile input[name=repeatPassword]");
const repeatPasswordMatches = () => {
  const p = document.querySelector(".profile input[name=password]").value;
  const r = repeatPassword.value;
  return p == r;
};

const checkPasswordRepeat = () => {
  const passwordField = document.querySelector(".profile input[name=password]");
  if(passwordField.value == repeatPasswordField.value) {
    repeatPasswordField.setCustomValidity("");
    return;
  } else {
    repeatPasswordField.setCustomValidity("Password doesn't match");
  }
}

passwordField.addEventListener("input", checkPasswordRepeat);
repeatPasswordField.addEventListener("input", checkPasswordRepeat);

// TODO:  On page load, read the path and whether the user has valid credentials:
//        - If they ask for the splash page ("/"), display it
//        - If they ask for the login page ("/login") and don't have credentials, display it
//        - If they ask for the login page ("/login") and have credentials, send them to "/"
//        - If they ask for any other valid page ("/profile" or "/room") and do have credentials,
//          show it to them
//        - If they ask for any other valid page ("/profile" or "/room") and don't have
//          credentials, send them to "/login", but remember where they were trying to go. If they
//          login successfully, send them to their original destination
//        - Hide all other pages

let roomlistPollingInterval = null
let messagePollingInterval = null

document.addEventListener('DOMContentLoaded', () => {
  // localStorage.clear();
  load_page();
});

// show correct LOGIN
const loginButton = document.querySelector('.alignedForm.login button');
loginButton.addEventListener('click', async (event) => {
  event.preventDefault();
  const username = document.querySelector('.login input[name="username"]').value;
  const password = document.querySelector('.login input[name="password"]').value;
  await login(username, password);
});

const createNewAccount = document.querySelector('.login .failed button');
createNewAccount.addEventListener('click',() => {
  signup();
    // debug
    console.log("action: sign up")
});

// show correct SPLASH
document.querySelector('.create').addEventListener('click', () => { 
  createanewroom();
});
document.querySelector('.loggedIn').addEventListener('click', () => {
  navigateTo("/profile");
});
document.querySelector('.loggedOut a').addEventListener('click', () => {
  localStorage.setItem('loginfailedornot', "success");
  navigateTo("/login");
});
document.querySelector('.signup').addEventListener('click', async () => {
  signup();
  // debug
  console.log("action: sign up")
});

// show correct ROOM
const editIcon = document.querySelector('.displayRoomName .material-symbols-outlined');
const displayRoomNameDiv = document.querySelector('.displayRoomName');
const editRoomNameDiv = document.querySelector('.editRoomName');
editIcon.addEventListener('click', () => {
    displayRoomNameDiv.style.display = 'none';
    editRoomNameDiv.style.display = 'block';
});

const roomNameElement = document.querySelector('.displayRoomName strong');
const updateroomname = document.querySelector('.editRoomName button');
updateroomname.addEventListener('click',async () => {
  const room = await FetchRoomName();
  roomnameinput = document.querySelector('.editRoomName input').value;
  await updateRoomName(room.id, roomnameinput);
  displayRoomNameDiv.style.display = 'block';
  editRoomNameDiv.style.display = 'none';
  const newRoomDetail = await FetchRoomName();
  roomNameElement.textContent = newRoomDetail.name;
});

const profilelink = document.querySelector('.room .welcomeBack');
profilelink.addEventListener('click',() => {
  navigateTo("/profile");
});

const postbutton = document.querySelector('.room .comment_box button');
postbutton.addEventListener('click',() => {
  sendPost();
});

// show correct PROFILE
document.querySelector('.goToSplash').addEventListener('click', () => {
  navigateTo('/');
});

document.querySelector('.logout').addEventListener('click', () => {
  // Removing items from localStorage
  localStorage.clear();
  navigateTo('/');
});

const updateUsernameButton = document.querySelector('input[name="username"] + button');
const updatePasswordButton = document.querySelector('input[type="password"] + button');
updateUsernameButton.addEventListener('click', () => {
  console.log("updateUsername();");
  UpdateUsername()
});
updatePasswordButton.addEventListener('click', () => {
  console.log("updatePassword();");
  updatePassword()
});

//page rendering
function load_page(){
  updateContentPlaceholdersUsername();
  clearInterval(roomlistPollingInterval)
  clearInterval(messagePollingInterval)
  const apiKey = localStorage.getItem('apiKey');
  const path = window.location.pathname;

// debug
if (!apiKey){console.log("pageload: not found apiKey")} else{console.log("pageload:", apiKey)}
  if (!apiKey) {
    if (path === '/login') {
      showPage(LOGIN);
      showcorrectlogin();
    } else {
      showPage(SPLASH);
      FetchAndUpdateRooms();
      showcorrectSPLASH(apiKey);
    }
  } else {
    if (path == '/profile') {
      showPage(PROFILE);
      showcorrectprofile();
    } else if (path.startsWith('/room')) {
      startMessagePolling();
      showPage(ROOM);
      showcorrectroom();
    } else {
      startRoomlistPolling();
      FetchAndUpdateRooms();
      showPage(SPLASH);
      showcorrectSPLASH(apiKey);
    }
  }
}

function hideAllPages() {
  SPLASH.style.display = 'none';
  PROFILE.style.display = 'none';
  LOGIN.style.display = 'none';
  ROOM.style.display = 'none';
}

function showPage(page) {
  hideAllPages();
  page.style.display = 'block';
}

async function showcorrectroom(){
  FetchAndUpdateMessages();
  const room = await FetchRoomName();
  const roomNameElement = document.querySelector('.displayRoomName strong');
  roomNameElement.textContent = room.name;

  const editRoomNameDiv = document.querySelector('.editRoomName');
  editRoomNameDiv.style.display = 'none';

  const roomIdElement = document.querySelector('.roomDetail .roomlink');
  roomIdElement.textContent = `/room/${room.id}`;
  roomIdElement.href = `/room/${room.id}`;
}

function showcorrectlogin(){
  document.querySelector('.failed').style.display = 'none';
  const loginfailed = localStorage.getItem('loginfailedornot');
  if (loginfailed == "failed"){
    document.querySelector('.failed').style.display = 'block';
  }
}

function showcorrectprofile(){
  const username = localStorage.getItem('username');
  const password = localStorage.getItem('password');

  const usernameInput = document.querySelector('input[name="username"]');
  const passwordInput = document.querySelector('input[name="password"]');
  const repeatPasswordInput = document.querySelector('input[name="repeatPassword"]');

  if (usernameInput) usernameInput.value = username;
  if (passwordInput) passwordInput.value = password;
  if (repeatPasswordInput) repeatPasswordInput.value = password;
}

function showcorrectSPLASH(apikey)
{
  const LOGGEDIN = document.querySelector(".loggedIn"); // for logged-in users
  const LOGGEDOUT = document.querySelector(".loggedOut"); // for logged-out users
  const CREATE_BUTTON = document.querySelector(".create"); // for logged-in users
  const SIGNUP_BUTTON = document.querySelector(".signup"); // for logged-out users

  // Initially hide both sections
  LOGGEDOUT.style.display = 'none';
  LOGGEDIN.style.display = 'none';
  CREATE_BUTTON.style.display = 'none';
  SIGNUP_BUTTON.style.display = 'none'; 

  if(apikey) {
    // User is logged in
    LOGGEDIN.style.display = 'block';
    CREATE_BUTTON.style.display = 'block';
  } else {
    // No apikey, user is logged out
    LOGGEDOUT.style.display = 'block';
    SIGNUP_BUTTON.style.display = 'block';
  }
}

//action
async function UpdateUsername(){
  const usernameInput = document.querySelector('input[name="username"]');
  const apiKey = localStorage.getItem('apiKey');
  console.log(apiKey)
  try {
      const response = await fetch('/api/username', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `${apiKey}` 
          },
          body: JSON.stringify({ username: usernameInput.value })
      });
      if (!response.ok) throw new Error('Failed to update username');
      alert('Username updated successfully');
      await localStorage.setItem('username', usernameInput.value);
      updateContentPlaceholdersUsername()
      // username = localStorage.getItem('username')
      // document.querySelector('.profile .username').textContent = username
  } catch (error) {
      console.error('Error updating username:', error);
  }
}

async function updatePassword() {
  const passwordInput = document.querySelector('input[name="password"]');
  const repeatPasswordInput = document.querySelector('input[name="repeatPassword"]');
  const apiKey = localStorage.getItem('apiKey');
  if (passwordInput.value !== repeatPasswordInput.value) {
        alert('Passwords do not match');
      return;
  }
  if (!passwordInput.value) {
    alert('empty value alert');
  return;
  }
  try {
      const response = await fetch('/api/password', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `${apiKey}`
          },
          body: JSON.stringify({ password: passwordInput.value })
      });
      if (!response.ok) throw new Error('Failed to update password');
      alert('Password updated successfully');
  } catch (error) {
      console.error('Error updating password:', error);
  }
}

async function signup(){
  try {
    const response = await fetch('/api/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    if (response.ok) {
      const data = await response.json();
      localStorage.setItem('apiKey', data.api_key); 
      localStorage.setItem('username', data.name);
      // localStorage.setItem('password', data.password);
      //debug
      console.log("signup feedback:", "name:", data.name, "api:", data.api_key, "password", data.password)
      navigateTo("/profile");
    } else {
      console.error('Signup failed');
    }
  } catch (error) {
    console.error('Error during signup', error);
  }
}

async function login(username, password) {
  //debug
  console.log("login:", "username:", username, "password:", password)

  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({username, password}),
    });
    if (response.ok) {
      // If login is successful
      const data = await response.json();
      localStorage.setItem('apiKey', data.api_key);
      localStorage.setItem('username', username);
      navigateTo("/profile");
    } else {
      // If login is unsuccessful, show the .failed message
      localStorage.setItem('loginfailedornot', "failed");
      load_page();
    }
  } catch (error) {
    console.error('Login error:', error);
  }
}

async function createanewroom(){
  //debug
  console.log("Create a new room")
  apiKey = localStorage.getItem('apiKey')
  try {
    const response = await fetch('/api/roomcreation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `${apiKey}`
      },
    });
    if (response.ok) {
      // If login is successful
      const data = await response.json();
      console.log("Room created successfully:", data.id, "Name:", data.name);
    } else {
      throw new Error(`API call failed: ${response.status}`);
    }
  } catch (error) {
    console.error("Failed to create a new room:", error);
  }
  FetchAndUpdateRooms();
}

async function FetchAndUpdateRooms(){
  try {
    console.log(`Fetch room list!`)
    const response = await fetch('/api/getrooms', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch rooms: ${response.statusText}`);
    }
    const rooms = await response.json();
    const roomListDiv = document.querySelector('.roomList');
    const noRoomsDiv = document.querySelector('.noRooms');
    roomListDiv.innerHTML = '';
    if (rooms.length > 0) {
      rooms.forEach(room => {
        const roomElement = document.createElement('a');
        roomElement.href = `/room/${room.id}`
        roomElement.innerHTML = `${room.id}: <strong>${room.name}</strong>`;
        roomListDiv.appendChild(roomElement);
      });
      noRoomsDiv.style.display = 'none';
    } else {
      noRoomsDiv.style.display = 'block';
    }
  } catch (error) {
    console.error("Error fetching rooms:", error);
  }
}

async function FetchRoomName(){
  try {
    apiKey = localStorage.getItem('apiKey')
    const segments_path = window.location.pathname.split('/');
    const roomIdIndex = segments_path.findIndex(segments_path => segments_path === 'room') + 1;
    const roomId = segments_path[roomIdIndex];
    console.log(`Fetch name for room ${roomId}`)
    const response = await fetch(`/api/room/${roomId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `${apiKey}`
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const room = await response.json();
    return {
      id: room.id,
      name: room.name
    };
  } catch (error) {
    console.error('Failed to fetch room name:', error);
  }
}

async function updateRoomName(id, newname){
  const apiKey = localStorage.getItem('apiKey');
  try {
      const response = await fetch(`/api/room/${id}`, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `${apiKey}`
          },
          body: JSON.stringify({ new_name: newname })
      });
      if (!response.ok) throw new Error('Failed to update room name');
  } catch (error) {
      console.error('Error updating room name:', error);
  }
}

async function FetchAndUpdateMessages(){
  try {
    apiKey = localStorage.getItem('apiKey')
    const segments_path = window.location.pathname.split('/');
    const roomIdIndex = segments_path.findIndex(segments_path => segments_path === 'room') + 1;
    const roomId = segments_path[roomIdIndex];
    console.log(`Fetch messages for room ${roomId}`)
    const response = await fetch(`/api/room/${roomId}/messages`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `${apiKey}`
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    const messagesContainer = document.querySelector('.messages');
    messagesContainer.innerHTML = '';
    if (data){
        data.forEach(message => {
        const messageElement = document.createElement('message');
        const authorElement = document.createElement('author');
        authorElement.textContent = message.name;
        const contentElement = document.createElement('content');
        contentElement.textContent = message.body;
        messageElement.appendChild(authorElement);
        messageElement.appendChild(contentElement);
        messagesContainer.appendChild(messageElement);
      });
    }
  } catch (error) {
    console.error('Failed to fetch messages:', error);
  }
}

async function sendPost(){
  try {
    const commentBox = document.querySelector('.comment_box textarea');
    const comment = commentBox.value;
    apiKey = localStorage.getItem('apiKey')
    const segments_path = window.location.pathname.split('/');
    const roomIdIndex = segments_path.findIndex(segments_path => segments_path === 'room') + 1;
    const roomId = segments_path[roomIdIndex];
    console.log(`send ${comment} to room ${roomId}`)
    const response = await fetch(`/api/room/${roomId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `${apiKey}`
      },
      body: JSON.stringify({ comment: comment })
    });
    if (!response.ok) {
      throw new Error(`Failed to send comment status: ${response.status}`);
    }
  } catch (error) {
    console.error('Failed to send comment:', error);
  }
}

// TODO:  When displaying a page, update the DOM to show the appropriate content for any element
//        that currently contains a {{ }} placeholder. You do not have to parse variable names out
//        of the curly  braces—they are for illustration only. You can just replace the contents
//        of the parent element (and in fact can remove the {{}} from index.html if you want).

function updateContentPlaceholdersUsername() {
  const username = localStorage.getItem('username'); 
  document.querySelector('.splash .username').textContent = `Welcome back, ${username}`;
  document.querySelector('.profile .username').textContent = `${username}`;
  document.querySelector('.room .username').textContent = `${username}`;
  // document.querySelectorAll('.username').forEach(element => {
  //   const currentText = element.textContent; // Get the current text of the element

  //   if (username) {
  //     const newText = currentText.replace('{{ Username }}', username);
  //     element.textContent = newText; // Update the element's text content
  //   }
  // });
}

// TODO:  Handle clicks on the UI elements.
//        - Send API requests with fetch where appropriate.
//        - Parse the results and update the page.
//        - When the user goes to a new "page" ("/", "/login", "/profile", or "/room"), push it to
//          History

function navigateTo(url) {
  window.history.pushState({}, '', url);
  load_page()
}

// TODO:  When a user enters a room, start a process that queries for new chat messages every 0.1
//        seconds. When the user leaves the room, cancel that process.
//        (Hint: https://developer.mozilla.org/en-US/docs/Web/API/setInterval#return_value)

// let messagePollingInterval;

function startRoomlistPolling(){
  console.log("Roomlist polling start!")
  roomlistPollingInterval = setInterval(() => {
    FetchAndUpdateRooms();
  }, 5000); //check every 5000ms
  return roomlistPollingInterval
}

function startMessagePolling() {
  console.log("Message polling start!")
  messagePollingInterval = setInterval(() => {
    FetchAndUpdateMessages()
  }, 100); //check every 100ms
  return messagePollingInterval
}

// On page load, show the appropriate page and hide the others
