let express = require('express');
let app = express();
const cookieParser = require('cookie-parser');
const PORT = process.env.PORT || 8080;

const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended: true}));

app.set("view engine", "ejs");
app.use(cookieParser());


function loginInfo(req){
//   if (req.cookies["username"]) {
//     return req.cookies["username"];
//   } else {
//     return { "username": undefined };
//   }
  if (req.cookies["user_id"]) {
    return req.cookies["user_id"];
  } else {
    return { "user_id": undefined };
  }
}

// Checks login status
function loginStatus(req){
  if (req.cookies["user_id"]) {
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


function statInitializer(shortURL){
  urlStats[shortURL]["date"] = new Date().toString().substring(0,15);
  urlStats[shortURL]["visits"] = 0;
  urlStats[shortURL]["uniqueCount"] = 0;
  urlStats[shortURL]["uniques"] = [];
  return
}

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

const users = {
  "user1": {
    id: "1",
    email: "1@example.com",
    password: "one"
  },
 "user2": {
    id: "2",
    email: "2@example.com",
    password: "two"
  }
}

//Populates stats for example sites. Can be removed if examples are removed.
// var be = 'b2xVn2'
// statInitializer('b2xVn2');
// statInitializer('9sm5xK');

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
  // if (loginStatus(req)){
  //   res.redirect("/urls");
  // } else {
  //   let templateVars = users;
    res.render("login_page");
  // }

});

// Main page listing URL database
app.get("/urls", (req, res) => {
  if (loginStatus(req)){
    let user = loginInfo(req);
    let status = loginStatus(req);
    console.log(user);
    let templateVars = { urls: urlDatabase, users: users, stats: urlStats, user_id: user };
    res.render("urls_index", templateVars);
    // console.log(urlStats);
  } else {
  res.render("not_logged_in");
  }
});

// Page for submitting URLS to shorten
app.get("/urls/new", (req, res) => {
  if (loginStatus(req)){
    let user = loginInfo(req);
    let templateVars = {user_id: user};
    res.render("urls_new", templateVars);
  } else {
    res.redirect("/login");
  }
});

// Directs to longURL (with error handling) & logs visit stats
app.get("/u/:shortURL", (req, res) => {
  let shortURL = req.params.shortURL;
  let longURL = urlDatabase[shortURL]
  var currentUser = loginInfo(req);
  let uniqueArr = urlStats[shortURL]["uniques"];
  // Logs unique visitors and # visits
  urlStats[shortURL]["visits"] += 1;
  uniques(uniqueArr, currentUser, shortURL);

  if (longURL.substring(0,7) === 'http://'){
    res.redirect(`${longURL}`);
  }
  else if (longURL.substring(0,4) === 'www.'){
    res.redirect(`http://${longURL}`);
  }
  else {
    res.redirect(`http://www.${longURL}`);
  }
});

// Update form for individual URL
app.get("/urls/:id", (req, res) => {
  if (loginStatus(req)){
    console.log(loginInfo(req));
    user = loginInfo(req);
    console.log(user);

    let shortURL = req.params.id;
    let longURL = urlDatabase[shortURL];
    let templateVars = { shortURL: shortURL, longURL: longURL, users: users, stats: urlStats, user_id: user };
    res.render("urls_show", templateVars);
  } else {
    res.render("not_logged_in");
  }
});

// Registers a user
app.get("/register", (req, res) => {
    res.render('registration');
});

// ################ POST RESPONSES ################

app.post("/register", (req, res) => {
    console.log(req.body);
    let email = req.body.email;
    let password = req.body.password;

    for (userID in users){
      if (users[userID]["email"] === email){
      res.status(400).send('Email already exists. Please enter new email');
      }
    }


    if (email === "" || password === ""){
      res.status(400).send('E-mail and password fields cannot be empty');
    } else {

    let userID = generateRandomString();
    users[userID] = {};
    users[userID]["id"] = userID;
    users[userID]["email"] = email;
    users[userID]["password"] = password;


    res.cookie("user_id", userID);
    console.log(users);
    res.redirect('/urls');

    }
});

// Updates with new long url provided
app.post("/urls/:id/update", (req, res) => {
  let id = req.params.id;
  let updatedLongURL = req.body.update;
  urlDatabase[id] = updatedLongURL;
  res.redirect(`/urls/${id}`);
});

// Generates a new short url and adds to database
app.post("/urls", (req, res) => {
    let today = new Date();
    let longURL = req.body.longURL;
    let shortURL = generateRandomString(longURL);
    urlStats[shortURL] = {};
    urlDatabase[shortURL] = longURL;
    statInitializer(shortURL);
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
  let email = req.body.email;
  let password = req.body.password;
  console.log(req.body.email);
  console.log(users);
  for (let userId in users){
    if (users[userId].email === email ){
      if (users[userId].email === email && users[userId].password === password){
        res.cookie("user_id", userId);
        res.redirect('/');
        break;
      }
    // } else {
    }
  }
      res.status(403).send('Invalid EMAIL or PASSWORD');

  // let userLogin = req.body.username;
  // res.cookie("username", userLogin);
  // res.redirect("/urls");
});

// Deletes current cookie for login
app.post("/logout", (req, res) => {
  res.clearCookie("user_id");
  res.redirect("/urls");
});

app.listen(PORT);