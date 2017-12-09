let express = require('express');
const methodOverride = require('method-override');
const cookieSession = require('cookie-session');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');

let app = express();
const PORT = process.env.PORT || 8080;

app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({extended: true}));
app.use(methodOverride('_method'));
app.use(cookieSession({
  name: 'session',
  keys: ['key1']
}));

app.use(function loginInfo(req, res, next) {
  res.locals.user = req.session.userID;
  req.user = req.session.userID;
  req.isLoggedIn = !!res.locals.user;
  res.locals.urls = urlDatabase;
  // if (!!res.locals.user){
    res.locals.users = users;
  // }
  next();
});

const urlDatabase = {
  "b2xVn2": {
    url: "http://www.lighthouselabs.ca",
    date: new Date().toString().substring(0,15),
    visits: 0,
    uniqueCount: 0,
    uniques: [],
    visitTag: []
  },
  "9sm5xK": {
    url: "http://www.google.com",
    date: new Date().toString().substring(0,15),
    visits: 0,
    uniqueCount: 0,
    uniques: [],
    visitTag: []
  }
};

const users = {};

// Determines if visitor is unique and logs it
function uniques(shortURL, currentUser) {
  let urlID = urlDatabase[shortURL];
  let array = urlID.uniques;
  let searchResult = array.find(user => user === currentUser);
  if (searchResult === undefined){
    urlID.uniqueCount += 1;
    urlID.uniques.push(currentUser);
  }
  return
}

function statLog(shortURL) {
  let urlID = urlDatabase[shortURL];
  // var currentUser = req.session.userID
  urlID.visits += 1;
  let date = new Date().toString().substring(0,15);
  let randomID = generateRandomString();
  urlID.visitTag.push(`${date} - Visitor# ${randomID}`);
}

function statInitializer(shortURL, longURL, user){
  day = new Date().toString().substring(0,15);
  urlDatabase[shortURL] =
    {
      date: new Date().toString().substring(0,15),
      visits: 0,
      uniqueCount: 0,
      uniques: [],
      user: user,
      url: longURL,
      visitTag:[]
    };
  return
}

function generateRandomString(){
  return Math.random().toString(16).slice(9);
}

// Creates customized user-specific URL database
function urlsForUser(id) {
  let userDB = {};
  for (urls in urlDatabase) {
    if (urlDatabase[urls].user === id){
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

// ################ GET RESPONSES ################

// ROOT page, checks login status
app.get("/", (req, res) => {
  if (req.isLoggedIn) {
    res.redirect('/urls');
    return;
  }
  else {
    res.redirect('/login');
  }
});

// Generates page for logging in. Redirects to /urls if already loggged in
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

// Page for submitting URLS to shorten
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
  let currentUser = req.session.userID;
  // Logs unique visitors and # visits
  statLog(shortURL);
  uniques(shortURL, currentUser);
  res.redirect(URLHandling(longURL));
});

// Update form for individual URL
app.get("/urls/:id", (req, res) => {
  let shortURL = req.params.id;
  if (!urlDatabase[shortURL]) {
    res.status(404).send('404 - Link not found.');
    return;
  }
  if (req.isLoggedIn){
    let templateVars = { shortURL: shortURL };
    res.render("urls_show", templateVars);
  } else {
    res.render("not_logged_in");
  }
});

// Registers a user
app.get("/register", (req, res) => {
    if (req.isLoggedIn){
      res.redirect('/urls');
    }
    res.render('registration');
});

// ################ POST RESPONSES ################

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
        email: email,
        password: passwordHashed
      };

    res.redirect('/urls');
    }
});

// Updates with new long url provided
app.put("/urls/:id/update", (req, res) => {
  if (urlDatabase[req.params.id].user === req.session.userID){
    let id = req.params.id;
    let updatedLongURL = req.body.update;
    urlDatabase[id].url = updatedLongURL;
    res.redirect(`/urls/${id}`);
  } else {
    res.status(400).send('400 - Only the administrator can edit this page');
    return
  }

});

// Generates a new short url and adds to database
app.post("/urls", (req, res) => {
  let longURL = req.body.longURL;
  let shortURL = generateRandomString(longURL);
  let user = req.session.userID;
  urlDatabase[shortURL] = {};
  urlDatabase[shortURL].url = longURL;
  statInitializer(shortURL, longURL, user);
  res.redirect(`/urls/${shortURL}`);
});

// Deletes entry from database
app.delete("/urls/:id/delete", (req, res) => {
  let id = req.params.id;
  delete urlDatabase[id];
  res.redirect("/urls");
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