if (Meteor.isClient) {

    Meteor.subscribe("messages");

    Session.setDefault("centerX", $(window).width() / 2);
    Session.setDefault("centerY", $(window).height() / 2);

    window.force = d3.layout.force();

    var force = window.force,
        d3nodes = [],
        d3links = [],
        svg,
        now,
        age,
        textGroup,
        nodeGroup,
        linkGroup,

        // scaling nodes
        defaultNodeRadius = 30,
        nodeScalingMessageLengthThreshold = 10,
        nodeScalingFactor = 1.5,

        // d3.force
        gravity = 0.05,
        initialCharge = -10,
        charge = -100,
        chargeTimer = 1,
        distance = 50,              // initial distance from root to node
        initialLinkStrength = 0.1,  // Link strength for newly placed nodes need to be high to prevent bouncing and twitching
        finalLinkStrength = 0.01,   // As the node gets older it's link strength decreases
        speed = 100,                // Speed at which nodes move away from the root
        linkMaxLength = 1000,       // Threshhold distance for new nodes
        newLength,
        newLinkStrength;




    // Wait for the DOM to finish and start d3
    Template.d3.rendered = function() {
        textGroup = d3.select("#d3").append("div").attr("id", "textGroup");
        svg = d3.select("#d3").append("svg")
            .attr("width", $(window).width())
            .attr("height",( $(window).height()));
        linkGroup = svg.append("g").attr("id", "linkGroup"),
        nodeGroup = svg.append("g").attr("id", "nodeGroup"),

        // start d3
        force = d3.layout.force()
            .nodes(d3nodes)
            .links(d3links)
            .gravity(gravity)
            .charge(initialCharge)
            .linkStrength(finalLinkStrength)
            .distance(distance)
            .size([$(window).width(), $(window).height()])
            .on("tick", tick)
            .start();
    };




    // handle new messages
    Messages.find().observeChanges({
        added: function(id, fields) {
            var radius = defaultNodeRadius,
                l = fields.message.length,
                newNode;

            // calculate radius based on message length
            if ( l > nodeScalingMessageLengthThreshold) { radius = defaultNodeRadius + l / nodeScalingFactor};

            if(d3nodes.length == 0) {
                // place root node in the center of the screen
                newNode = {x: Session.get("centerX"), y: Session.get("centerX"), radius: radius, nodeCreated: Date.now(), messageCreated: new Date(fields.messageCreated), message: fields.message};
            } else {
                newNode = {x: d3nodes[0].x, y: d3nodes[0].y, radius: radius, nodeCreated: Date.now(), messageCreated: new Date(fields.messageCreated), message: fields.message};
            }

            d3nodes.push(newNode);
            d3links.push({source: newNode, target: 0});
            update()
        }
    });




    function update(){
        // links //
        var SVGlinks = linkGroup.selectAll(".link").data(d3links);

            SVGlinks.enter()
                .insert("line")
                .attr("class", "link")
                .style({"stroke" : "#3d3d3d"}); // uncomment for lines

            SVGlinks.exit().remove();



        // nodes //
        var SVGnodes = nodeGroup.selectAll(".node").data(force.nodes());

        // update
        var circleSelection = d3.selectAll("circle").data(force.nodes())
            circleSelection.attr("r", function (d, i){ return d.radius})

        // new
        var groupEnter = SVGnodes.enter()
                .append("g")
                .attr("class", "node")
            groupEnter.append("circle")
                .attr("r", function (d){return d.radius})
                .style({"stroke": "#a3a3a3", "stroke-width" : 2, "fill": "#ffffff"});
        // remove
        SVGnodes.exit().remove();


        // text //
        var textSelection = textGroup.selectAll(".msg").data(force.nodes());
        textSelection // update
            .html(function (d){return d.message})
            .style("width", function (d){return d.radius * 2 +"px"});
        textSelection.enter()
            .append("div")
            .attr("class", "msg")
            .style("width", function (d){return d.radius * 2 +"px"})
            .html(function (d){ return  d.message});
        textSelection.exit().remove();
    }




    function tick() {
        var q = d3.geom.quadtree(d3nodes),
            i = 0,
            l = d3nodes.length;

        force.stop();

        // root node zen
        if(d3nodes.length > 0) {
            d3nodes[0].x = Session.get("centerX");
            d3nodes[0].y = Session.get("centerY");
            d3nodes[0].nodeCreated = Date.now();
        }

        // apply collissions and remove old
        while (++i < l ) {
            if(d3nodes[i]) {
                age = nodeAge(d3nodes[i].nodeCreated);
                // apply collission
                if(age > 3) {
                    q.visit(collide(d3nodes[i]));
                }
                // remove old nodes
                if (age > 6000) {
                    d3nodes.splice(i, 1);
                    d3links.splice(i, 1);
                    update();
                }
            }
        }

        force
            .distance(function(d){
            now = Date.now();
            age = nodeAge(d.source.nodeCreated);
            if (age < 30 && age > 1) {                                    // if message is less than this old
                newLength = (age) * speed; // it will move away with this speed
                if (newLength < linkMaxLength ) {return newLength;}
                else {return linkMaxLength;}                        // until it reaches this treshhold
            } else {
                newLength = (age) * speed * 0.7;
                return newLength;
            }
            })
            .charge(function(d) {
                age = nodeAge(d.nodeCreated);

                if (age > chargeTimer) {
                    return charge;
                } else {
                    return initialCharge;
                }

            })
            .linkStrength(function(d){
                age = nodeAge( d.source.nodeCreated);
                newLinkStrength = initialLinkStrength * (1/age) * 0.4;
                if (newLinkStrength != Infinity) {
                    if (newLinkStrength > finalLinkStrength ) {
                        return newLinkStrength;
                    } else {
                        return finalLinkStrength;
                    }
                }
            })
            .start();

        svg.selectAll(".link").attr("x1", function(d) { return d.source.x; })
            .attr("y1", function(d) { return d.source.y; })
            .attr("x2", function(d) { return d.target.x; })
            .attr("y2", function(d) { return d.target.y; });

        svg.selectAll(".node")
            .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; })


        d3.selectAll(".msg")
            .style("left", function(d) { return d.x + "px"; })
            .style("top", function(d) { return d.y + "px"; });
    }




    function nodeAge(created){
        var now = Date.now();
        return ((now - created) / 1000);
    }




    Template.admin.events({
        "click #clearDbButton": function() {
            Meteor.call("clearDb");
        },

        "click #removeOldest": function() {
            d3nodes.splice(1, 1);
            d3links.splice(1, 1);
            update();
        },

        "click #logData": function() {
            console.log(d3nodes);
            console.log(d3links);
        },

        "click #update": function() {
            update();
        }
    });




    Template.newMessage.events({

        // Send message
        "submit #newMessageForm": function (event) {
            var msg = event.target[0].value;
            Meteor.call("newMessage", msg, function(err, r) {
                if (err) {
                    console.log(err.reason); // TODO: handle error responses in UI
                }
            });
            event.target[0].value = "";
            return false;
        },

        // Remaining characters
        "keyup #newMessageField": function() {
            var $newMessageField = $('#newMessageField'),
                msgLength = $newMessageField.val().length,
                maxchars = 140;
            $newMessageField.val($newMessageField.val().substring(0, maxchars)); //remove exceeding characters
            $("label[for='newMessageField'] span").html(maxchars - msgLength);
        }
    });




    Accounts.ui.config({
        passwordSignupFields: "USERNAME_ONLY"

    });




    Accounts.config({
        forbidClientAccountCreation: true
    });




    $(window).on("resize", function(){
        Session.set("centerX", $(window).width() / 2);
        Session.set("centerY", $(window).height() / 2);
        force.size([$(window).width(), $(window).height()])
    });



}





if (Meteor.isServer) {

    Accounts.config({
        forbidClientAccountCreation: true
    });

    Meteor.publish("messages", function () {
        return Messages.find();
    });

    Meteor.startup(function () {
        var msgCollection = Messages.find();

        if (msgCollection.count() == 0) {
          console.log("Collection empty, added root")
          Meteor.call("newMessage", '#flow');
        }

    });
}