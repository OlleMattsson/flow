if (Meteor.isServer) {

    Meteor.startup(function () {

        Meteor.methods({

            newMessage: function (msg) {
                if (msg.length > 0) {
                    if (msg.length <= 140) {
                        Messages.insert({
                            message: msg,
                            messageCreated: Date.now()
                        });
                    } else {
                        throw new Meteor.Error('charlimit-exceeded', "Message exceeded character limit (140).");
                    }
                } else {
                    throw new Meteor.Error("empty-message", "Empty message rejected.");
                }
                // publish message to subsribed clients
            },

            subsribe: function (channel) {
            },

            getMessages: function () {
                return Messages.find({}, {sort: {createdAt: -1}});
            },

            clearDb: function () {
                Messages.remove({});
            }
        });
    });
}