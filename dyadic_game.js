/*****************************************************************************/
/*********************************preparation*********************************/
/*****************************************************************************/

//set the port number
var my_port_number = 9001;

//generate a random participant ID
var participant_id = jsPsych.randomization.randomID(10);

//saving data
function save_data(name, data_in) {
    var url = "save_data.php";
    var data_to_send = {filename: name, filedata: data_in};
    fetch(url, {
        method: "POST",
        body: JSON.stringify(data_to_send),
        headers: new Headers({
            "Content-Type": "application/json",
        }),
    });
}

//save dyadic interaction data
function save_dyadic_interaction_data(data) {
    var data_to_save = [
        participant_id, //sender id?
        data.trial_index, //trial no.
        data.trial_type, //baseline condition or experimental condition
        data.meaning_stimuli, //the meaning pair the sender faced with
        data.signal_choice, //the signals  the sender faced with
        data.signal_selected, //which signal is selected
        
        data.partner_id, //receiver id?
        data.meaning_guess, //to guess the meaning of the signal

        data.rt, // maybe another criterion for data exclusion?（is this necessary?）
    ];
    
    var line = data_to_save.join(",") + "\n";
    var this_participant_filename = "di_" + participant_id + ".csv";
    save_data(this_participant_filename, line);
}

var write_headers = {
    type: "call-function",
    funct: function () {
        var this_participant_filename = "di_" + participant_id + ".csv";
        save_data(
            this_participant_filename,
            "partcipant_id, trial_index, trial_type, meaning_stimuli, signal_choice,\
            partner_id, meaning_guess, rt\n"
        );
    },
};

/*****************************************************************************/
/******************************starting the loop******************************/
/*****************************************************************************/
var start_interaction_loop = {type: "call-function", func: interaction_loop};

/*****************************************************************************/
/*******************************waiting section*******************************/
/*****************************************************************************/

//set a waiting room for the participant
function waiting_room() {
    var waiting_room_trial = {
        type: "html-button-response",
        stimulus: "You are in the waiting room...",
        choices: [],/////
        on_finish: function() {
            jsPsych.pauseExperiment();
        },
    };
    jsPsych.addNodeToEndOfTimeline(waiting_room_trial);
    jsPsych.resumeExperiment();
}

//set a waiting room for the partner
function waiting_for_partner() {
    end_waiting();
    var waiting_trial = {
        type: "html-button-response",
        stimulus: "Waiting for your partner...",
        choices: [],
        on_finish: function() {
            jsPsych.pauseExperiment();
        },
    };
    jsPsych.addNodeToEndOfTimeline(waiting_trial);
    jsPsych.resumeExperiment();
}

//end waiting
function end_waiting() {
    if (
        jsPsych.currentTrial().stimulus == "Waiting for your partner..." ||
        jsPsych.currentTrial().stimulus == "You are in the waiting room..."
    ) {
        jsPsych.finishTrial();
    }
}

/****************************Circumstances:***********************************/
/****************************start; drop-out; end*****************************/
/*****************************************************************************/

//start the trial after being paired by sending "complete" to server
function show_interaction_instruction() {
    end_waiting();
    var instruction_screen_interaction = {
        type: "html-button-response",
        stimulus:
        "<h3>Pre-interaction Instructions</h3>\
                                                    <p style='text-align: left'>Instructions for the interaction stage</p>",
        choice: ["Continue"],
        on_finish: function() {
            send_to_server({ response_type:"INTERACTION_INSTRUCTIONS_COMPLETE" });
            jsPsych.pauseExperiment();
        },
    };
}

//when one drops out
function drop_out() {
    end_waiting();
    var stranded_screen = {
        type: "html-button-response",
        stimulus: "<h3>Oh no! Something has gone wrong!</h3>\
                                        <p style='text-align:left'>Unfortunately it looks like something has gone wrong - sorry!</p>\
                                        <p style='text-align:left'>Clock continue to progress to the final screen and finish the experiment.</p>",
        choices: ["Continue"],
    };
    jsPsych.addNodeToEndOfTimeline(stranded_screen);
    end_experiment();
}

//end
function end_experiment() {
    var final_screen = {
        stimulus:
        "<h3>Finished!</h3>\
                            <p style='text-align:left'>You have completed your mission!</p>\
                            <p style='text-align:left'>You can get a reward by... </p>",
        choices: ["Continue"],
        on_finish: function() {
            close_socket();
            jsPsych.addNodeToEndOfTimeline();
        },
    };
    jsPsych.addNodeToEndOfTimeline(final_screen);
    jsPsych.resumeExperiment();
}

/*****************************************************************************/
/**********************sender (signal selection) trial************************/
/*****************************************************************************/

function sender_trial(signal_selected, partner_id) {
    end_waiting();
    if (meaning_stimuli == "belly", "author") {
        signal_choice = ["teloqulo", "ralonefi", "tewalapu", "towu", "loqi", "muho"];
    }
    var meaning_filename = "meanings/" + meaning_stimuli + ".txt"; //is this correct?
    var signal_choice;
    var n_clicks_required;
    var n_clicks_given = 0;

    //subtrial 1: presentation of meaning pair and signals as buttons in random order.
    var subtrial1 = {
        type: "html-button-response",
        stimulus: meaning_filename,
        prompt: "&nbsp;",
        choices: signal_choice,
        button_html:
            'button style = "visibility: hidden;" class = jspsych-btn">%choice%</button>',
        response_ends_trial: false,
        //do we need to specify the duration here?
    };

    //subtrial 2: click multiple times, one per signal syllable (or character?).
    var subtrial2 = {
        type: "html-button-response",
        stimulus: meaning_filename,
        prompt: "&nbsp;",
        choices: [],
        
        on_start: function(trial) {
            var shuffled_signal_choice = jsPsych.randomization.shuffle(signal_choice);
            trial.choices = shuffled_signal_choice;
            trial.data = {
                block: "production",
                signal_choice: shuffled_signal_choice,
            };
        },
        on_finish: function(data) {
            var button_number = data.response;
            var signal_pressed = data.signal_choice[button_number];
            data.signal_selected = signal_pressed;
            signal_selected = signal_pressed;
            n_clicks_required = signal_selected.length; //should this be the number of the characters or that of the syllables?
            data.trial_type = "sender";
            data.partner_id = partner_id;
            save_dyadic_interaction_data(data);
        },
    };

    //specify the number of clicks
    var single_click_trial = {
        type: "html-button-response",
        stimulus: meaning_filename,
        prompt: "",
        choices: [],

        on_start: function(trial) {
            trial.choices = [signal_selected],
            trial.prompt = "Click " + n_clicks_required + "times to send!";
        },
        on_finish: function() {
            n_clicks_given += 1;
        },
    };

    //set the loop
    var subtrial3 = {
        timeline: [single_click_trial],
        loop_function: function() {
            if (n_clicks_given < n_clicks_required) {
                return true;
            } else {
                return false;
            }
        },
    };

    //call-function: let the server know
    var message_to_server = {
        type: "call-function",
        func: function() {
            send_to_server({
                response_type: "RESPONSE",
                participant: participant_id,
                partner: partner_id,
                role: "Sender",
                meaning_pair: meaning_stimuli,
                response: signal_selected,
            });
            jsPsych.pauseExperiment();
        },
    };

    //connect the trials
    var trial = {
        timeline: [subtrial1, subtrial2, subtrial3, message_to_server],
    };
    jsPsych.addNodeToEndOfTimeline(trial);
    jsPsych.resumeExperiment();
}

/*****************************************************************************/
/*********************receiver (meaning guessing) trial***********************/
/*****************************************************************************/

function receiver_trial(meaning_guess, partner_id) {
    end_waiting();
    var meaning_choice = [meaning_stimuli];
    var trial = {
        type: "html-button-response",
        stimulus: meaning_stimuli, //the order of meanings within a pair should be randomized.
        choices: meaning_choice,
        button_html:
            'button class = "jspsych-btn"</button>',

        on_start: function(trial) {
            var shuffled_meaning_choice = jsPsych.randomization.shuffle(
                trial.choices
            );
            trial.choices = shuffled_meaning_choice;
            trial.data = {button_choices: shuffled_meaning_choice};
        },

        on_finish: function(data) {
            var button_number = data.response;
            data.trial_type = "receiver";
            data.meaning_guess = data.meaning_choice[button_number];
            data.partner_id = partner_id;
            save_dyadic_interaction_data(data);
            send_to_server({
                response_type: "RESPONSE",
                participant: participant_id,
                partner: partner_id,
                role: "Receiver",
                sender_signal: signal,
                response: data.meaning_guess,
            });
            jsPsych.pauseExperiment();
        },
    };
    jsPsych.addNodeToEndOfTimeline(trial);
    jsPsych.resumeExperiment();
}

/*****************************************************************************/
/******************************feedback screen********************************/
/*****************************************************************************/

function display_feedback(score) {
    end_waiting();
    if (score == 1) {
        var feedback_stimulus = "Correct!";
    } else {
        var feedback_stimulus = "Incorrect!";
    }
    var feedback_trial = {
        type: "html-button-response",
        stimulus: feedback_stimulus,
        chioces:[],
        trial_duration: 1500,
        on_finish: function() {
            send_to_server({
                response_type: "FINISHED_FEEDBACK"
            });
        },
    };
    jsPsych.addNodeToEndOfTimeline(feedback_trial);
    jsPsych.resumeExperiment();
}

/*****************************************************************************/
/*****************************instruction trials******************************/
/*****************************************************************************/

var consent_screen = {
    type: "html-button-response",
    stimulus:
        "<h3>Espionage Mission</h3>\
        <p style='text-align:left'>Information and consent sheet</p>",
    choices: ["Yes, I consent to participate"],
};

var instruction_screen_enter_waiting_room = {
    type: "html-button-response",
    stimulus:
        "<h3>Waiting for you partner...</h3>\
        <p style='text-align:left'>Once participant pass through this page, \
        it means they have connected to the server with their partners.</p>",
        choices: ["Continue"],
};

var preload_trial = {
    type: "preload",
    auto_preload: true,
};

/*****************************************************************************/
/*************************build and run the timeline**************************/
/*****************************************************************************/

var full_timeline = [].concat(
    consent_screen,
    preload_trial,
    write_headers,
    instruction_screen_enter_waiting_room,
    start_interaction_loop
);

jsPsych.init({
    timeline:full_timeline,
});