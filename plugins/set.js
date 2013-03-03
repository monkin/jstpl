function($ctx, $args) {
	if($args["0"] && $args["1"]!==undefined && $args["yield"]) {
		$args["0"][$args["1"]] = $args["yield"]($ctx, {})
		return ""
	} else if($args["0"] && $args["yield"]) { 
		$ctx[$args["0"]] = $args["yield"]($ctx, {})
	} else if($args["0"] && $args["1"] && $args["2"]!==undefined)
		$args["0"][$args["1"]] = $args["2"]
	else if($args["0"] && $args["1"]!=undefined)
		$ctx[$args["0"]] = $args["1"]
	return ""
}
