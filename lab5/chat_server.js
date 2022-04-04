const express = require("express");

const bcrypt = require("bcrypt");
const fs = require("fs");
const session = require("express-session");

// Create the Express app
const app = express();

// Use the 'public' folder to serve static files
app.use(express.static("public"));

// Use the json middleware to parse JSON data
app.use(express.json());

// Use the session middleware to maintain sessions
const chatSession = session({
    secret: "game",
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: { maxAge: 300000 }
});
app.use(chatSession);

// This helper function checks whether the text only contains word characters
function containWordCharsOnly(text) {
    return /^\w+$/.test(text);
}

// Handle the /register endpoint
app.post("/register", (req, res) => {
    // Get the JSON data from the body
    const { username, avatar, name, password } = req.body;

    //
    // D. Reading the users.json file
    //
    const users = JSON.parse(fs.readFileSync("data/users.json"));
    //
    // E. Checking for the user data correctness
    //
    // - username, avatar, name and password cannot be empty
    if (!username || !avatar || !name || !password) {
        res.json({
            status: "error",
            error: "Username/avatar/name/password cannot be empty."
        });
        return;
    }
    // - username only contains underscores, letters or numbers
    if (containWordCharsOnly(username)) {
        res.json({
            status: "error",
            error: "Username can only contain underscores, letters or numbers."
        });
        return;
    }
    // - username does not exist in the current list of users
    if (username in users) {
        res.json({
            status: "error",
            error: "Username already exists."
        });
        return;
    }
    //
    // G. Adding the new user account
    //
    users[username] = { avatar, name, password: bcrypt.hashSync(password, 10) }
    //
    // H. Saving the users.json file
    //
    fs.writeFileSync("data/users.json", JSON.stringify(users, null, " "))
    //
    // I. Sending a success response to the browser
    //
    res.json({ status: "success" });
});

// Handle the /signin endpoint
app.post("/signin", (req, res) => {
    // Get the JSON data from the body
    const { username, password } = req.body;

    //
    // D. Reading the users.json file
    //
    const users = JSON.parse(fs.readFileSync("data/users.json"));
    //
    // E. Checking for username/password
    //
    if (username in users) {
        let user = users[username];
        if (bcrypt.compareSync(password, user.password)) {
            //
            // G. Sending a success response with the user account
            //
            req.session.user = { username, avatar: user.avatar, name: user.name };
            res.json({
                status: "success",
                user: { username, avatar: user.avatar, name: user.name }
            })
            return;
        }
    }
    res.json({
        status: "error",
        error: "Incorrect username/password."
    });
});

// Handle the /validate endpoint
app.get("/validate", (req, res) => {

    //
    // B. Getting req.session.user
    //
    if (!req.session.user) {
        res.json({
            status: "error",
            error: "You have not signed in."
        });
        return;
    }
    //
    // D. Sending a success response with the user account
    //
    let user = req.session.user;
    res.json({
        status: "success",
        user: { username: user.username, avatar: user.avatar, name: user.name }
    })
});

// Handle the /signout endpoint
app.get("/signout", (req, res) => {

    //
    // Deleting req.session.user
    //
    if (req.session.user) delete req.session.user;
    //
    // Sending a success response
    //
    res.json({ status: "success" });
});


//
// ***** Please insert your Lab 6 code here *****
//


// Use a web server to listen at port 8000
app.listen(8000, () => {
    console.log("The chat server has started...");
});
