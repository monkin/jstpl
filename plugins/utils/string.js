{
	upcase: function($ctx, $args, $out) {
		$out.push(($args[0] || "").toUpperCase());
	},
	downcase: function($ctx, $args, $out) {
		$out.push(($args[0] || "").toLowerCase());
	}
}