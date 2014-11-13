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
    Session.setDefault("centerX", $(window).width() / 2);
    Session.setDefault("centerY", $(window).height() / 2);
    //Session.setDefault("rootElement", null);
    var rootElement = null;
    var force = d3.layout.force();

    Template.newMessage.events({
        "submit #newMessageForm": function (event) {
            var text = event.target[0].value;
            Meteor.call("newMessage", text);
            event.target[0].value = "";
            return false;
        },
        "keyup #newMessageField": function(event) {
            $("label[for='newMessageField'] span").html(160- $('#newMessageField').val().length) //
        }
    });

    Template.d3.rendered = function() {
        var d3width = 960,
            d3height = 500,
            d3nodes = [],
            d3links = [],
            newMessageFieldHeight = 100;

        var svg = d3.select("#d3").append("svg")
            .attr("width", $(window).width())
            .attr("height",( $(window).height()));

        var SVGnodes = svg.selectAll(".node"),
            SVGlinks = svg.selectAll(".link");

        force = d3.layout.force()
            .nodes(d3nodes)
            .links(d3links)
            .gravity(0.05)
            .friction(0.9)
            .charge(-1000)
            .linkStrength(0.01)
            .distance(function(d){
                //var now = Math.floor(Date.now() / 1000),
                //diff = now - d.source.timestamp;


                //return diff * 1;
                return 90;
            })

            .size([$(window).width(), $(window).height()])
            .on("tick", function() {

                if(d3nodes.length > 0) {
                    d3nodes[0].x = Session.get("centerX");
                    d3nodes[0].y = Session.get("centerY");
                }


                force.stop().distance(function(d){

                    var speed = 100; // increment per second
                    var maxLength = 3000;
                    var now = Math.floor(Date.now() / 1000),
                        diff = now - d.source.timestamp;

                    if (diff < 60) {
                        newLength = (now - d.source.timestamp) * speed;
                        if (newLength < maxLength ) {return newLength;}
                        else {return maxLength;}
                    } else {
                        newLength = (now - d.source.timestamp) * speed/2;
                    }



                }).start()


                // attract towards quadrants
                var q = d3.geom.quadtree(d3nodes),
                    i = 0,
                    n = d3nodes.length;

                while (++i < n) q.visit(collide(d3nodes[i]));

                svg.selectAll(".link").attr("x1", function(d) { return d.source.x; })
                                      .attr("y1", function(d) { return d.source.y; })
                                      .attr("x2", function(d) { return d.target.x; })
                                      .attr("y2", function(d) { return d.target.y; });

                svg.selectAll(".node").attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
            });


        force.start();

        Messages.find().observeChanges({

            added: function(id, fields) {

                force.stop();
                d = new Date(fields.createdAt);
                s = d.getSeconds();

                var px, py;

                if (s >= 0 && s < 15) {px = Session.get("centerX") + 50; py = Session.get("centerY") - 50;}
                if (s > 15 && s < 30) {px = Session.get("centerX") + 50; py = Session.get("centerY") + 50;}
                if (s > 30 && s < 45) {px = Session.get("centerX") - 50; py = Session.get("centerY") + 50;}
                if (s > 45 && s <= 60){px = Session.get("centerX") - 50; py = Session.get("centerY") - 50;}


                // determine radius
                var defaultRadius = 30;

                var radius = defaultRadius,
                    l = fields.message.length;

                if ( l > 10) { radius = 30 + l / 1.5};

                var newNode = {x: px, y: py, radius: radius, timestamp: Math.floor(d.getTime() / 1000)},
                    n = d3nodes.push(newNode);
                    l = d3links.push({source: newNode, target: 0});

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
                    .call(force.drag);

                SVGnode.append("text")
                    .attr("dx", "0")
                    .attr("dy", "0")
                    //.attr("y", "50%")
                    .attr("text-anchor", "middle")
                    .text(fields.message);

                SVGnode.selectAll("text")
                    .call(wrap, radius);

                force.start();
            }
        });


    }

    Template.settings.rendered = function() {
         $('#gravitySlider').slider({
            min: 0,
            max: 1,
            step: 0.001,
            value: 0.05,
            slide: function( event, ui ) {
                var newGravity = ui. value;
                force.stop().charge(newGravity).start()
                $("label[for='gravitySlider']").html(newGravity);

            }
        });
        $('#chargeSlider').slider({
            min: 0,
            max: 2000,
            step: 100,
            value: 1000,
            slide: function( event, ui ) {
                var newCharge = (- ui. value);
                force.stop().charge(newCharge).start()
                $("label[for='chargeSlider']").html(newCharge);

            }
        });
    }

    Template.settings.events({
        "click #clearDbButton": function(event) {

            Meteor.call("clearDb");
        }
    })

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
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup

      var msgCollection = Messages.find();
      if (msgCollection.count() == 0) {
          Meteor.call("newMessage", '#flow');
      }
  });
}

// 160 chars:
// You think water moves fast? You should see ice. It moves like it has a mind. Like it knows it killed the world once and got a taste for murder. After the avala