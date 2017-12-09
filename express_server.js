const express = require('express');
const methodOverride = require('method-override');
const cookieSession = require('cookie-session');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const app = express();
const PORT = process.env.PORT || 8080;

app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({extended: true}));
app.use(methodOverride('_method'));
app.use(cookieSession({
  name: 'session',
  keys: ['super top secret key']
}));

app.use(function clearGarbageCookies(req, res, next) {
  if (!users[req.session.userID]) {
    req.session.userID = undefined;
  }
  next();
});

app.use(function loginInfo(req, res, next) {
  res.locals.user = users[req.session.userID];
  res.locals.urls = urlDatabase;
  req.isLoggedIn = !!res.locals.user;
  next();
});

const users = {};

const urlDatabase = {
  "b2xVn2": {
    url: "http://www.lighthouselabs.ca",
    date: new Date().toString().substring(0,15),
    visits: 0,
    uniqueCount: 0,
    uniques: {},
    visitTag: []
  },
  "9sm5xK": {
    url: "http://www.google.com",
    date: new Date().toString().substring(0,15),
    visits: 0,
    uniqueCount: 0,
    uniques: {},
    visitTag: []
  }
};

function statInitializer(shortURL, longURL, user){
  urlDatabase[shortURL] = {
    date: new Date().toString().substring(0,15),
    visits: 0,
    uniqueCount: 0,
    uniques: {},
    user: user,
    url: longURL,
    visitTag:[]
  };
}

function statLogger(shortURL, trackerID) {
  let url = urlDatabase[shortURL];
  let date = new Date().toString().substring(0,15);
  url.visits += 1;
  url.visitTag.push(`${date} - Visited by: ${trackerID}`);
}

function uniqueVistorLogger(shortURL, trackerID) {
  let url = urlDatabase[shortURL];
  let uniquesDB = url.uniques;
  if (!uniquesDB[trackerID]){
    url.uniqueCount += 1;
    uniquesDB[trackerID] = true;
  }
}

function generateRandomString(){
  return Math.random().toString(16).slice(9);
}

// Creates customized user-specific URL database
function urlsForUser(userID) {
  const userDB = {};
  for (urls in urlDatabase) {
    if (urlDatabase[urls].user === userID){
      userDB[urls] = urlDatabase[urls];
    }
  }
  return userDB;
}

function URLHandling (longURL){
  if (longURL.substring(0,7) === 'http://'){
    return longURL;
  }
  else if (longURL.substring(0,4) === 'www.'){
    return ("http://" + longURL);
  }
  else {
    return ('http://www.' + longURL);
  }
}

// ################ GET RESPONSES #####################################################################

// ROOT page
app.get("/", (req, res) => {
  if (req.isLoggedIn) {
    res.redirect('/urls');
    return;
  }
  else {
    res.redirect('/login');
  }
});

// Login Page
app.get("/login", (req, res) => {
   if (req.isLoggedIn){
      res.redirect('/urls');
      return;
    }
    res.render("login_page");
});

// Main page listing URL database
app.get("/urls", (req, res) => {
  if (req.isLoggedIn){
    let userDB = urlsForUser(req.session.userID);
    let templateVars = { urls: userDB };
    res.render("urls_index", templateVars);
  } else {
    res.render("not_logged_in");
  }
});

// Create new short URL
app.get("/urls/new", (req, res) => {
  if (req.isLoggedIn){
    res.render("urls_new");
  } else {
    res.redirect("/login");
  }
});

// Directs to longURL (with error handling) & logs visit stats
app.get("/u/:shortURL", (req, res) => {
  let shortURL = req.params.shortURL;
  let longURL = urlDatabase[shortURL].url;
  if (!urlDatabase[shortURL]) {
    res.status(404).send('404 - Link not found.');
    return;
  }
  // Generates tracker cookie if user doesn't have one
  if (!req.session.Track) {
    req.session.Track = generateRandomString();
  }
  // Logs unique visitors and # visits
  let trackerID = req.session.Track;
  statLogger(shortURL, trackerID);
  uniqueVistorLogger(shortURL, trackerID);
  res.redirect(URLHandling(longURL));
});

// Update and Usage Stats for URL
app.get("/urls/:id", (req, res) => {
  let shortURL = req.params.id;
  if (!urlDatabase[shortURL]) {
    res.status(404).send('404 - Link not found.');
    return
  }
  if (req.isLoggedIn){
    if (urlDatabase[req.params.id].user === req.session.userID){
      let templateVars = { shortURL: shortURL };
      res.render("urls_show", templateVars);
    } else {
      res.status(404).send('401 - Administrator Access only.');
      return
    }
  } else {
    res.render("not_logged_in");
  }
});

// Registers a user
app.get("/register", (req, res) => {
    if (req.isLoggedIn){
      res.redirect('/urls');
      return
    }
    res.render('registration');
});

// ################ POST RESPONSES #####################################################

app.post("/register", (req, res) => {
    let email = req.body.email;
    let password = req.body.password;
    let passwordHashed = bcrypt.hashSync(password, 10);
    for (userID in users){
      if (users[userID]["email"] === email){
      res.status(400).send('Email already exists. Please enter new email');
      return
      }
    }
    if (email === "" || password === ""){
      res.status(400).send('E-mail and password fields cannot be empty');
      return
    } else {
    let userID = generateRandomString();
    req.session.userID = userID;
    users[userID] =
      {
        user: userID,
        email: email,
        password: passwordHashed
      };
    res.redirect('/urls');
    }
});

// Creates new short url and adds to database
app.post("/urls", (req, res) => {
  let longURL = req.body.longURL;
  let shortURL = generateRandomString(longURL);
  let user = req.session.userID;
  statInitializer(shortURL, longURL, user);
  res.redirect(`/urls/${shortURL}`);
});

// Updates with new long url provided
app.put("/urls/:id/update", (req, res) => {
  if (urlDatabase[req.params.id].user === req.session.userID){
    let shortURL = req.params.id;
    let updatedLongURL = req.body.update;
    urlDatabase[shortURL].url = updatedLongURL;
    res.redirect(`/urls/${shortURL}`);
  } else {
    res.status(400).send('401 - Only the administrator can edit this page.');
    return
  }
});

// Deletes entry from database
app.delete("/urls/:id/delete", (req, res) => {
  if (urlDatabase[req.params.id].user === req.session.userID){
    let shortURL = req.params.id;
    delete urlDatabase[shortURL];
    res.redirect("/urls");
  } else {
    res.status(400).send('401 - Administrator function only.');
    return
  }
});

// Generates login cookie
app.post("/login", (req, res) => {
  let email = req.body.email;
  let password = req.body.password;
  for (let userId in users){
    if (users[userId].email === email ){
      if (users[userId].email === email && bcrypt.compareSync(password,users[userId].password)) {
        req.session.userID = userId;
        res.redirect('/');
        return
      }
    }
  }
  res.status(403).send('Invalid e-mail or password');
  return;
});

// Deletes current cookie for login
app.post("/logout", (req, res) => {
  req.session = null;
  res.redirect("/urls");
});

app.listen(PORT);