function($ctx, $args) {
	if($args[0])
		return $args[0]($ctx, $args["1"] || {})
	else
		return "#apply#"
}
