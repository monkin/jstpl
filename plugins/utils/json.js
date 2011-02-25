{
	stringify: function($ctx, $args, $out) {
		if($args[0])
			$out.push(JSON.stringify($args[0]))
	},
	parse: function($ctx, $args, $out) {
		if($args[0] && $args.yield)
			$args.yield($ctx, [JSON.parse($args[0])], $out)
	}
}
