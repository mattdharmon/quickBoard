$(document).ready(function() {
    $('#create_custom_button').on('click', function() {
        var customValue = $('#create_custom_board').val();
        if(customValue !== null || customValue !== '') {
            window.location = '/board/' + customValue;
        } else {
            window.location =  '/board';
        }
    });
});
