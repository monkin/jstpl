{
	escape: function($ctx, $args) {
		var map = { "\"": "&quot;", "<": "&lt;", ">": "&gt;" }
		return ($args["0"] || "").replace(/["><]/g, function(s) {
			return map[s]
		})
	}
}
