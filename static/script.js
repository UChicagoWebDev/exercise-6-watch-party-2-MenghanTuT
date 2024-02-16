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

document.addEventListener('DOMContentLoaded', () => {
  localStorage.clear();
  load_page();
});

const loginButton = document.querySelector('.alignedForm.login button');
loginButton.addEventListener('click', async (event) => {
  event.preventDefault();
  const username = document.querySelector('.login input[name="username"]').value;
  const password = document.querySelector('.login input[name="password"]').value;
  await login(username, password);
});

function load_page(){
  updateContentPlaceholdersUsername();
  const apiKey = localStorage.getItem('apiKey');
  const path = window.location.pathname;

// debug
if (!apiKey){console.log("pageload: not found apiKey")} else{console.log("pageload:", apiKey)}

  if (!apiKey) {
    if (path === '/login') {
      showPage(LOGIN);
      loginfailedornot();
    } else {
      showPage(SPLASH);
      showcorrectSPLASH(apiKey);
    }
  } else {
    if (path === '/profile') {
      showPage(PROFILE);
      showcorrectprofile();
    } else if (path.startsWith('/room')) {
      showPage(ROOM);
    } else {
      showPage(SPLASH);
      showcorrectSPLASH(apiKey);
    }
  }
}

function showcorrectprofile(){
  const username = localStorage.getItem('username');
  // const password = localStorage.getItem('password');
  
  // Select the input elements by their name attribute
  const usernameInput = document.querySelector('input[name="username"]');
  // const passwordInput = document.querySelector('input[name="password"]');
  // const repeatPasswordInput = document.querySelector('input[name="repeatPassword"]');

  // Update the value of the input elements
  if (usernameInput) usernameInput.value = username;
  // It's generally unsafe to prefill password fields for display or update purposes
  // if (passwordInput) passwordInput.value = password;
  // if (repeatPasswordInput) repeatPasswordInput.value = password;
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

function showcorrectSPLASH(apikey)
{
  console.log(apikey)
  const LOGGEDIN = document.querySelector(".loggedIn"); // for logged-in users
  const LOGGEDOUT = document.querySelector(".loggedOut"); // for logged-out users
  const CREATE_BUTTON = document.querySelector(".create"); // for logged-in users
  const SIGNUP_BUTTON = document.querySelector(".signup"); // for logged-out users

  // Initially hide both sections
  LOGGEDOUT.style.display = 'none';
  LOGGEDIN.style.display = 'none';
  CREATE_BUTTON.style.display = 'none';
  SIGNUP_BUTTON.style.display = 'none'; 

  if(apikey!= null) {
    // User is logged in
    LOGGEDIN.style.display = 'block';
    CREATE_BUTTON.style.display = 'block';
    document.querySelector('.create').addEventListener('click', (event) => {
      event.preventDefault(); 
      createanewroom();
    });
  } else {
    // No apikey, user is logged out
    LOGGEDOUT.style.display = 'block';
    document.querySelector('.loggedOut a').addEventListener('click', (event) => {
      event.preventDefault(); 
      localStorage.setItem('loginfailedornot', "success");
      navigateTo("/login");
    });
    SIGNUP_BUTTON.style.display = 'block';
    document.querySelector('.signup').addEventListener('click', async (event) => {
      event.preventDefault();
      signup();
      // debug
      console.log("action: sign up")
    });
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
      localStorage.setItem('password', data.password);
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

function loginfailedornot(){
  document.querySelector('.failed').style.display = 'none';
  const loginfailed = localStorage.getItem('loginfailedornot');
  if (loginfailed == "failed"){
    document.querySelector('.failed').style.display = 'block';
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

function createanewroom(){

}

// TODO:  When displaying a page, update the DOM to show the appropriate content for any element
//        that currently contains a {{ }} placeholder. You do not have to parse variable names out
//        of the curly  braces—they are for illustration only. You can just replace the contents
//        of the parent element (and in fact can remove the {{}} from index.html if you want).

function updateContentPlaceholdersUsername() {
  document.querySelectorAll('.username').forEach(element => {
    const currentText = element.textContent; // Get the current text of the element
    const username = localStorage.getItem('username'); 
    if (username) {
      const newText = currentText.replace('{{ Username }}', username);
      element.textContent = newText; // Update the element's text content
    }
  });
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

// function startPollingMessages(roomId) {
//   messagePollingInterval = setInterval(async () => {
//     // Replace with your API call to fetch messages
//     const messages = await fetchMessagesForRoom(roomId);
//     // Update your messages UI here
//   }, 100); // Adjust the interval as needed
// }

// function stopPollingMessages() {
//   clearInterval(messagePollingInterval);
// }

// On page load, show the appropriate page and hide the others
