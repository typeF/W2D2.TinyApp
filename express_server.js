let express = require('express');
let app = express();
const methodOverride = require('method-override');
const cookieSession = require('cookie-session');
const PORT = process.env.PORT || 8080;

const bcrypt = require('bcrypt');

const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended: true}));

app.set("view engine", "ejs");
// app.use(cookieParser());

app.use(methodOverride('_method'));

app.use(cookieSession({
  name: 'session',
  keys: ['key1', 'key2']
}));

function loginInfo(req){
  if (req.session.userID) {
    return req.session.userID;
  } else {
    return { "user_id": false };
  }
}

// Checks login status
function loginStatus(req){
  if (req.session.userID) {
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
    urlDatabase[id]["uniqueCount"] += 1;
    urlDatabase[id]["uniques"].push(currentUser);
  }
  return
}

function statLog(urlID, user) {
  let date = new Date().toString().substring(0,15);
  let randomID = generateRandomString();
  urlID.visitTag.push(`${date} - Visitor# ${randomID}`);
}

// urlDatabase[shortURL];

let urlDatabase = {
  "b2xVn2": {
    url: "http://www.lighthouselabs.ca",
    date: new Date().toString().substring(0,15),
    visits: 0,
    uniqueCount: 0,
    uniques: []
  },
  "9sm5xK": {
    url: "http://www.google.com",
    date: new Date().toString().substring(0,15),
    visits: 0,
    uniqueCount: 0,
    uniques: []
  }
};

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

function urlsForUser(id) {
  let userDB = {};
  for (urls in urlDatabase) {
    if (urlDatabase[urls].user === id){
      userDB[urls] = {};
      userDB[urls] = urlDatabase[urls];
    }
  }
  return userDB;
}

const users = {};
//   "user1": {
//     id: "1",
//     email: "1@example.com",
//     password: "one"
//   },
//  "user2": {
//     id: "2",
//     email: "2@example.com",
//     password: "two"
//   }
// }


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
      res.redirect('/urls');
    }
    res.render("login_page");
});

// Main page listing URL database
app.get("/urls", (req, res) => {
  if (loginStatus(req)){
    let user = loginInfo(req);
    let status = loginStatus(req);
    console.log(users);
    console.log(urlDatabase);
    let userDB = urlsForUser(user);
    // console.log(userDB);
    let templateVars = { urls: userDB, users: users, user_id: user };
    res.render("urls_index", templateVars);
    // console.log(urlStats);
  } else {
    // let user = loginInfo(req);
    // console.log(user);
    let templateVars = { user_id: undefined };
    res.render("not_logged_in", templateVars);
  }
});

// Page for submitting URLS to shorten
app.get("/urls/new", (req, res) => {
  if (loginStatus(req)){
    let user = loginInfo(req);
    let templateVars = {users: users, user_id: user};
    res.render("urls_new", templateVars);
  } else {
    res.redirect("/login");
  }
});

// Directs to longURL (with error handling) & logs visit stats
app.get("/u/:shortURL", (req, res) => {
  let shortURL = req.params.shortURL;
  let urlID = urlDatabase[shortURL];
  if (!urlID) {
    res.status(404).send('404 - Link not found.');
  }
  let longURL = urlID.url;
  var currentUser = loginInfo(req);
  let uniqueArr = urlID.uniques;
  // Logs unique visitors and # visits
  urlID.visits += 1;
  statLog(urlID, currentUser);
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
  let shortURL = req.params.id;
  if (!urlDatabase[shortURL]) {
    res.status(404).send('404 - Link not found.');
  }
  let longURL = urlDatabase[shortURL].url;

  if (loginStatus(req)){
    // console.log(loginInfo(req));
    user = loginInfo(req);
    // console.log(user);

    // console.log(urlDatabase);
    // console.log(urlDatabase[shortURL].user);
    console.log(users);
    let templateVars = { shortURL: shortURL, longURL: longURL, users: users, user_id: user, urls: urlDatabase };
    res.render("urls_show", templateVars);
  } else {
    let templateVars = { user_id: undefined };
    res.render("not_logged_in", templateVars);
  }
});

// Registers a user
app.get("/register", (req, res) => {
    if (loginStatus(req)){
      res.redirect('/urls');
    }
    res.render('registration');
});

// ################ POST RESPONSES ################

app.post("/register", (req, res) => {
    console.log(req.body);
    let email = req.body.email;
    let password = req.body.password;
    let passwordHashed = bcrypt.hashSync(password, 10);

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
    req.session.userID = userID;
    // users[userID]["id"] = userID;
    users[userID]["email"] = email;
    users[userID]["password"] = passwordHashed;


    // res.cookie("user_id", userID);
    console.log(users);
    res.redirect('/urls');

    }
});

// Updates with new long url provided
app.put("/urls/:id/update", (req, res) => {
  let id = req.params.id;
  let updatedLongURL = req.body.update;
  urlDatabase[id].url = updatedLongURL;
  res.redirect(`/urls/${id}`);
});

// Generates a new short url and adds to database
app.post("/urls", (req, res) => {
    let longURL = req.body.longURL;
    let shortURL = generateRandomString(longURL);
    let user = req.session.userID;
    urlDatabase[shortURL] = {};
    urlDatabase[shortURL].url = longURL;
    console.log(urlDatabase);

    statInitializer(shortURL, longURL, user);
    console.log(urlDatabase);

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
  console.log(req.body.email);
  console.log(users);
  for (let userId in users){
    if (users[userId].email === email ){
      if (users[userId].email === email && bcrypt.compareSync(password,users[userId].password)) {
        req.session.userID = userId;
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
  // res.clearCookie("user_id");
  req.session = null;
  res.redirect("/urls");
});

app.listen(PORT);


























// let express = require('express');
// let app = express();
// const cookieSession = require('cookie-session');
// const PORT = process.env.PORT || 8080;

// const bcrypt = require('bcrypt');

// const bodyParser = require('body-parser');
// app.use(bodyParser.urlencoded({extended: true}));

// app.set("view engine", "ejs");
// // app.use(cookieParser());

// app.use(cookieSession({
//   name: 'session',
//   keys: ['key1', 'key2']
// }));

// function loginInfo(req){
//   if (req.session.userID) {
//     return req.session.userID;
//   } else {
//     return { "user_id": undefined };
//   }
// }

// // Checks login status
// function loginStatus(req){
//   if (req.session.userID) {
//     // console.log(req.session.userID);
//     // console.log("You're logged in");
//     return true;
//   } else {
//     // console.log(req.session.userID);
//     return false;
//   }
// }

// function generateRandomString(){
//   return Math.random().toString(16).slice(9);
// }

// // Determines if visitor is unique and logs it
// function uniques(array, currentUser, id){
//   let searchResult = array.find(user => user === currentUser);
//   if (searchResult === undefined){
//     urlDatabase[id]["uniqueCount"] += 1;
//     urlDatabase[id]["uniques"].push(currentUser);
//   }
//   return
// }

// let urlDatabase = {
//   "b2xVn2": {
//     url: "http://www.lighthouselabs.ca",
//     date: new Date().toString().substring(0,15),
//     visits: 0,
//     uniqueCount: 0,
//     uniques: []
//   },
//   "9sm5xK": {
//     url: "http://www.google.com",
//     date: new Date().toString().substring(0,15),
//     visits: 0,
//     uniqueCount: 0,
//     uniques: []
//   }
// };


// function statInitializer(shortURL, user){
//   urlDatabase[user] = {
//       date: new Date().toString().substring(0,15),
//       visits: 0,
//       uniqueCount: 0,
//       uniques:[],
//       user: user
//   };
//   return
// }


// function urlsForUser(id) {
//   let userDB = {};
//   for (urls in urlDatabase) {
//     if (urlDatabase[urls].user === id){
//       userDB[urls] = {};
//       userDB[urls] = urlDatabase[urls];
//     }
//   }
//   return userDB;
// }

// const users = {
//   "user1": {
//     id: "1",
//     email: "1@example.com",
//     password: "one"
//   },
//  "user2": {
//     id: "2",
//     email: "2@example.com",
//     password: "two"
//   }
// }

// //Populates stats for example sites. Can be removed if examples are removed.
// // var be = 'b2xVn2'
// // statInitializer('b2xVn2');
// // statInitializer('9sm5xK');

// // ################ GET RESPONSES ################

// // ROOT page, checks login status
// app.get("/", (req, res) => {
//   if (loginStatus(req)){
//     res.redirect('/urls');
//   }
//   // NOT COMPLETED
//   else {
//     res.redirect('/login');
//   }
// });

// // Generates page for logging in. Redirects to /urls if already loggged in
// app.get("/login", (req, res) => {
//   // if (loginStatus(req)){
//   //   res.redirect("/urls");
//   // } else {
//   //   let templateVars = users;
//     res.render("login_page");
//   // }

// });

// // Main page listing URL database
// app.get("/urls", (req, res) => {
//   if (loginStatus(req)){
//     let user = loginInfo(req);
//     console.log(`user from logininfo is ${user}`);
//     let status = loginStatus(req);
//     // console.log(user);
//     // console.log(urlDatabase);
//     let userDB = urlsForUser(user);
//     console.log(userDB);
//     let templateVars = { urls: userDB, users: users, user_id: user };
//     res.render("urls_index", templateVars);
//     // console.log(urlStats);
//   } else {
//   res.render("not_logged_in");
//   }
// });

// // Page for submitting URLS to shorten
// app.get("/urls/new", (req, res) => {
//   if (loginStatus(req)){
//     let user = loginInfo(req);
//     let templateVars = {user_id: user};
//     res.render("urls_new", templateVars);
//   } else {
//     res.redirect("/login");
//   }
// });

// // Directs to longURL (with error handling) & logs visit stats
// app.get("/u/:shortURL", (req, res) => {
//   let shortURL = req.params.shortURL;
//   let longURL = urlDatabase[shortURL].url;
//   var currentUser = loginInfo(req);
//   let uniqueArr = urlDatabase[shortURL]["uniques"];
//   // Logs unique visitors and # visits
//   urlDatabase[shortURL]["visits"] += 1;
//   uniques(uniqueArr, currentUser, shortURL);

//   if (longURL.substring(0,7) === 'http://'){
//     res.redirect(`${longURL}`);
//   }
//   else if (longURL.substring(0,4) === 'www.'){
//     res.redirect(`http://${longURL}`);
//   }
//   else {
//     res.redirect(`http://www.${longURL}`);
//   }
// });

// // Update form for individual URL
// app.get("/urls/:id", (req, res) => {
//   if (loginStatus(req)){
//     console.log(loginInfo(req));
//     user = loginInfo(req);
//     console.log(user);

//     let shortURL = req.params.id;
//     let longURL = urlDatabase[shortURL].url;
//     let templateVars = { shortURL: shortURL, longURL: longURL, users: users, user_id: user, urls: urlDatabase };
//     res.render("urls_show", templateVars);
//   } else {
//     res.render("not_logged_in");
//   }
// });

// // Registers a user
// app.get("/register", (req, res) => {
//     res.render('registration');
// });

// // ################ POST RESPONSES ################

// app.post("/register", (req, res) => {
//     console.log(req.body);
//     let email = req.body.email;
//     let password = req.body.password;
//     let passwordHashed = bcrypt.hashSync(password, 10);

//     for (userID in users){
//       if (users[userID]["email"] === email){
//       res.status(400).send('Email already exists. Please enter new email');
//       }
//     }


//     if (email === "" || password === ""){
//       res.status(400).send('E-mail and password fields cannot be empty');
//     } else {

//     let userID = generateRandomString();
//     users[userID] = {};
//     // users[userID].user_id = userID;
//     req.session.userID = userID;
//     console.log("active session");
//     console.log(req.session.userID);
//     users[userID].email = email;
//     users[userID].password = passwordHashed;
//     console.log(users);
//     res.redirect('/urls');

//     }
// });

// // Updates with new long url provided
// app.post("/urls/:id/update", (req, res) => {
//   let id = req.params.id;
//   let updatedLongURL = req.body.update;
//   urlDatabase[id] = updatedLongURL;
//   res.redirect(`/urls/${id}`);
// });

// // Generates a new short url and adds to database
// app.post("/urls", (req, res) => {
//     let longURL = req.body.longURL;
//     let shortURL = generateRandomString(longURL);
//     let user = req.session.userID;
//     urlDatabase[shortURL] = {};
//     urlDatabase[shortURL].url = longURL;
//     statInitializer(shortURL, user);
//     res.redirect(`/urls/${shortURL}`);
// });

// // Deletes entry from database
// app.post("/urls/:id/delete", (req, res) => {
//   let id = req.params.id;
//   delete urlDatabase[id];
//   res.redirect("/urls");
// });

// // Generates login cookie
// app.post("/login", (req, res) => {
//   let email = req.body.email;
//   let password = req.body.password;
//   console.log(req.body.email);
//   console.log(users);
//   for (let userId in users){
//     if (users[userId].email === email ){
//       if (users[userId].email === email && bcrypt.compareSync(password,users[userId].password)) {
//         res.cookie("user_id", userId);
//         res.redirect('/');
//         break;
//       }
//     }
//   }
//       res.status(403).send('Invalid EMAIL or PASSWORD');
// });

// // Deletes current cookie for login
// app.post("/logout", (req, res) => {
//   req.session = null;
//   res.redirect("/urls");
// });

// app.listen(PORT);