
/**
 * Module dependencies.
 */

var sanitize = require('validator').sanitize;
var express = require('express');
var routes = require('./routes');
var user = require('./routes/user');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
var path = require('path');
var uuid = require('uuid');
var _ = require('underscore');
var configFirebase = require('config').firebase;
var configServer = require('config').server;
var session;

//set up the data store
var Firebase = require('firebase');
//The root of firebase;
var fireRoot = new Firebase(configFirebase.url);

//start the server;
server.listen(configServer.port, function() {
    console.log('Server listening on on port ' + configServer.port);
});

//The routes.
var routes = require('./routes'),
    user = require('./routes/user'),
    board = require('./routes/board')(io);

// all environments
app.set('port', process.env.PORT || configServer.port);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.set('view options', {layout: true});
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(app.router);
app.use(require('less-middleware')({ src: path.join(__dirname, 'public') }));
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' === app.get('env')) {
  app.use(express.errorHandler());
}

//The routes.
app.get('/', routes.index);
app.get('/users', user.list);
app.get('/board', function(request, response) {
    var sessionToken = uuid.v4();
    response.redirect('/board/' + sessionToken);
});
app.get('/board/:sessionParam', function(request, response) {
    var sessionToken = request.params.sessionParam;
    session = sessionToken;
    response.render('board', {session: sessionToken});
});

//The user information.
var usernames = {};

//Config the transports.
io.set('transports', ['xhr-polling']);
//The io events.
io.sockets.on('connection', function(socket) {
 
    /**
     * This is where Firebase node refrences are kept.
     */

    //Store the session node.
    var fireSession;

    //This is where we set the current users for this socket.
    var fireUsers;

    //Stores the refrence to the board that has multipule topics.
    var fireBoard;

    //Stores a list of topics.
    var fireTopics = {};

    /**
     * Fire data change events.
     */
 
    //Update the users when a user has joined or left.
    var addUser = function(snapShot) {
        var data = {};
        data.id = snapShot.name();
        data.username = snapShot.val();
        socket.emit('insert_user', data); 
    };

    var removeUser = function(snapShot) {
        socket.emit('remove_user', snapShot.name());
    };

    //This will check if there are any more users for the session, if not
    //delete all the data for that session.
    var checkUserCount = function(snapShot) {
        //If no more users for this session, remove all data
        //in this session from firebase.
        if (snapShot.val() === null) {
           fireRoot.child(socket.sessionToken).remove(function(error) {
                if (error){
                    console.log(error);
                } else {
                    console.log("Session has ended, all data removed.");
                }
           }); 
        }

    };

    // Update the board when a topic has been added or removed.
    var addTopic = function(snapShot) {
        if (snapShot.val() === null) {
            console.log("No Topic Found");
        } else {
            var data = {}; 
            data.user = socket.username;
            data.topic = snapShot.val().topic;
            data.topicId = snapShot.name(); 
            socket.emit('insert_topic', data);
        }
    };

    //Update the board message
    var addReply = function(snapShot) {
        var data = {};
        data.reply = snapShot.val().reply;
        data.user = snapShot.val().user;
        data.topicId = snapShot.val().topicId;
        socket.emit('insert_reply', data);
    };

    /**
     * The socket events.
     */

    //upon connection, set up the session
    socket.emit('new_session',  session);

    //Set up all the variables and nodes when a user joins.
    socket.on('create_session', function(session) {
        if (session) {
            fireSession = fireRoot.child(session);
            fireUsers = fireSession.child('users');
            fireUsers.on('child_added', addUser);
            fireUsers.on('child_removed', removeUser);
            fireUsers.on('value', checkUserCount);
            fireBoard = fireSession.child('topics');
            fireBoard.on('child_added', addTopic);
            socket.sessionToken = session;
            socket.emit('get_new_user');
        }
    });

    //Update the users on the board.
    socket.on('create_user', function(username) {
        socket.username = sanitize(username).escape();
        socket.userToken = fireUsers.push(socket.username).name();
    });

    //remove the user upon disconnection
    socket.on('disconnect', function() {
        if (socket.userToken) {
            fireUsers.child(socket.userToken).remove(function(error) {
                if (error) {
                    console.log(error);
                }
                fireUsers.off('child_added', addUser);
                fireUsers.off('child_removed', removeUser);
                fireUsers.off('value', checkUserCount);
                fireBoard.off('child_added', addTopic);
            });
        }
    });

    //When a new topic item is created.
    socket.on('add_topic', function(message) {
        var cleaned = sanitize(message).escape();
        fireBoard.push({topic: cleaned});
    });

    //This will store the data to firebase when a reply to a topic is made.
    socket.on('add_reply', function(data) {
        var reply = {};
        reply.reply = sanitize(data.reply).escape();
        reply.user = socket.username;
        reply.topicId = data.topicId;
        fireTopics[data.topicId].push(reply);
    });

    //This will create a listener when a reply is inserted on the client side.
    socket.on('create_reply_listener', function(topicId) {
        fireTopics[topicId] = fireBoard.child(topicId).child('replies');
        fireTopics[topicId].on('child_added', addReply); 
    });
});
