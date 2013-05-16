// Set up a collection to contain player information. On the server,
// it is backed by a MongoDB collection named "players".


getCurrentDateString = function () {
    da = new Date();	// Create a Date Object set to the last modifed date
    db = da.toGMTString();	// Convert to a String in "predictable formt"
    dc = db.split(" ");	// Split the string on spaces
    if (eval(dc[3]) < 1970) dc[3] = eval(dc[3]) + 100;	// Correct any date purporting to be before 1970
    db = dc[1] + " " + dc[2] + " " + dc[3];	// Ignore day of week and combine date, month and year
    return db;	// Display the result
}

Players = new Meteor.Collection("players");
Logs = new Meteor.Collection("logs");
Questions = new Meteor.Collection("questions");

// Collection is not db mapped
Answers = new Meteor.Collection(null);

if (Meteor.isClient) {

    Template.leaderboard.writeLog = function (thename, thescore, themessage) {
        var d = new Date();
        Logs.insert({zeitpunkt: getCurrentDateString() + " " + d.toLocaleTimeString(), name: thename, score: thescore, message: themessage});
    }

    Accounts.ui.config({
        requestPermissions: {
            github: ['user', 'repo']
        },
        passwordSignupFields: 'USERNAME_AND_OPTIONAL_EMAIL'
    });

    Meteor.autorun(function () {
        if (Meteor.user()) {

            var user = Meteor.user();
            if (user.profile) {
                username = user.profile.name;
            } else {
                username = user.username;
            }
            
            var dbuser = Players.findOne({name: username});
            if (!dbuser) {
                Players.insert({name: username, score: 10});
                dbuser = Players.findOne({name: username});
                Template.leaderboard.writeLog(dbuser.name, dbuser.score, "has registered");
            }
            userId = dbuser._id;

        } else {
            userId = null;
        }
    });


    Template.ranking.players = function () {
        return Players.find({}, {limit: 10, sort: {score: -1, name: 1}});
    };

    Template.activities.logs = function () {
        return Logs.find({}, { limit: 10, sort: {zeitpunkt: -1}});
    };

    Template.question.answers = function () {
        return Answers.find({}, {});
    };


    Template.questions.questions = function () {
        var count = Questions.find({}, {}).count();
        var rp = Math.floor(Math.random() * count);
        console.log("rp: " + rp + " count:" + count);
        var selectedQuestion = Questions.findOne({}, { limit: 1, sort: {id: -1}, skip: rp });

        var pn = Array();

        for (var propName in selectedQuestion) {
            console.log("Iterating through prop with name>", propName, "< its value is ", selectedQuestion[propName]);
        }

        for (var propName in selectedQuestion) {
            pn.push(propName);
            console.log("Iterating through prop with name>", propName, "< its value is ", selectedQuestion[propName]);
        }

        for (var propName in pn) {
            console.log("Iterating through prop with name>", propName, "< its value is ", pn[propName]);
            console.log("Iterating through prop with name>", propName, "< its value is ", selectedQuestion[ pn[propName] ]);
        }

        var theAnswers = selectedQuestion[ 'answers' ];
        if (selectedQuestion) {

            var temp = theAnswers[0];
            var randfn = function (left, right) {
                return Math.floor(Math.random() * 3) - 1;
            };
            theAnswers.sort(randfn);
            theAnswers.sort(randfn);
            theAnswers.sort(randfn);
            theAnswers.sort(randfn);

            selectedQuestion[ 'answers' ] = theAnswers;
        }
        Session.set("selected_question", selectedQuestion);
        Session.set("correct_answer", temp);
        Session.set("selected_answer", "");

        Answers.remove({});

        for (var i = 0; i < theAnswers.length; i++) {
            Answers.insert({label: String.fromCharCode(65 + i), text: theAnswers[i] });
            // Similar to 4 lines like:
            // Answers.insert( {label:'A', text: theAnswers[0] } );
        }

        return q;
    };

    Template.answer.events({

        'click': function (a) {
            console.info(this);
            var correct = Session.get("correct_answer");
            var points = -5;
            var message = " was wrong."

            if (this.text === correct) {
                points = 10;
                message = " answered right."
            }

            Players.update(userId, {$inc: {score: points}});
            Template.leaderboard.writeLog(username, points, message);

            Session.set("selected_answer", this.text)

            return false;
        }
    });

    Template.questions.events({
        'click .nextQuestion': function (a) {
            Session.set("correct_answer", "x");
            Session.set("selected_answer", "y");
            Session.set("question", "");
            Session.set("selected_question", null);
            Template.questions.questions();
            return false;
        }
    });

    Template.questions.chosenAnswer = function () {
        //alert( "Answer what"+what );

        /*	var myRsvp = _.find(this.rsvps, function (r) {
         return r.user === Meteor.userId();
         }) || {};
         */
        return Session.get("selected_answer") == Session.get("correct_answer");
    };

    Template.questions.mix2 = function (a) {
        if (a) {
            console.log("mix q" + q);
            var temp = q[0];

            var randfn = function (left, right) {
                return Math.floor(Math.random() * 3) - 1;
            };

            q.sort(randfn);
            q.sort(randfn);
            //	q[0].answers.sort(randfn);
            //	q[0].answers.sort(randfn);

            console.log("correct:" + q.indexOf(temp));
        }
    };

    Template.player.selected = function () {
        return userId == this._id ? "warning" : "";
    };
    
    Template.logentry.isError = function() {
        return (this.score > 0) ? "success" : "error";
    };

    Template.questions.selected_question = function () {
        return Session.get("selected_question");
    };

    Template.questions.correct_answer = function () {
        return Session.get("correct_answer");
    };

    Template.question.questionselected = function () {
        return Session.get("selected_question");
    };

    Template.questions.selected_answer = function () {
        return Session.get("selected_answer");
    };

}
/**
 *  On server startup, create some players and questions if the database is empty.
 */
if (Meteor.isServer) {
    Meteor.startup(function () {

        // add some demo players
        if (Players.find().count() === 0) {
            var names = ["John Doe", "Ada Lovelace", "Claude Shannon" ];
            for (var i = 0; i < names.length; i++) {
                Players.insert({name: names[i], score: Math.floor(Math.random() * 10) * 5});
            }
        }

        if (Questions.find().count() === 0) {
            // File questions_json.js is auto parsed and loaded
            for (var i = 0; i < questionsJson.length; i++) {
                Questions.insert({id: questionsJson[i].id, question: questionsJson[i].question, answers: questionsJson[i].answers });
            }
        }
    });
}
