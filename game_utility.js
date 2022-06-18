var ws;

function interaction_loop() {
    jsPsych.pauseExperiment()
    ws = new WebSocket("ws://jspsychlearning.ppls.ed.ac.uk:" + my_port_number)

    //server needs to know participant id
    ws.onopen = function() {
        console.log("opening websocket");
        details = JSON.stringify({response_type: 'CLIENT_INFO', client_info: participant_id})
        ws.send(details)
    };

    //on receiving a message from the server...
    ws.onmessage = function(e) {
        console.log("received message: " + e.data);
        var cmd = JSON.parse(e.data)
        var cmd_code = cmd.command_type
        handle_server_command(cmd_code, cmd)
    }

    //on closing the connection, we log the message in console and close.
    ws.onclose = function() {
        console.log("closing websocket");
        ws.close();
    };

    //faced with an error
    ws.onerror = function(e) {
        console.log(e)
        partner_dropout()
    };
}


//command_code
function handle_server_command(command_code, command) {
    var possible_commands = ["PartnerDropout", "EndExperiment", "WaitingRoom",
                             "Instructions", "Director", "WaitForPartner", "Matcher", "Feedback"]
    if (possible_commands.indexOf(command_code) == -1) {
        console.log("Received invalid code")
    }

    else {
        switch(command_code) {
            case "PartnerDropout":
                partner_dropout()
                break;
            case "EndExperiment":
                end_experiment()
                break;
            case "WaitingRoom":
                waiting_room()
                break;
            case "Instructions":
                show_interaction_instructions()
                break;
            case "WaitForPartner":
                waiting_for_partner()
                break;
            case "Sender":
                sender_trial(command.signal_selected, command.partner_id) //is this step sending the sender's response?
                break;
            case "Receiver":
                receiver_trial(command.meaning_guess, command.partner_id) //is this step sending the receiver's guess?
                break;
            case "Feedback":
                display_feedback(command.score)
                break;
            
            default:
                console.log('oops, default fired')
                break;
        }
    }
}

function send_to_server(message_meaning){
    if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify(message_meaning))
    }
}

function close_socket(){
    ws.onclose()
}
