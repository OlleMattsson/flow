Messages = new Mongo.Collection("messages");

Meteor.methods({
    newMessage: function (msg) {
        // check length of message 160 chars
        Messages.insert({
            message: msg,
            createdAt: new Date()
        });
        // publish message to subsribed clients
    },

    subsribe: function (channel) {
    },
    getMessages: function () {
        return Messages.find({}, {sort: {createdAt: -1}});
    },
    clearDb: function() {
        Messages.remove({});
    }
});

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

    Template.newMessage.events({
        "submit #newMessageForm": function (event) {
            var text = event.target[0].value;
            Meteor.call("newMessage", text);
            event.target[0].value = "";
            return false;
        },
        "keyup #newMessageField": function() {
            var msgLength = $('#newMessageField').val().length,
                maxchars = 140;

            $('#newMessageField').val($('#newMessageField').val().substring(0, maxchars));

            /*var tlength = $(this).val().length;
            remain = maxchars - parseInt(tlength);
            $('#remain').text(remain);
*/
            $("label[for='newMessageField'] span").html(maxchars - msgLength);
        }
    });

    Template.d3.rendered = function() {
        svg = d3.select("#d3").append("svg")
            .attr("width", $(window).width())
            .attr("height",( $(window).height())),
            initialLinkStrength = 0.5;

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
                var d = new Date(fields.createdAt),
                    defaultRadius = 30,
                    radius = defaultRadius,
                    l = fields.message.length,
                    newNode;

                if ( l > 10) { radius = 30 + l / 1.5};

                if(d3nodes[0]) {
                    newNode = {x: d3nodes[0].x, y: d3nodes[0].y, radius: radius, timestamp: d.getTime()};
                } else {
                    newNode = {x: Session.get("centerX"), y: Session.get("centerY"), radius: radius, timestamp: d.getTime()};
                }

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
                    .style({"stroke": "#3d3d3d", "stroke-width" : 2, "fill": "#ffffff"})

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
            nodeAge = (now - d.source.timestamp) / 1000;

            if (nodeAge < 30) {                                    // if message is less than this old
                newLength = (nodeAge) * speed; // it will move away with this speed
                if (newLength < linkMaxLength ) {return newLength;}
                else {return linkMaxLength;}                        // until it reaches this treshhold
            } else {
                newLength = (nodeAge) * speed * 0.7;
                return newLength;
            }
        })
           /*
            .linkStrength(function(d){
                now = Date.now();
                nodeAge = (now - d.source.timestamp) /1000;
                newLinkStrength = initialLinkStrength * (1/nodeAge) * 0.4;

                if (newLinkStrength != Infinity) {
                    if (newLinkStrength > finalLinkStrength ) {
                        //console.log(""+nodeAge+","+newLinkStrength+"");
                        return newLinkStrength;
                    }
                    else {
                        //console.log("minimum reached");
                        return finalLinkStrength;
                    }                        // until it reaches this treshhold
                }
            })
            */
            .charge(function(d) {
                now = Date.now();
                nodeAge = (now - d.timestamp) /1000;
                if (nodeAge > 1) {
                    return -100;
                } else {
                    return -10;
                }

            })
            .start();

        var q = d3.geom.quadtree(d3nodes),
            i = 0,
            n = d3nodes.length;

        while (++i < n ) {
            now = Date.now();
            nodeAge = (now - d3nodes[i].timestamp) /1000;
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

    // collision detection helper (http://bl.ocks.org/mbostock/3231298)
    function collide(node) {
        var r = node.radius + 16,
            nx1 = node.x - r,
            nx2 = node.x + r,
            ny1 = node.y - r,
            ny2 = node.y + r;
        return function(quad, x1, y1, x2, y2) {
            if (quad.point && (quad.point !== node)) {
                var x = node.x - quad.point.x,
                    y = node.y - quad.point.y,
                    l = Math.sqrt(x * x + y * y),
                    r = node.radius + quad.point.radius;
                if (l < r) {
                    l = (l - r) / l * .5;
                    node.x -= x *= l;
                    node.y -= y *= l;
                    quad.point.x += x;
                    quad.point.y += y;
                }
            }
            return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
        };
    }

    // word wrapping helper  (http://bl.ocks.org/mbostock/7555321)
    function wrap(text, width, cb) {
        text.each(function() {
            var text = d3.select(this),
                words = text.text().split(/\s+/).reverse(),
                word,
                line = [],
                lineNumber = 0,
                lineHeight = 1.1, // ems
                y = text.attr("y"),
                dy = parseFloat(text.attr("dy")),
                tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy + "em");
            while (word = words.pop()) {
                line.push(word);
                tspan.text(line.join(" "));
                if (tspan.node().getComputedTextLength() > width) {
                    line.pop();
                    tspan.text(line.join(" "));
                    line = [word];
                    //tspan = text.append("tspan").attr("x", 0).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
                    tspan = text.append("tspan").attr("x", 0).attr("y", y).attr("dy", lineHeight + "em").text(word);
                    ++lineNumber;
                }
            }
            text.attr("y", -lineNumber / 2 +"em");
        });

    }

    // returns integer between -99 and 99
    function getCustomRand(){
        var random = Math.floor(Math.random()*99) - 45;
        if(random==0) return getCustomRand();
        return random;
    }
}

if (Meteor.isServer) {
    Meteor.publish("messages", function () {
        return Messages.find();
    });
  Meteor.startup(function () {
      var msgCollection = Messages.find();
      if (msgCollection.count() == 0) {
          Meteor.call("newMessage", '#flow');
      }
  });
}

// 160 chars:
// You think water moves fast? You should see ice. It moves like it has a mind. Like it knows it killed the world once and got a taste for murder. After the avala