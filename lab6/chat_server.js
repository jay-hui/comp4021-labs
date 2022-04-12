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
    if (!containWordCharsOnly(username)) {
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
    fs.writeFileSync("data/users.json", JSON.stringify(users, null, "\t"));
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

// create the socket.io server
const { createServer } = require("http");
const { Server } = require("socket.io");
const httpServer = createServer(app);
const io = new Server(httpServer);

// use the session in the socket.io server
io.use((socket, next) => {
    chatSession(socket.request, {}, next);
})

// a js object storing the online users
const onlineUsers = {};

io.on("connection", (socket) => {

    // add a new user to the online user list
    if (socket.request.session.user) {
        const { username, avatar, name } = socket.request.session.user;
        onlineUsers[username] = { avatar, name };

        // broadcast the signed-in user
        io.emit("add user", JSON.stringify(socket.request.session.user));
    }

    socket.on("disconnect", () => {

        // remove the user from the online user list
        if (socket.request.session.user) {
            const { username } = socket.request.session.user;
            if (onlineUsers[username]) delete onlineUsers[username];

            // broadcast the signed-out user
            io.emit("remove user", JSON.stringify(socket.request.session.user));
        }
    });

    // set up the get users event
    socket.on("get users", () => {

        // send the online users to the browser
        socket.emit("users", JSON.stringify(onlineUsers));
    });

    // set up the get messages event
    socket.on("get messages", () => {

        // send the chatroom messages to the browser
        const chatroom = JSON.parse(fs.readFileSync("data/chatroom.json", "utf-8"));
        socket.emit("messages", JSON.stringify(chatroom));
    })

    // set up the post message event
    socket.on("post message", (content) => {
        if (socket.request.session.user) {

            // create the message object
            let message = {
                user: socket.request.session.user,
                datetime: new Date(),
                content: content
            };

            // read the chatroom messages
            const chatroom = JSON.parse(fs.readFileSync("data/chatroom.json", "utf-8"));

            // add the message to the chatroom
            chatroom.push(message);

            // write the chatroom messages
            fs.writeFileSync("data/chatroom.json", JSON.stringify(chatroom, null, "\t"));

            // broadcast the new message
            io.emit("add message", JSON.stringify(message));
        }
    });

    // set up the typing event listener for "typing" event from socket.js
    socket.on("typing", () => {
        
        // checks existence of the current user
        if (socket.request.session.user) {

            // broadcasts the current user in json
            io.emit("typing", JSON.stringify(socket.request.session.user))
        }
    })
});

// Use a web server to listen at port 8000
httpServer.listen(8000, () => {
    console.log("The chat server has started...");
});
