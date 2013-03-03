{
	stringify: function($ctx, $args) {
		return JSON.stringify($args['0'])
	},
	parse: function($ctx, $args) {
		if($args["0"] && $args["yield"])
			return $args["yield"]($ctx, {"0": JSON.parse($args["0"])})
		else if($args["0"])
			return JSON.parse($args["0"])
		else
			return "#utils.json.parse#"
	}
}
