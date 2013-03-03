{
	e: function($ctx, $args) {
		return $args[0] == $args[1] ? "true" : ""
	},
	ne: function($ctx, $args) {
		return $args[0] != $args[1] ? "true" : ""
	},
	l: function($ctx, $args) {
		return $args[0] < $args[1] ? "true" : ""
	},
	g: function($ctx, $args) {
		return $args[0] > $args[1] ? "true" : ""
	},
	le: function($ctx, $args) {
		return $args[0] <= $args[1] ? "true" : ""
	},
	ge: function($ctx, $args) {
		return $args[0] >= $args[1] ? "true" : ""
	}
}
