if (Meteor.isClient) {
    Template.inactiveSettings.rendered = function() {
        $('#gravitySlider').slider({
            min: 0,
            max: 0.2,
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
            max: 1000,
            step: 50,
            value: 200,
            slide: function( event, ui ) {
                var newCharge = (- ui. value);
                force.stop().charge(newCharge).start()
                $("label[for='chargeSlider']").html(newCharge);

            }
        });
        $('#strengthSlider').slider({
            min: 0,
            max: 2,
            step: 0.1,
            value: 0.1,
            slide: function( event, ui ) {
                var newval = ui. value;
                force.stop().charge(newval).start()
                $("label[for='strengthSlider']").html(newval);

            }
        });
    };




}
