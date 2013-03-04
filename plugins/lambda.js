function($ctx, $args) {
	if($args["yield"]) {
		var res_fn = function(ctx, args) { return $args["yield"](ctx, args) }
		if($args["1"])
			$args["0"][$args["1"]] = res_fn;
		else if($args["0"])
			$ctx[$args["0"]] = res_fn
		else
			return res_fn
		return ""
	} else {
		return "#lambda#"
	}
}
