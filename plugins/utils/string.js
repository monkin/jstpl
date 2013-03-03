{
	upcase: function($ctx, $args) {
		return ($args["0"] || "").toUpperCase();
	},
	downcase: function($ctx, $args) {
		return ($args["0"] || "").toLowerCase();
	}
}
