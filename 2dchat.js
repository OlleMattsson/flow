if (Meteor.isClient) {
    Meteor.subscribe("messages");
    Session.setDefault("centerX", $(window).width() / 2);
    Session.setDefault("centerY", $(window).height() / 2);
    window.force = d3.layout.force();
    var force = window.force,
        d3nodes = [],
        d3links = [],
        svg,
        speed = 100, // link distance increment per second
        linkMaxLength = 1000,
        newLength,
        now,
        nodeAge,
        initialLinkStrength = 0.1,
        finalLinkStrength = 0.01,
        newLinkStrength;



    Template.d3.rendered = function() {
        svg = d3.select("#d3").append("svg")
            .attr("width", $(window).width())
            .attr("height",( $(window).height()));

        force = d3.layout.force()
            .nodes(d3nodes)
            .links(d3links)
            .gravity(0.05)
            .friction(0.9)
            .charge(-10)
            .linkStrength(finalLinkStrength)
            .distance(50)
            .size([$(window).width(), $(window).height()])
            .on("tick", tick)
            .start();


        Messages.find().observeChanges({
            added: function(id, fields) {
                force.stop();
                var d = new Date(fields.createdAt),
                    defaultRadius = 30,
                    radius = defaultRadius,
                    l = fields.message.length,
                    newNode;

                if ( l > 10) { radius = 30 + l / 1.5};
                if(d3nodes.length == 0) {
                    newNode = {x: Session.get("centerX"), y: Session.get("centerX"), radius: radius, nodeCreated: Date.now(), messageCreated: new Date(fields.messageCreated)};
                } else {
                    newNode = {x: d3nodes[0].x, y: d3nodes[0].y, radius: radius, nodeCreated: Date.now(), messageCreated: new Date(fields.messageCreated)};
                }

                //console.log("" + Session.get("centerX") + ", " + Session.get("centerY") + "");
//                console.log(newNode);
                d3nodes.push(newNode);
                d3links.push({source: newNode, target: 0});

                var SVGlink = svg.selectAll(".link")
                    .data(d3links)
                    .enter().append("line")
                    .attr("class", "link")
                    //.style({"stroke" : "#3d3d3d"});

                var SVGnode = svg.selectAll(".node")
                    .data(d3nodes)
                    .enter().append("g")
                    .attr("class", "node");

                SVGnode.append("circle")
                    .attr("r", radius)
                    .style({"stroke": "#a3a3a3", "stroke-width" : 2, "fill": "#ffffff"})

                SVGnode.append("text")
                    .attr("dx", "0")
                    .attr("dy", "0")
                    .attr("text-anchor", "middle")
                    .text(fields.message);

                SVGnode.selectAll("text")
                    .call(wrap, radius);

                force.start();
            }
        });
    };

    function tick() {
        force.stop();

        if(d3nodes.length > 0) {
            d3nodes[0].x = Session.get("centerX");
            d3nodes[0].y = Session.get("centerY");
        }


        force.distance(function(d){
            now = Date.now();
            nodeAge = (now - d.source.nodeCreated) / 1000;
            if (nodeAge < 30 && nodeAge > 1) {                                    // if message is less than this old
                newLength = (nodeAge) * speed; // it will move away with this speed
                if (newLength < linkMaxLength ) {return newLength;}
                else {return linkMaxLength;}                        // until it reaches this treshhold
            } else {
                newLength = (nodeAge) * speed * 0.7;
                return newLength;
            }
        })
        .charge(function(d) {
            now = Date.now();
            nodeAge = (now - d.nodeCreated) /1000;

        if (nodeAge > 1) {
                return -100;
            } else {
                return -10;
            }

        })
        .linkStrength(function(d){
             now = Date.now();
             nodeAge = (now - d.source.nodeCreated) /1000;
             newLinkStrength = initialLinkStrength * (1/nodeAge) * 0.4;

             if (newLinkStrength != Infinity) {
                 if (newLinkStrength > finalLinkStrength ) {
                     //console.log(""+nodeAge+","+newLinkStrength+"");
                     return newLinkStrength;
                 } else {
                     //console.log("minimum reached");
                     return finalLinkStrength;
                 }                        // until it reaches this treshhold
             }
         })
            .start();

        var q = d3.geom.quadtree(d3nodes),
            i = 0,
            n = d3nodes.length;

        while (++i < n ) {
            now = Date.now();
            nodeAge = (now - d3nodes[i].nodeCreated) / 1000;
            if(nodeAge > 3) {
                q.visit(collide(d3nodes[i]));
            }
        }
        svg.selectAll(".link").attr("x1", function(d) { return d.source.x; })
            .attr("y1", function(d) { return d.source.y; })
            .attr("x2", function(d) { return d.target.x; })
            .attr("y2", function(d) { return d.target.y; });

        svg.selectAll(".node").attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
    }

    Template.newMessage.events({
        "submit #newMessageForm": function (event) {
            var msg = event.target[0].value;

            Meteor.call("newMessage", msg, function(err, r) {
                if (err) {
                    console.log(err.reason); // handle error responses in UI
                }
            });

            event.target[0].value = "";
            return false;
        },

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

// 160 chars:
// You think water moves fast? You should see ice. It moves like it has a mind. Like it knows it killed the world once and got a taste for murder. After the avala