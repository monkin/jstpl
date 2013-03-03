function($ctx, $args) {
	if($args["0"] && $args["yield"])
		return $args["yield"]($ctx, {})
	else
		return ""
}
