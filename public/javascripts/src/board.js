$(document).ready(function() {
    
    $('#board').append('<div id="topics"></div>');

    var socket = io.connect('http://localhost:3000');
    
    socket.on('new_session', function(session) {
        socket.emit('create_session', session);
    });

    socket.on('get_new_user', function() {
        socket.emit('create_user',  prompt('What is your name?'));
    });

    //when the server has added a new user to the board.
    socket.on('insert_user', function(data) {
        $('#users').append('<li id="' + data.id  + '" class="bullet-item">' + data.username + '</li>');
    });

    //remove a user from the user list.
    socket.on('remove_user', function(id) {
        $('#' + id).remove();
    });

    socket.on('insert_reply', function(data) {
        var reply = '<div class="reply large-offset-1 small-offset-1 large-11 small-11 columns">';
        reply += data.reply + '  ~' + data.user;
        reply += '</div>';
        $('#grid' + data.topicId).append(reply);
    });

    //This will update the board when there is a new topic posted.
    socket.on('insert_topic', function(data) {
        var panelId = 'panel' + data.topicId;
        var panel = '<div class="topic row" id="topic'+ data.topicId + '"> <div class="panel" id="' + panelId + '">';
        panel += '<h3>' + data.topic + '</h3></div></div>';
        $('#topics').append(panel);

        //Add the form in which we can reply to the topic.
        var replyForm = '<div class="row collapse"><div class="large-9 small-9 columns"><input class="reply-input" type="text" data-id="' + data.topicId +'" id="input' + data.topicId + '"></div><div class="large-3 small-3 columns">';
        replyForm += '<input type="button" value="Reply" class="reply-button button postfix" data-id="' + data.topicId +'"></div></div>';
        $('#' + panelId).append(replyForm);

        //add the section for the replies,.
        $('#topic' + data.topicId).append('<div class="replies" id="grid' + data.topicId + '"></div>'); 

        socket.emit('create_reply_listener', data.topicId);
    });

    //DOM events
    $('#submitTopic').click(function() {
        socket.emit('add_topic', $('#topicInput').val());
    });

    $(document).on("keypress", ".reply-input", function(event) {
        if(event.which === 13) {
            event.preventDefault();
            var data = {};
            data.reply = $(this).val();
            data.topicId = $(this).data("id");
            socket.emit('add_reply', data);
        }
    });

    $(document).on('click','.reply-button', function(){
        var topicId = $(this).data('id');
        var data = {};
        data.reply = $('#input' + topicId).val();
        data.topicId = topicId;
        socket.emit('add_reply', data);
    });

    $("#topics").on("click", ".topic h3", function(){
        $(this).closest(".topic").find(".replies").slideToggle();
    });

    $("#topicInput").keypress(function(event) {
        if(event.which === 13) {
            socket.emit('add_topic', $(this).val());
        }
    });
});
