function($ctx, $args) {
	if($args["yield"] && $args["0"] && $args["1"] && $args["0"] instanceof Array) {
		var g = [],
			res = ""
		for(var i = 0; i < $args["0"].length; i++) {
			if(g.length == $args["1"]) {
				res += $args["yield"]($ctx, {"0": g})
				g = []
			}
			g.push($args["0"][i])
		}
		if(g.length)
			res += $args["yield"]($ctx, {"0": g})
	}
	return res
}
