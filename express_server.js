let express = require('express');
let app = express();
const cookieParser = require('cookie-parser');
const PORT = process.env.PORT || 8080;

const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended: true}));

app.set("view engine", "ejs");
app.use(cookieParser());


function loginInfo(req){
  if (req.cookies["username"]) {
    return req.cookies["username"];
  } else {
    return { "username": undefined };
  }
}

// Checks login status
function loginStatus(req){
  if (req.cookies["username"]) {
    return true;
  } else {
    return false;
  }
}

function generateRandomString(){
  return Math.random().toString(16).slice(9);
}

// Determines if visitor is unique and logs it
function uniques(array, currentUser, id){
  let searchResult = array.find(user => user === currentUser);
  if (searchResult === undefined){
    urlStats[id]["uniqueCount"] += 1;
    urlStats[id]["uniques"].push(currentUser);
  }
  return
}

let urlDatabase = {
  "b2xVn2": "http://www.lighthouselabs.ca",
  "9sm5xK": "http://www.google.com"
};

let urlStats = {
  'b2xVn2': {
    date: new Date().toString().substring(0,15),
    visits: 0,
    uniqueCount: 0,
    uniques: []
  },
  '9sm5xK': {
    date: new Date().toString().substring(0,15),
    visits: 0,
    uniqueCount: 0,
    uniques: []
}
};

// ################ GET RESPONSES ################


// ROOT page, checks login status
app.get("/", (req, res) => {
  if (loginStatus(req)){
    res.redirect('/urls');
  }
  // NOT COMPLETED
  else {
    res.redirect('/login');
  }
});

// Generates page for logging in. Redirects to /urls if already loggged in
app.get("/login", (req, res) => {
  if (loginStatus(req)){
    res.redirect("/urls");
  } else {
    let templateVars = loginInfo(req);
    // console.log(templateVars);
    res.render("login_page", templateVars);
  }
});

// Main page showing current list of urls with shortened & long urls
app.get("/urls", (req, res) => {
  if (loginStatus(req)){
    let templateVars = { urls: urlDatabase, username: req.cookies["username"], stats: urlStats };
    res.render("urls_index", templateVars);
    // console.log(loginInfo(req));
    console.log(urlStats);
  } else {
  res.render("not_logged_in");
  }
});

// Page for users to submit new long urls for shortening
app.get("/urls/new", (req, res) => {
  if (loginStatus(req)){
    let user = loginInfo(req);
    let templateVars = { username: user };
    res.render("urls_new", templateVars);
  } else {
    res.redirect("/login");
  }
});

// Logging stats when user visits shortened url
app.get("/u/:shortURL", (req, res) => {
  let shortURL = req.params.shortURL;
  let longURL = urlDatabase[shortURL]
  urlStats[shortURL]["visits"] += 1;
  // console.log(urlStats["users"]);
  var currentUser = loginInfo(req);
  let uniqueArr = urlStats[shortURL]["uniques"];
  uniques(uniqueArr, currentUser, shortURL);
  // let searchResult = urlStats[shortURL]["uniques"].find(user => user === currentUser);
  // if (searchResult === undefined){
  //   urlStats[shortURL]["uniqueCount"] += 1;
  //   urlStats[shortURL]["uniques"].push(currentUser);
  // }
  console.log(longURL.substring(0,7));
  if (longURL.substring(0,7) === 'http://'){
    res.redirect(`${longURL}`);
  } else {
    res.redirect(`http://${longURL}`);
  }
});

app.get("/urls/:id", (req, res) => {
  if (loginStatus(req)){
    console.log(loginInfo(req));
    let shortURL = req.params.id;
    // console.log(urlDatabase[shortURL + "time"]);
    let longURL = urlDatabase[shortURL];
    let templateVars = { shortURL: shortURL, longURL: longURL, username: req.cookies["username"] };
    res.render("urls_show", templateVars);
  } else {
    res.render("not_logged_in");
  }
});

// ################ POST RESPONSES ################

// Updates with new long url provided
app.post("/urls/:id/update", (req, res) => {
  let id = req.params.id;
  let updatedLongURL = req.body.update;
  urlDatabase[id] = updatedLongURL;
  res.redirect(`/urls/${id}`);
});

// Generates a new short url and adds to database
app.post("/urls", (req, res) => {
    // console.log(req.params);
    // console.log(req.body);
    let today = new Date();
    let longURL = req.body.longURL;
    let shortURL = generateRandomString(longURL);
    urlStats[shortURL] = {};
    urlDatabase[shortURL] = longURL;
    // console.log(today);
    urlStats[shortURL]["date"] = today.toString().substring(0,15);
    urlStats[shortURL]["visits"] = 0;
    urlStats[shortURL]["uniqueCount"] = 0;
    urlStats[shortURL]["uniques"] = [];
    res.redirect(`/urls/${shortURL}`);
});

// Deletes entry from database
app.post("/urls/:id/delete", (req, res) => {
  let id = req.params.id;
  delete urlDatabase[id];
  res.redirect("/urls");
});

// Generates login cookie
app.post("/login", (req, res) => {
  let userLogin = req.body.username;
  // console.log(req.body);
  res.cookie("username", userLogin);
  // console.log(res.cookies)
  res.redirect("/urls");
});

// Deletes current cookie for login
app.post("/logout", (req, res) => {
  res.clearCookie("username")
  res.redirect("/urls");
});

app.listen(PORT);

