/**
 * This will contain the route for the boards.
 */
var uuid = require('uuid');
var Firebase = require('firebase');
var sessionRoot = new Firebase('https://gingertech.firebaseio.com/message_board_app');
module.exports = function(io) {
    var board = {};
    board.board = function(request, response) {
        if ((sessionToken = request.params.sessionParam)) {
            var sessions = {};
            sessions[sessionToken] = sessionToken;
            sessionRoot.child(sessionToken).on('value', function(data) {
                response.render('board', {session: sessionToken});
            });
        } else {
            response.redirect('/board/' + uuid.v4());
        }
    };
    return board;
};
