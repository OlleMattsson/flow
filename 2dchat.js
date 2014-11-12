Messages = new Mongo.Collection("messages");

Meteor.methods({
    newMessage: function (msg) {
        Messages.insert({
            message: msg,
            createdAt: new Date()
        });

        // publish message to subsribed clients

        console.log("newMessage: ", msg)

    },

    subsribe: function (channel) {

    },
    getMessages: function () {
        return Messages.find({}, {sort: {createdAt: -1}});
    }
});


if (Meteor.isClient) {


    Session.setDefault("centerX", $(window).width() / 2);
    Session.setDefault("centerY", $(window).height() / 2);


    Template.body.helpers({
        getMessages: function() {
            return Messages.find({}, {sort: {createdAt: -1}});
        }
    });


    Template.newMessage.events({
        "submit #newMessageForm": function (event) {
            var text = event.target[0].value;
            Meteor.call("newMessage", text);

            var d = {
                "name" : text
            };
/*
            svg.append("svg:circle")
                .attr("r", 1e-6)
                .transition()
                .ease(Math.sqrt)
                .attr("r", 4.5);


            svg.append("text")
                .attr("dx", 12)
                .attr("dy", ".35em")
                .text(text);

            nodes.push(d)
*/

            event.target[0].value = "";
            return false;
        }
    });

    Template.d3.rendered = function() {
        var d3width = 960,
            d3height = 500,
            d3nodes = [{}],
            d3links = [];

        var svg = d3.select("#d3").append("svg")
            .attr("width", d3width)
            .attr("height", d3height);


        var SVGnodes = svg.selectAll(".node"),
            SVGlinks = svg.selectAll(".link");

        var force = d3.layout.force()
            .nodes(d3nodes)
            .links(d3links)
            .gravity(.05)
            .distance(200)
            .charge(1)
            .size([d3width, d3height])
            .on("tick", function() {

                var q = d3.geom.quadtree(d3nodes),
                    i = 0,
                    n = d3nodes.length;

                while (++i < n) q.visit(collide(d3nodes[i]));

                svg.selectAll(".link").attr("x1", function(d) { return d.source.x; })
                                      .attr("y1", function(d) { return d.source.y; })
                                      .attr("x2", function(d) { return d.target.x; })
                                      .attr("y2", function(d) { return d.target.y; });

                svg.selectAll(".node").attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });

            })


        force.start();

        Messages.find().observeChanges({

            added: function(id, fields) {
                console.log(fields)

                force.stop();

                var newNode = {x: Session.get("centerX"), y: Session.get("centerY"), radius: 30},
                    n = d3nodes.push(newNode),
                    l = d3links.push({source: newNode, target: 0});

                var SVGnode = svg.selectAll(".node")
                        .data(d3nodes)

                    .enter().append("g")
                        .attr("class", "node");
/*
                SVGnode.append("image")
                    .attr("xlink:href", "https://github.com/favicon.ico")
                    .attr("x", -8)
                    .attr("y", -8)
                    .attr("width", 16)
                    .attr("height", 16);
*/
                SVGnode.append("circle")
                    .attr("r", 30)
                    .style({"stroke": "#3d3d3d", "stroke-width" : 2, "fill": "#ffffff"})
                    .call(force.drag)

                SVGnode.append("div")
                    .attr("dx", -30)
                    .attr("dy", "0")
                    .text(fields.message);

                force.start();
            }

        });

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

    }


}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
  });
}


