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
    //Session.setDefault("rootElement", null);
    var rootElement = null;



    Template.newMessage.events({
        "submit #newMessageForm": function (event) {
            var text = event.target[0].value;
            Meteor.call("newMessage", text);
            event.target[0].value = "";
            return false;
        }
    });

    Template.d3.rendered = function() {
        var d3width = 960,
            d3height = 500,
            d3nodes = [],
            d3links = [],
            defaultRadius = 60,
            newMessageFieldHeight = 100;

        var svg = d3.select("#d3").append("svg")
            .attr("width", $(window).width())
            .attr("height",( $(window).height() - $("#newMessage").height()) -100);


        var SVGnodes = svg.selectAll(".node"),
            SVGlinks = svg.selectAll(".link");


        var force = d3.layout.force()
            .nodes(d3nodes)
            .links(d3links)
            .gravity(0)
            .friction(0.9)
            .charge(-100)
            .distance(200)

            .size([d3width, d3height])
            .on("tick", function() {

                if(d3nodes.length > 0) {
                    d3nodes[0].x = Session.get("centerX");
                    d3nodes[0].y = Session.get("centerY");
                }

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

                force.stop();
                    d = new Date(fields.createdAt);
                console.log(d)
                    s = d.getSeconds();

                    var px, py;


                    if (s >= 0 && s < 15) {
                        px = Session.get("centerX") + 200;
                        py = Session.get("centerY") + 200;
                    }
                    if (s > 15 && s < 30) {px = Session.get("centerX") + 200; py = Session.get("centerY") - 200;}
                    if (s > 30 && s < 45) {px = Session.get("centerX") - 200; py = Session.get("centerY") - 200;}
                    if (s > 45 && s <= 60){px = Session.get("centerX") - 200; py = Session.get("centerY") + 200;}

                console.log(""+ px + ", " + py +"");

                var newNode = {x: px, y: py, radius: defaultRadius},
                    n = d3nodes.push(newNode),
                    l = d3links.push({source: newNode, target: 0});

                var SVGnode = svg.selectAll(".node")
                        .data(d3nodes)
                    .enter().append("g")
                        .attr("class", "node");

                SVGnode.append("circle")
                    .attr("r", defaultRadius)
                    .style({"stroke": "#3d3d3d", "stroke-width" : 2, "fill": "#ffffff"})
                    //.call(force.drag);

                SVGnode.append("text")
                    .attr("dx", "0")
                    .attr("dy", "0")
                    .text(fields.message);

                SVGnode.selectAll("text")
                    .call(wrap, 150);

                var data = Messages.find();
                console.log(data.count());

                if (data.count() == 1) {
                    rootElement =  d3.select('.node');
                    console.log(rootElement)

                }


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

    // word wrapping helper  (http://bl.ocks.org/mbostock/7555321)
    function wrap(text, width) {
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
                }
            }
        });
    }



}

if (Meteor.isServer) {



  Meteor.startup(function () {
    // code to run on server at startup


      var data = Messages.find();
      console.log(data.count());

      if (data.count() == 0) {
          Meteor.call("newMessage", '#flow');
      }


  });
}


